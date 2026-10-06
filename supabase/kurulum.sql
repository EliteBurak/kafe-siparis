-- =====================================================================
--  RESTORAN SİPARİŞ – Veritabanı kurulumu (sürüm 2: çok restoranlı)
--  Supabase > SQL Editor > New query > bu dosyanın tamamını yapıştır > Run
--
--  !!! DİKKAT: Sürüm 1'den geçerken eski TEST verileri (menü, masalar, siparişler)
--  silinir. Bu dosyayı sonradan tekrar çalıştırmak ise güvenlidir, veri silmez.
-- =====================================================================

-- ---------- 0. SÜRÜM 1 TEMİZLİĞİ (sadece eski yapı varsa çalışır) ----------
do $$ begin
  if to_regclass('public.cafe_tables') is not null then
    drop policy if exists "personel foto yukler"    on storage.objects;
    drop policy if exists "personel foto gunceller" on storage.objects;
    drop policy if exists "personel foto siler"     on storage.objects;
    drop table if exists public.order_items, public.orders, public.cafe_tables,
      public.products, public.categories, public.settings, public.staff cascade;
    drop function if exists public.place_order(text, jsonb, text);
    drop function if exists public.get_order_status(uuid);
    drop function if exists public.get_table(text);
    drop function if exists public.is_staff();
    -- Eski fotoğraflar Storage'da kalır (Supabase SQL ile silmeye izin vermiyor);
    -- istersen Storage > urun-fotograflari ekranından elle silebilirsin.
  end if;
end $$;

-- ---------- 1. TABLOLAR ----------

create table if not exists public.restaurants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(name) between 2 and 80),
  slug          text not null unique,
  plan          text not null default 'free' check (plan in ('free', 'pro')),
  order_counter bigint not null default 0,
  owner_id      uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);

