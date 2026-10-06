// Müşteri sayfası telefonda hızlı açılsın diye Supabase kütüphanesi yerine doğrudan fetch kullanıyoruz
// (react-best-practices: bundle size). Bu anahtar herkese açıktır; güvenliği veritabanı kuralları sağlar.
const URL_ = 'https://awhdvohpmqhjoosemzxv.supabase.co/rest/v1'
const KEY = 'sb_publishable_k5klOtK7230IuuNkyWFjeg_vdZSnDWm'

/** Restoranın menüsünü getirir. Restoran yoksa null döner. */
export async function menuGetir(slug) {
  let yanit
  try {
    yanit = await fetch(`${URL_}/rpc/menu_getir`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ p_slug: slug }),
    })
  } catch {
    throw new Error('İnternet bağlantını kontrol edip tekrar dene.')
  }
  const veri = await yanit.json().catch(() => null)
  if (!yanit.ok) throw new Error(veri?.message || 'Bir sorun oluştu, lütfen tekrar dene.')
  return veri
}
