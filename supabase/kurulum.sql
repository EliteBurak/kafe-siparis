-- =====================================================================
--  KAFE SİPARİŞ – Veritabanı kurulumu
--  Supabase > SQL Editor > New query > bu dosyanın tamamını yapıştır > Run
--  Birden fazla kez çalıştırılabilir (mevcut verileri silmez).
-- =====================================================================

-- ---------- TABLOLAR ----------

create table if not exists public.settings (
  id          int primary key default 1 check (id = 1),
  cafe_name   text not null default 'Kafem',
  menu_url    text not null default '',
  currency    text not null default '₺'
);

create table if not exists public.categories (
  id          bigint generated always as identity primary key,
  name        text not null,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id          bigint generated always as identity primary key,
  category_id bigint not null references public.categories(id) on delete cascade,
  name        text not null,
  description text not null default '',
  price       numeric(10,2) not null check (price >= 0),
  image_url   text not null default '',
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.cafe_tables (
  id          bigint generated always as identity primary key,
  name        text not null,
  code        text not null unique default substr(md5(random()::text), 1, 8),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  order_no    bigint generated always as identity,
  table_id    bigint references public.cafe_tables(id) on delete set null,
  table_name  text not null default '',
  source      text not null default 'qr' check (source in ('qr','garson')),
  status      text not null default 'yeni'
              check (status in ('yeni','hazirlaniyor','hazir','teslim','iptal')),
  note        text not null default '',
  total       numeric(10,2) not null default 0,
  paid        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.order_items (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   bigint references public.products(id) on delete set null,
  product_name text not null,
  unit_price   numeric(10,2) not null,
  quantity     int not null check (quantity between 1 and 50),
  note         text not null default ''
);

create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_table_idx   on public.orders(table_id) where paid = false;
create index if not exists items_order_idx    on public.order_items(order_id);

-- updated_at otomatik güncellensin
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------- GÜVENLİK (RLS) ----------
-- anon  = QR menüyü açan müşteri (giriş yapmamış)
-- staff = public.staff listesindeki kullanıcılar (kafe personeli)
-- Not: Sadece "giriş yapmış olmak" yetmez. Biri bir şekilde hesap açsa bile
--      staff listesinde değilse hiçbir yönetim verisine erişemez.

create table if not exists public.staff (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;  -- politika yok = API'den kimse okuyamaz/yazamaz

-- İlk kurulumda: o an var olan kullanıcılar personel olur
do $$ begin
  if not exists (select 1 from public.staff) then
    insert into public.staff (user_id) select id from auth.users;
  end if;
end $$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated;

alter table public.settings    enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.cafe_tables enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- (select ...) kalıbı fonksiyonun sorgu başına bir kez çalışmasını sağlar (Supabase önerisi)
drop policy if exists "herkes ayarlari okur"   on public.settings;
drop policy if exists "personel ayar yazar"    on public.settings;
create policy "herkes ayarlari okur" on public.settings for select to anon, authenticated using (true);
create policy "personel ayar yazar"  on public.settings for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "musteri aktif kategori" on public.categories;
drop policy if exists "personel kategori"      on public.categories;
create policy "musteri aktif kategori" on public.categories for select to anon using (active);
create policy "personel kategori"      on public.categories for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "musteri aktif urun" on public.products;
drop policy if exists "personel urun"      on public.products;
create policy "musteri aktif urun" on public.products for select to anon using (active);
create policy "personel urun"      on public.products for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Masalar, siparişler: müşteri doğrudan erişemez, sadece aşağıdaki fonksiyonlarla.
drop policy if exists "personel masa"    on public.cafe_tables;
drop policy if exists "personel siparis" on public.orders;
drop policy if exists "personel kalem"   on public.order_items;
create policy "personel masa"    on public.cafe_tables for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "personel siparis" on public.orders      for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "personel kalem"   on public.order_items for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create index if not exists orders_table_time_idx on public.orders(table_id, created_at desc);

-- ---------- FONKSİYONLAR ----------

-- QR koddan masa adını öğren
create or replace function public.get_table(p_code text)
returns table (name text)
language sql stable security definer set search_path = public as $$
  select t.name from public.cafe_tables t where t.code = p_code and t.active;
$$;

-- Sipariş ver. Fiyatlar her zaman veritabanından alınır (müşteri fiyatı değiştiremez).
-- p_items örneği: [{"product_id": 3, "quantity": 2, "note": "şekersiz"}]
create or replace function public.place_order(p_table_code text, p_items jsonb, p_note text default '')
returns table (order_id uuid, order_no bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_table  public.cafe_tables%rowtype;
  v_order  public.orders%rowtype;
  v_item   jsonb;
  v_prod   public.products%rowtype;
  v_qty    int;
  v_total  numeric(10,2) := 0;
  v_adet   int := 0;
begin
  select * into v_table from public.cafe_tables where code = p_table_code and active;
  if not found then raise exception 'Masa bulunamadı'; end if;

  -- Kötüye kullanım sınırı (personel hariç): masa başına 10 dakikada 8 sipariş,
  -- tüm QR siparişleri için dakikada 60 sipariş
  if not public.is_staff() then
    if (select count(*) from public.orders
         where table_id = v_table.id and created_at > now() - interval '10 minutes') >= 8 then
      raise exception 'Bu masadan kısa sürede çok sipariş verildi. Lütfen garsona seslenin.';
    end if;
    if (select count(*) from public.orders
         where source = 'qr' and created_at > now() - interval '1 minute') >= 60 then
      raise exception 'Sistem şu an çok yoğun, lütfen biraz sonra tekrar deneyin.';
    end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Sepet geçersiz';
  end if;

  insert into public.orders (table_id, table_name, source, note)
  values (v_table.id, v_table.name,
          case when public.is_staff() then 'garson' else 'qr' end,
          left(coalesce(p_note, ''), 300))
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then raise exception 'Adet geçersiz'; end if;

    select p.* into v_prod from public.products p
      join public.categories c on c.id = p.category_id
     where p.id = (v_item->>'product_id')::bigint and p.active and c.active;
    if not found then raise exception 'Ürün bulunamadı veya satışta değil'; end if;

    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, note)
    values (v_order.id, v_prod.id, v_prod.name, v_prod.price, v_qty,
            left(coalesce(v_item->>'note', ''), 200));
    v_total := v_total + v_prod.price * v_qty;
    v_adet  := v_adet + v_qty;
    if v_adet > 100 then raise exception 'Bir siparişte en fazla 100 ürün olabilir'; end if;
  end loop;

  update public.orders set total = v_total where id = v_order.id;
  return query select v_order.id, v_order.order_no;
end $$;

-- Müşteri kendi siparişinin durumunu görsün (sipariş kimliği tahmin edilemez bir uuid'dir)
create or replace function public.get_order_status(p_order_id uuid)
returns table (order_no bigint, status text, total numeric)
language sql stable security definer set search_path = public as $$
  select o.order_no, o.status, o.total from public.orders o where o.id = p_order_id;
$$;

revoke all on function public.get_table(text)                 from public;
revoke all on function public.place_order(text, jsonb, text)  from public;
revoke all on function public.get_order_status(uuid)          from public;
grant execute on function public.get_table(text)                to anon, authenticated;
grant execute on function public.place_order(text, jsonb, text) to anon, authenticated;
grant execute on function public.get_order_status(uuid)         to anon, authenticated;

-- ---------- CANLI BİLDİRİM (Realtime) ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- ---------- ÜRÜN FOTOĞRAFLARI (Storage) ----------
-- Herkes görebilir (menüde gösterilecek), sadece personel yükleyip silebilir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('urun-fotograflari', 'urun-fotograflari', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "personel foto yukler"  on storage.objects;
drop policy if exists "personel foto gunceller" on storage.objects;
drop policy if exists "personel foto siler"   on storage.objects;
create policy "personel foto yukler" on storage.objects for insert to authenticated
  with check (bucket_id = 'urun-fotograflari' and (select public.is_staff()));
create policy "personel foto gunceller" on storage.objects for update to authenticated
  using (bucket_id = 'urun-fotograflari' and (select public.is_staff()));
create policy "personel foto siler" on storage.objects for delete to authenticated
  using (bucket_id = 'urun-fotograflari' and (select public.is_staff()));

-- ---------- ÖRNEK VERİ (tablolar boşsa) ----------
insert into public.settings (id) values (1) on conflict (id) do nothing;

do $$
declare c_sicak bigint; c_soguk bigint; c_tatli bigint;
begin
  if not exists (select 1 from public.categories) then
    insert into public.categories (name, sort_order) values ('Sıcak İçecekler', 1) returning id into c_sicak;
    insert into public.categories (name, sort_order) values ('Soğuk İçecekler', 2) returning id into c_soguk;
    insert into public.categories (name, sort_order) values ('Tatlılar', 3)        returning id into c_tatli;
    insert into public.products (category_id, name, description, price, sort_order) values
      (c_sicak, 'Türk Kahvesi', 'Lokum ile', 90, 1),
      (c_sicak, 'Çay', 'İnce belli bardak', 25, 2),
      (c_sicak, 'Latte', 'Espresso ve süt', 120, 3),
      (c_soguk, 'Limonata', 'Ev yapımı', 95, 1),
      (c_soguk, 'Ice Latte', '', 130, 2),
      (c_tatli, 'San Sebastian', 'Çikolata soslu', 180, 1),
      (c_tatli, 'Brownie', 'Dondurma ile', 150, 2);
  end if;
  if not exists (select 1 from public.cafe_tables) then
    insert into public.cafe_tables (name) values ('Masa 1'), ('Masa 2'), ('Masa 3'), ('Masa 4'), ('Bahçe 1');
  end if;
end $$;