-- Restoran personeli: sahip, kasiyer, garson
create table if not exists public.members (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null check (role in ('sahip', 'kasiyer', 'garson')),
  display_name  text not null default '',
  created_at    timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

-- Personel davetleri: sahip e-posta + rol girer, sistem bir davet kodu üretir
create table if not exists public.invitations (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  email         text not null check (email = lower(email)),
  role          text not null check (role in ('kasiyer', 'garson')),
  display_name  text not null default '',
  code          text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_at    timestamptz not null default now(),
  unique (restaurant_id, email)
);

create table if not exists public.categories (
  id            bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  sort_order    int  not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.products (
  id            bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id   bigint not null references public.categories(id) on delete cascade,
  name          text not null,
  description   text not null default '',
  price         numeric(10,2) not null check (price >= 0),
  image_url     text not null default '',
  active        boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.dining_tables (
  id            bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  sort_order    int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  order_no        bigint not null,
  table_id        bigint references public.dining_tables(id) on delete set null,
  table_name      text not null default '',
  status          text not null default 'yeni'
                  check (status in ('yeni','hazirlaniyor','hazir','teslim','iptal')),
  note            text not null default '',
  total           numeric(10,2) not null default 0,
  paid            boolean not null default false,
  created_by      uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  closed_by       uuid references auth.users(id) on delete set null,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.order_items (
  id            bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    bigint references public.products(id) on delete set null,
  product_name  text not null,
  unit_price    numeric(10,2) not null,
  quantity      int not null check (quantity between 1 and 50),
  note          text not null default ''
);

create index if not exists members_user_idx       on public.members(user_id);
create index if not exists categories_rest_idx    on public.categories(restaurant_id);
create index if not exists products_rest_idx      on public.products(restaurant_id);
create index if not exists tables_rest_idx        on public.dining_tables(restaurant_id);
create index if not exists orders_rest_open_idx   on public.orders(restaurant_id, created_at desc) where paid = false;
create index if not exists orders_rest_time_idx   on public.orders(restaurant_id, created_at desc);
create index if not exists items_order_idx        on public.order_items(order_id);

-- ---------- 2. YETKİ YARDIMCILARI ----------
-- Giriş yapan kullanıcının bu restorandaki rolü (üye değilse null)
-- Ücretsiz sürümde sadece sahip girebilir: Pro bitince personelin erişimi kapanır (veriler silinmez)
create or replace function public.rolum(r uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.role from public.members m join public.restaurants x on x.id = m.restaurant_id
   where m.restaurant_id = r and m.user_id = auth.uid() and (m.role = 'sahip' or x.plan = 'pro');
$$;

-- Personelin, restoran ücretsiz sürüme geçtiği için erişemediği restoranlar (ekranda bilgi vermek için)
create or replace function public.askidaki_restoranlarim()
returns table (name text) language sql stable security definer set search_path = public as $$
  select x.name from public.members m join public.restaurants x on x.id = m.restaurant_id
   where m.user_id = auth.uid() and m.role <> 'sahip' and x.plan <> 'pro';
$$;
create or replace function public.uye_mi(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.rolum(r) is not null;
$$;
create or replace function public.sahip_mi(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.rolum(r) = 'sahip', false);
$$;
create or replace function public.kasa_mi(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.rolum(r) in ('sahip', 'kasiyer'), false);
$$;

-- ---------- 3. SÜRÜM LİMİTLERİ (ücretsiz plan) ----------
create or replace function public.plan_limiti() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_plan text; v_sayi int;
begin
  select plan into v_plan from public.restaurants where id = new.restaurant_id;
  if v_plan = 'pro' then return new; end if;

  if tg_table_name = 'dining_tables' then
    select count(*) into v_sayi from public.dining_tables where restaurant_id = new.restaurant_id;
    if v_sayi >= 10 then raise exception 'Ücretsiz sürümde en fazla 10 masa eklenebilir. Pro sürüme geçerek sınırı kaldırabilirsin.'; end if;
  elsif tg_table_name = 'products' then
    select count(*) into v_sayi from public.products where restaurant_id = new.restaurant_id;
    if v_sayi >= 40 then raise exception 'Ücretsiz sürümde en fazla 40 ürün eklenebilir. Pro sürüme geçerek sınırı kaldırabilirsin.'; end if;
  elsif tg_table_name = 'invitations' then
    raise exception 'Personel hesapları Pro sürümde. Ücretsiz sürümde sadece restoran sahibi giriş yapabilir.';
  end if;
  return new;
end $$;

drop trigger if exists limit_masa on public.dining_tables;
drop trigger if exists limit_urun on public.products;
drop trigger if exists limit_davet on public.invitations;
create trigger limit_masa  before insert on public.dining_tables for each row execute function public.plan_limiti();
create trigger limit_urun  before insert on public.products      for each row execute function public.plan_limiti();
create trigger limit_davet before insert on public.invitations   for each row execute function public.plan_limiti();

-- ---------- 4. SİPARİŞ GÜNCELLEME KURALLARI ----------
create or replace function public.siparis_guncelleme() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  -- Hesap kapatma (ödendi) sadece sahip ve kasiyer
  if new.paid is distinct from old.paid then
    if not public.kasa_mi(old.restaurant_id) then
      raise exception 'Hesap kapatma yetkisi sadece kasiyer ve restoran sahibinde.';
    end if;
    new.closed_by := case when new.paid then auth.uid() end;
    new.closed_at := case when new.paid then now() end;
  end if;
  -- Masa değişirse ad da güncellensin ve aynı restorana ait olsun
  if new.table_id is distinct from old.table_id then
    select name into new.table_name from public.dining_tables
     where id = new.table_id and restaurant_id = old.restaurant_id;
    if not found then raise exception 'Masa bulunamadı'; end if;
  end if;
  return new;
end $$;

drop trigger if exists orders_guncelleme on public.orders;
create trigger orders_guncelleme before update on public.orders
  for each row execute function public.siparis_guncelleme();

-- ---------- 5. GÜVENLİK KURALLARI (RLS) ----------
alter table public.restaurants   enable row level security;
alter table public.members       enable row level security;
alter table public.invitations   enable row level security;
alter table public.categories    enable row level security;
alter table public.products      enable row level security;
alter table public.dining_tables enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;

-- Doğrudan yazma izinlerini daralt: kritik işlemler sadece fonksiyonlarla yapılır
revoke all on public.restaurants, public.members, public.invitations, public.categories,
  public.products, public.dining_tables, public.orders, public.order_items from anon;
revoke insert, update, delete on public.restaurants, public.order_items from authenticated;
revoke insert, update on public.members, public.orders from authenticated;
grant update (name) on public.restaurants to authenticated;                        -- plan değiştirilemez
grant update (role, display_name) on public.members to authenticated;
grant update (status, paid, table_id) on public.orders to authenticated;           -- tutar değiştirilemez

do $$ declare t text; p record; begin
  foreach t in array array['restaurants','members','invitations','categories','products','dining_tables','orders','order_items'] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

create policy "uye restoranini gorur"    on public.restaurants for select to authenticated using ((select public.uye_mi(id)));
create policy "sahip restorani duzenler" on public.restaurants for update to authenticated using ((select public.sahip_mi(id)));

create policy "uye personeli gorur"     on public.members for select to authenticated using ((select public.uye_mi(restaurant_id)));
create policy "sahip personel duzenler" on public.members for update to authenticated
  using ((select public.sahip_mi(restaurant_id)) and role <> 'sahip')
  with check (role in ('kasiyer', 'garson'));
create policy "sahip personel cikarir"  on public.members for delete to authenticated
  using ((select public.sahip_mi(restaurant_id)) and role <> 'sahip');

create policy "sahip davet yonetir" on public.invitations for all to authenticated
  using ((select public.sahip_mi(restaurant_id))) with check ((select public.sahip_mi(restaurant_id)));

-- Menü ve masalar: tüm personel görür, sadece sahip düzenler
create policy "uye kategori gorur"      on public.categories for select to authenticated using ((select public.uye_mi(restaurant_id)));
create policy "sahip kategori ekler"    on public.categories for insert to authenticated with check ((select public.sahip_mi(restaurant_id)));
create policy "sahip kategori duzenler" on public.categories for update to authenticated
  using ((select public.sahip_mi(restaurant_id))) with check ((select public.sahip_mi(restaurant_id)));
create policy "sahip kategori siler"    on public.categories for delete to authenticated using ((select public.sahip_mi(restaurant_id)));

create policy "uye urun gorur"      on public.products for select to authenticated using ((select public.uye_mi(restaurant_id)));
create policy "sahip urun ekler"    on public.products for insert to authenticated
  with check ((select public.sahip_mi(restaurant_id))
              and exists (select 1 from public.categories c where c.id = category_id and c.restaurant_id = products.restaurant_id));
create policy "sahip urun duzenler" on public.products for update to authenticated
  using ((select public.sahip_mi(restaurant_id)))
  with check ((select public.sahip_mi(restaurant_id))
              and exists (select 1 from public.categories c where c.id = category_id and c.restaurant_id = products.restaurant_id));
create policy "sahip urun siler"    on public.products for delete to authenticated using ((select public.sahip_mi(restaurant_id)));

create policy "uye masa gorur"      on public.dining_tables for select to authenticated using ((select public.uye_mi(restaurant_id)));
create policy "sahip masa ekler"    on public.dining_tables for insert to authenticated with check ((select public.sahip_mi(restaurant_id)));
create policy "sahip masa duzenler" on public.dining_tables for update to authenticated
  using ((select public.sahip_mi(restaurant_id))) with check ((select public.sahip_mi(restaurant_id)));
create policy "sahip masa siler"    on public.dining_tables for delete to authenticated using ((select public.sahip_mi(restaurant_id)));

-- Siparişler: tüm personel görür ve durum günceller; oluşturma fonksiyonla
create policy "uye siparis gorur"     on public.orders for select to authenticated using ((select public.uye_mi(restaurant_id)));
create policy "uye siparis gunceller" on public.orders for update to authenticated
  using ((select public.uye_mi(restaurant_id))) with check ((select public.uye_mi(restaurant_id)));
create policy "uye kalem gorur"       on public.order_items for select to authenticated using ((select public.uye_mi(restaurant_id)));

-- ---------- 6. FONKSİYONLAR ----------

-- Türkçe karakterleri sadeleştirip adres dostu kısa ad üretir: "Çınar Köşk" -> "cinar-kosk"
create or replace function public.slug_yap(t text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(
    translate(lower(t), 'çğıöşüâîû', 'cgiosuaiu'), '[^a-z0-9]+', '-', 'g'));
$$;

-- Yeni restoran oluştur (kayıt olan kişi sahibi olur)
create or replace function public.restoran_olustur(p_ad text, p_adim text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_slug text;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın'; end if;
  if length(trim(coalesce(p_ad, ''))) < 2 then raise exception 'Restoran adı en az 2 harf olmalı'; end if;
  if (select count(*) from public.restaurants where owner_id = auth.uid()) >= 3 then
    raise exception 'Bir hesapla en fazla 3 restoran açılabilir.';
  end if;
  v_slug := coalesce(nullif(left(public.slug_yap(p_ad), 40), ''), 'restoran');
  if exists (select 1 from public.restaurants where slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(gen_random_uuid()::text), 1, 4);
  end if;
  insert into public.restaurants (name, slug, owner_id) values (trim(p_ad), v_slug, auth.uid()) returning id into v_id;
  insert into public.members (restaurant_id, user_id, role, display_name)
  values (v_id, auth.uid(), 'sahip', coalesce(nullif(trim(p_adim), ''), split_part(auth.jwt()->>'email', '@', 1)));
  return v_id;
end $$;

-- Davet koduyla restorana katıl (kod + e-posta eşleşmeli)
create or replace function public.davet_kabul(p_kod text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_davet public.invitations%rowtype;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın'; end if;
  select * into v_davet from public.invitations
   where code = upper(trim(p_kod)) and email = lower(auth.jwt()->>'email');
  if not found then raise exception 'Davet kodu geçersiz ya da bu e-posta adresine ait değil.'; end if;
  insert into public.members (restaurant_id, user_id, role, display_name)
  values (v_davet.restaurant_id, auth.uid(), v_davet.role,
          coalesce(nullif(v_davet.display_name, ''), split_part(auth.jwt()->>'email', '@', 1)))
  on conflict (restaurant_id, user_id) do nothing;
  delete from public.invitations where id = v_davet.id;
  return v_davet.restaurant_id;
end $$;

-- Sipariş oluştur (personel). Fiyatlar her zaman veritabanından alınır.
create or replace function public.siparis_olustur(p_masa bigint, p_kalemler jsonb, p_not text default '')
returns table (order_id uuid, order_no bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_masa  public.dining_tables%rowtype;
  v_oid   uuid;
  v_no    bigint;
  v_item  jsonb;
  v_prod  public.products%rowtype;
  v_qty   int;
  v_total numeric(10,2) := 0;
  v_ad    text;
begin
  select * into v_masa from public.dining_tables where id = p_masa and active;
  if not found or not public.uye_mi(v_masa.restaurant_id) then raise exception 'Masa bulunamadı'; end if;
  if p_kalemler is null or jsonb_typeof(p_kalemler) <> 'array'
     or jsonb_array_length(p_kalemler) = 0 or jsonb_array_length(p_kalemler) > 50 then
    raise exception 'Sipariş boş ya da geçersiz';
  end if;

  update public.restaurants set order_counter = order_counter + 1
   where id = v_masa.restaurant_id returning order_counter into v_no;
  select display_name into v_ad from public.members where restaurant_id = v_masa.restaurant_id and user_id = auth.uid();

  insert into public.orders (restaurant_id, order_no, table_id, table_name, note, created_by, created_by_name)
  values (v_masa.restaurant_id, v_no, v_masa.id, v_masa.name, left(coalesce(p_not, ''), 300), auth.uid(), coalesce(v_ad, ''))
  returning id into v_oid;

  for v_item in select * from jsonb_array_elements(p_kalemler) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then raise exception 'Adet geçersiz'; end if;
    select p.* into v_prod from public.products p
      join public.categories c on c.id = p.category_id
     where p.id = (v_item->>'product_id')::bigint and p.restaurant_id = v_masa.restaurant_id and p.active and c.active;
    if not found then raise exception 'Ürün bulunamadı veya satışta değil'; end if;
    insert into public.order_items (restaurant_id, order_id, product_id, product_name, unit_price, quantity, note)
    values (v_masa.restaurant_id, v_oid, v_prod.id, v_prod.name, v_prod.price, v_qty, left(coalesce(v_item->>'note', ''), 200));
    v_total := v_total + v_prod.price * v_qty;
  end loop;

  update public.orders set total = v_total where id = v_oid;
  return query select v_oid, v_no;
end $$;

-- Müşteri QR menüsü (giriş gerekmez): sadece satıştaki ürünler
create or replace function public.menu_getir(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'restoran', jsonb_build_object('name', r.name, 'plan', r.plan),
    'kategoriler', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.sort_order, c.id)
        from public.categories c where c.restaurant_id = r.id and c.active), '[]'::jsonb),
    'urunler', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'category_id', p.category_id, 'name', p.name,
               'description', p.description, 'price', p.price, 'image_url', p.image_url) order by p.sort_order, p.id)
        from public.products p join public.categories c on c.id = p.category_id
       where p.restaurant_id = r.id and p.active and c.active), '[]'::jsonb))
  from public.restaurants r where r.slug = p_slug;
$$;

-- ---------- 7. ÜRÜN FOTOĞRAFLARI (Storage) ----------
-- Dosya yolu: <restoran_id>/<dosya>.webp  — sadece o restoranın sahibi yükler/siler
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('urun-fotograflari', 'urun-fotograflari', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.foto_sahibi_mi(p_ad text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return public.sahip_mi(split_part(p_ad, '/', 1)::uuid);
exception when others then
  return false;
end $$;

drop policy if exists "personel foto yukler"    on storage.objects;
drop policy if exists "personel foto gunceller" on storage.objects;
drop policy if exists "personel foto siler"     on storage.objects;
drop policy if exists "sahip foto yukler"       on storage.objects;
drop policy if exists "sahip foto gunceller"    on storage.objects;
drop policy if exists "sahip foto siler"        on storage.objects;
create policy "sahip foto yukler" on storage.objects for insert to authenticated
  with check (bucket_id = 'urun-fotograflari' and public.foto_sahibi_mi(name));
create policy "sahip foto gunceller" on storage.objects for update to authenticated
  using (bucket_id = 'urun-fotograflari' and public.foto_sahibi_mi(name));
create policy "sahip foto siler" on storage.objects for delete to authenticated
  using (bucket_id = 'urun-fotograflari' and public.foto_sahibi_mi(name));

-- ---------- 8. FONKSİYON İZİNLERİ ----------
revoke all on function public.askidaki_restoranlarim() from public;
revoke all on function public.rolum(uuid), public.uye_mi(uuid), public.sahip_mi(uuid), public.kasa_mi(uuid),
  public.restoran_olustur(text, text), public.davet_kabul(text),
  public.siparis_olustur(bigint, jsonb, text), public.menu_getir(text), public.foto_sahibi_mi(text),
  public.plan_limiti(), public.siparis_guncelleme(), public.slug_yap(text) from public;
grant execute on function public.rolum(uuid), public.uye_mi(uuid), public.sahip_mi(uuid), public.kasa_mi(uuid),
  public.restoran_olustur(text, text), public.davet_kabul(text),
  public.siparis_olustur(bigint, jsonb, text), public.foto_sahibi_mi(text),
  public.askidaki_restoranlarim() to authenticated;
grant execute on function public.menu_getir(text) to anon, authenticated;

-- ---------- 9. CANLI BİLDİRİM (Realtime) ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
