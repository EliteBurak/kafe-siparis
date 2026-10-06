const para = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
const saat = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' })

export const tl = (n) => para.format(Number(n) || 0)
export const saatYaz = (d) => saat.format(new Date(d))

/** "3 dk önce" gibi kısa süre metni */
export function gecenSure(d, simdi = Date.now()) {
  const dk = Math.floor((simdi - new Date(d).getTime()) / 60000)
  if (dk < 1) return 'şimdi'
  if (dk < 60) return `${dk} dk`
  const sa = Math.floor(dk / 60)
  return `${sa} sa ${dk % 60} dk`
}

export const DURUMLAR = {
  yeni: { ad: 'Yeni', sonraki: 'hazirlaniyor', buton: 'Hazırlamaya başla', renk: 'bg-blue-50 text-blue-800 ring-blue-200' },
  hazirlaniyor: { ad: 'Hazırlanıyor', sonraki: 'hazir', buton: 'Hazır', renk: 'bg-amber-50 text-amber-900 ring-amber-200' },
  hazir: { ad: 'Hazır', sonraki: 'teslim', buton: 'Teslim edildi', renk: 'bg-green-50 text-green-800 ring-green-200' },
  teslim: { ad: 'Teslim edildi', sonraki: null, buton: null, renk: 'bg-stone-100 text-stone-700 ring-stone-200' },
  iptal: { ad: 'İptal', sonraki: null, buton: null, renk: 'bg-red-50 text-red-800 ring-red-200' },
}

/** Fiyat girişini sayıya çevirir: "12,50" -> 12.5 */
export function fiyatOku(s) {
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}
