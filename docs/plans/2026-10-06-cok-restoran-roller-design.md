# Çok restoranlı yapı, roller ve sürümler – Faz 1

**Tarih:** 6 Ekim 2026 · **Durum:** Onaylandı (Burak: "önerdiğini yapalım" – tek web paneli, A seçeneği)

## Amaç
Ürünü kafeden restorana çevirip birden fazla işletmeye satılabilir hale getirmek.

## Kararlar
| Konu | Karar | Neden |
|---|---|---|
| Platform | Tek panel kodu: Windows'ta Electron, telefonda/tablette tarayıcı | Tek kod, tek güncelleme |
| Çoklu kiracı | Her tabloda `restaurant_id`, RLS ile üyelik kontrolü | Restoranlar birbirinin verisini göremez |
| Roller | sahip / kasiyer / garson (`members` tablosu) | Menü sadece sahipte, hesap kapatma kasada |
| Personel ekleme | E-posta + 8 haneli davet kodu | E-posta servisine bağımlı değil; kod başka hesapta çalışmaz |
| QR menü | Sadece görüntüleme, `?r=<slug>` | Sahte sipariş riski yok, masa başına ayrı QR gerekmez |
| Sipariş no | Restoran başına sayaç | Her restoran 1'den başlar |
| Sürüm limitleri | Veritabanı tetikleyicileri | İstemci kurcalanarak aşılamaz |

## Veri modeli
restaurants (plan, slug, order_counter) → members (rol) · invitations (kod) · categories · products · dining_tables · orders (created_by_name, closed_by) · order_items

## Yetki matrisi
| İşlem | Sahip | Kasiyer | Garson |
|---|---|---|---|
| Menü/masa/personel düzenleme | ✓ | – | – |
| Sipariş girme, durum değiştirme | ✓ | ✓ | ✓ |
| Hesap kapatma | ✓ | ✓ | – |
| Rapor | ✓ | ✓ | – |

## Sonraki fazlar
2. Adisyon: salon planı, masa taşıma/birleştirme, ürün seçenekleri, ödeme türleri, hesap bölme, gün sonu
3. Mutfak ekranı, fiş yazıcı
4. Abonelik ödemesi (iyzico/PayTR), tanıtım sitesi
5. Stok, rezervasyon, çoklu dil, paket servis entegrasyonları
