import { supabase } from './supabase'

const KOVA = 'urun-fotograflari'

/**
 * Seçilen fotoğrafı ortadan kare kırpar, en fazla 900px'e küçültür ve WebP'ye çevirir.
 * Böylece telefonda menü hızlı açılır (tipik boyut 60-150 KB).
 */
async function hazirla(dosya, boyut = 900) {
  const resim = await createImageBitmap(dosya, { imageOrientation: 'from-image' })
  const kenar = Math.min(resim.width, resim.height)
  const hedef = Math.min(boyut, kenar)
  const tuval = document.createElement('canvas')
  tuval.width = hedef
  tuval.height = hedef
  const ctx = tuval.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(resim, (resim.width - kenar) / 2, (resim.height - kenar) / 2, kenar, kenar, 0, 0, hedef, hedef)
  resim.close()
  return new Promise((coz, red) =>
    tuval.toBlob((b) => (b ? coz(b) : red(new Error('Fotoğraf işlenemedi'))), 'image/webp', 0.82)
  )
}

/** Fotoğrafı yükler ve herkese açık adresini döndürür. */
export async function fotoYukle(dosya, rid) {
  if (!dosya.type.startsWith('image/')) throw new Error('Lütfen bir resim dosyası seç (JPG, PNG veya WebP).')
  if (dosya.size > 25 * 1024 * 1024) throw new Error('Fotoğraf çok büyük (en fazla 25 MB).')
  const blob = await hazirla(dosya)
  // Restoran klasörüne yüklenir; veritabanı sadece o restoranın sahibine izin verir
  const ad = `${rid}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(KOVA).upload(ad, blob, { contentType: 'image/webp', cacheControl: '31536000' })
  if (error) throw error
  return supabase.storage.from(KOVA).getPublicUrl(ad).data.publicUrl
}

/** Bizim kovamızdaki eski fotoğrafı siler (başka yerden gelen adreslere dokunmaz). */
export async function fotoSil(adres) {
  const isaret = `/object/public/${KOVA}/`
  const i = adres?.indexOf(isaret) ?? -1
  if (i < 0) return
  await supabase.storage.from(KOVA).remove([adres.slice(i + isaret.length)])
}
