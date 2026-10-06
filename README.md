# Restoran Sipariş

Restoranlar için adisyon ve sipariş yönetimi + müşteriye QR menü. Birden fazla restoran aynı sistemi kullanabilir; her restoranın verisi birbirinden tamamen ayrıdır.

| Klasör | Ne işe yarar |
|---|---|
| `supabase/kurulum.sql` | Veritabanı: restoranlar, roller, menü, masalar, siparişler, güvenlik kuralları, sürüm limitleri |
| `masaustu/` | Yönetim paneli. Windows programı olarak **ve** web'de (telefon/tablet) aynı kodla çalışır |
| `qr-menu/` | Müşterinin telefonda gördüğü menü (sadece görüntüleme) |
| `docs/plans/` | Tasarım kararları |

## Roller

| Rol | Yapabildikleri |
|---|---|
| **Restoran sahibi** | Her şey: menü, masalar, personel, ayarlar, rapor, hesap kapatma |
| **Kasiyer** | Sipariş alır, hesap kapatır, raporu görür. Menüyü değiştiremez |
| **Garson** | Telefondan sipariş girer, masaları görür. Hesap kapatamaz |

Her siparişte siparişi alan kişinin adı kayıtlıdır. Yetkiler veritabanında kontrol edilir; programı kurcalayarak aşılamaz.

## Sürümler

| | Ücretsiz | Pro |
|---|---|---|
| Masa | 10 | Sınırsız |
| Ürün | 40 | Sınırsız |
| Personel hesabı | Sadece sahip | Kasiyer ve garsonlar |
| Rapor | Bugün | Geçmiş günler |
| QR menü | "Restoran Sipariş ile hazırlandı" yazısıyla | Yazısız |

Ödeme sistemi gelene kadar bir restoranı Pro yapmak için SQL Editor'da:

```sql
update public.restaurants set plan = 'pro' where slug = 'restoranin-kisa-adi';
```

## Çalıştırma

**Windows programı:**
```
cd masaustu
npm install
npm start
```

**Web (telefon/tablet):** Kod GitHub'a gönderilince otomatik yayınlanır:

- Panel: `https://eliteburak.github.io/kafe-siparis/panel/`
- Müşteri menüsü: `https://eliteburak.github.io/kafe-siparis/?r=<restoran-kisa-adi>` (bağlantı ve QR kod panelde **Ayarlar** sayfasında)

## Yeni restoran ve personel

1. Restoran sahibi uygulamada **Hesap oluştur** der, ardından **Restoranımı kur**.
2. Sahip **Personel → Personel davet et** ile kişinin adını, e-postasını ve görevini girer. Ekranda 8 haneli bir davet kodu çıkar.
3. Personel aynı e-postayla **Hesap oluştur** der, **Davet koduyla katıl**'a kodu yazar.

## Supabase ayarları

- **Authentication → Sign In / Providers → Allow new users to sign up:** açık olmalı (restoran sahipleri ve personel kendi hesabını açar).
- **Confirm email:** Test aşamasında kapatılabilir. Satışa çıkarken açık olmalı ve **Authentication → Emails → SMTP Settings** bölümünden kendi e-posta servisin (örn. Resend, Brevo) bağlanmalı; Supabase'in hazır e-posta servisi çok sınırlıdır.

## Güvenlik

- Koddaki Supabase anahtarı (`sb_publishable_...`) herkese açık olacak şekilde tasarlanmıştır. **Secret / service_role anahtarını asla koda yazma.**
- Her tablo satır düzeyinde güvenlikle (RLS) korunur: bir kişi sadece üyesi olduğu restoranın verisini görür.
- Plan, sipariş tutarı ve fiyatlar kullanıcı tarafından değiştirilemez; sipariş tutarını veritabanı hesaplar.
- Davet kodu sadece davetteki e-postayla açılmış hesapta çalışır.
- Ürün fotoğraflarını sadece o restoranın sahibi yükleyip silebilir.
