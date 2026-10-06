// Müşteri sayfası telefonda hızlı açılsın diye Supabase kütüphanesi yerine doğrudan fetch kullanıyoruz
// (react-best-practices: bundle size). Bu anahtar herkese açıktır; güvenliği veritabanı kuralları sağlar.
const URL_ = 'https://awhdvohpmqhjoosemzxv.supabase.co/rest/v1'
const KEY = 'sb_publishable_k5klOtK7230IuuNkyWFjeg_vdZSnDWm'

async function istek(yol, { govde, ...secenek } = {}) {
  let yanit
  try {
    yanit = await fetch(`${URL_}/${yol}`, {
      ...secenek,
      method: govde ? 'POST' : 'GET',
      headers: { apikey: KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: govde ? JSON.stringify(govde) : undefined,
    })
  } catch {
    throw new Error('İnternet bağlantını kontrol edip tekrar dene.')
  }
  const veri = await yanit.json().catch(() => null)
  if (!yanit.ok) throw new Error(veri?.message || 'Bir sorun oluştu, lütfen tekrar dene.')
  return veri
}

export const masaGetir = (kod) => istek('rpc/get_table', { govde: { p_code: kod } }).then((r) => r[0] ?? null)

export async function menuGetir() {
  // Üç bağımsız istek paralel gider (react-best-practices: async-parallel)
  const [ayar, kategoriler, urunler] = await Promise.all([
    istek('settings?select=cafe_name,currency&id=eq.1'),
    istek('categories?select=id,name&active=is.true&order=sort_order,id'),
    istek('products?select=id,category_id,name,description,price,image_url&active=is.true&order=sort_order,id'),
  ])
  return { ayar: ayar[0] ?? { cafe_name: '' }, kategoriler, urunler }
}

export const siparisVer = (kod, kalemler, not) =>
  istek('rpc/place_order', { govde: { p_table_code: kod, p_items: kalemler, p_note: not } }).then((r) => r[0])

export const siparisDurumu = (id) => istek('rpc/get_order_status', { govde: { p_order_id: id } }).then((r) => r[0] ?? null)
