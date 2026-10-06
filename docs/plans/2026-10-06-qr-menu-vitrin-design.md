# QR menü – Fotoğraflı vitrin tasarımı

**Tarih:** 6 Ekim 2026 · **Durum:** Onaylandı (Burak, "Fotoğraflı vitrin" seçeneği)

## Amaç
Masadaki müşteri telefonundan menüyü hızla tarayıp sipariş verir. Ürün fotoğrafları ana unsurdur; arayüz geri planda kalır.

## Tasarım kararları
| Konu | Karar | Neden |
|---|---|---|
| Zemin | Saf beyaz `#ffffff` | Fotoğraflar öne çıksın |
| Yazı | Lacivert `#14213d`, ikincil `#55606e` | 4.5:1 üstü kontrast |
| Vurgu | Koyu fıstık `#2f5d3a`, açık ton `#e8efe5` | Tek vurgu; krem + kiremit şablonundan uzak |
| Yazı tipi | Bricolage Grotesque (tek aile) | Karakterli, Türkçe karakter desteği tam |
| Düzen | 2 sütun ızgara, kare fotoğraf = kart | Kutu/gölge yok, fotoğraf kartın kendisi |
| Fotoğrafsız ürün | Açık fıstık zemin + büyük baş harf | Boş görünmesin |
| Hareket | Sadece alt pencere açılışı | Kullanıcı eylemine cevap |

## Kaldırılanlar (frontend-design kontrolü)
- Büyük harfli "HOŞ GELDİNİZ" etiketi
- "A · B · C" noktalı meta metinler
- Her ürün için aynı gölgeli kart

## Bileşenler
- Başlık: kafe adı (büyük), masa adı
- Yapışkan kategori sekmeleri (kaydırmayla senkron)
- Ürün ızgarası: fotoğraf, ad, fiyat, köşede + / adet sayacı
- Ürün detayı (alt pencere): büyük fotoğraf, açıklama, adet, "Sepete ekle"
- Sepet (alt pencere), sipariş takibi

## Veri akışı
- Masaüstü uygulaması: ürün formunda "Fotoğraf yükle" → tarayıcıda 900px WebP'ye küçültülür → Supabase Storage `urun-fotograflari` kovası → herkese açık adres `products.image_url`'e yazılır.
- QR menü: `image_url` varsa `loading="lazy"` ile gösterir.

## Güvenlik
- Kova herkese açık okunur; yükleme/silme sadece `staff` listesindeki personel.
- Dosya sınırı 5 MB, sadece webp/jpeg/png.
