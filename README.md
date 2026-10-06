# Kafe Sipariş

Kafeler için QR menü + sipariş yönetimi.

| Klasör | Ne işe yarar |
|---|---|
| `supabase/kurulum.sql` | Veritabanı tabloları, güvenlik kuralları, sipariş fonksiyonları |
| `masaustu/` | Kasadaki bilgisayarda çalışan Windows uygulaması (Electron + React) |
| `qr-menu/` | Müşterinin telefonda açtığı menü sayfası (React) |

## Masaüstü uygulamasını çalıştırma

VS Code'da **Terminal → New Terminal** aç ve şunları yaz:

```
cd masaustu
npm install
npm start
```

`npm install` sadece ilk sefer (ve paket değişince) gerekir. Sonraki açılışlarda `npm start` yeterli.

Kurulum dosyası (.exe) üretmek için: `npm run paketle` → `masaustu/cikti/` klasörüne düşer.

## QR menüyü bilgisayarda deneme

```
cd qr-menu
npm install
npm run dev
```

Terminalde çıkan `http://localhost:5173/` adresinin sonuna `?masa=MASAKODU` ekleyip tarayıcıda aç.
Masa kodunu masaüstü uygulamasında **Masalar → QR simgesi** penceresindeki adresten görebilirsin.

## QR menüyü internette yayınlama (GitHub Pages)

`.github/workflows/qr-menu.yml` dosyası, kod GitHub'a gönderilince menüyü otomatik yayınlar.
Yayın adresi `https://KULLANICIADI.github.io/DEPOADI/` olur; bu adresi masaüstü uygulamasında **Ayarlar → QR menü adresi** alanına yaz.

## Güvenlik notları

- Koddaki Supabase anahtarı (`sb_publishable_...`) herkese açık olacak şekilde tasarlanmıştır.
- **Secret / service_role anahtarını asla koda yazma.**
- Müşteriler sadece menüyü okuyabilir ve sipariş verebilir. Fiyatı veritabanı hesaplar, başkasının siparişini göremezler.
- Bir masadan 10 dakikada en fazla 8 sipariş verilebilir. Bir siparişte en fazla 100 ürün olabilir.
- Yönetim (menü, masa, sipariş, fotoğraf) sadece `staff` listesindeki kullanıcılara açıktır. Giriş yapmış olmak tek başına yetmez.
- Supabase'de **Authentication → Sign In / Providers → Allow new users to sign up** kapalı olmalı.

### Yeni personel eklemek

1. Supabase'de **Authentication → Users → Add user** ile kullanıcıyı oluştur.
2. **SQL Editor**'da şunu çalıştır (e-postayı değiştir):
   ```sql
   insert into public.staff (user_id)
   select id from auth.users where email = 'personel@ornek.com';
   ```
