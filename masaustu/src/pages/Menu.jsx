import { useRef, useState } from 'react'
import { Plus, Pencil, Trash2, BookOpen, Eye, EyeOff, ImagePlus, ImageOff, Loader2 } from 'lucide-react'
import { useVeri } from '../hooks/useVeri'
import { supabase, hataMesaji } from '../lib/supabase'
import { tl, fiyatOku } from '../lib/format'
import { fotoYukle, fotoSil } from '../lib/foto'
import { Alan, Bos, Buton, IkonButon, Modal, Rozet, SayfaBasligi, girdiSinifi, useUyari } from '../components/ui'

export default function Menu() {
  const { kategoriler, urunler, yenile } = useVeri()
  const { goster, sor } = useUyari()
  const [secili, setSecili] = useState(null)
  const [kategoriFormu, setKategoriFormu] = useState(null)
  const [urunFormu, setUrunFormu] = useState(null)

  const seciliId = kategoriler.some((k) => k.id === secili) ? secili : kategoriler[0]?.id
  const seciliKategori = kategoriler.find((k) => k.id === seciliId)
  const liste = urunler.filter((u) => u.category_id === seciliId)

  async function aktiflikDegistir(tablo, kayit) {
    const { error } = await supabase.from(tablo).update({ active: !kayit.active }).eq('id', kayit.id)
    if (error) return goster(hataMesaji(error), 'hata')
    goster(`${kayit.name} ${kayit.active ? 'satıştan kaldırıldı' : 'satışa açıldı'}`)
    yenile()
  }

  async function sil(tablo, kayit, mesaj) {
    if (!(await sor({ baslik: `${kayit.name} silinsin mi?`, mesaj, evet: 'Sil', tehlikeli: true }))) return
    const { error } = await supabase.from(tablo).delete().eq('id', kayit.id)
    if (error) return goster(hataMesaji(error), 'hata')
    goster(`${kayit.name} silindi`)
    yenile()
  }

  return (
    <>
      <SayfaBasligi baslik="Menü" aciklama="Burada yaptığın değişiklikler QR menüde hemen görünür.">
        <Buton tur="ikincil" ikon={Plus} onClick={() => setKategoriFormu({})}>Kategori</Buton>
        <Buton ikon={Plus} disabled={!kategoriler.length} onClick={() => setUrunFormu({ category_id: seciliId })}>Ürün ekle</Buton>
      </SayfaBasligi>

      {kategoriler.length === 0 ? (
        <Bos ikon={BookOpen} baslik="Menü boş" aciklama="Önce bir kategori ekle (ör. Sıcak İçecekler), sonra ürünlerini gir.">
          <Buton ikon={Plus} className="mt-2" onClick={() => setKategoriFormu({})}>Kategori ekle</Buton>
        </Bos>
      ) : (
        <div className="flex gap-6">
          <ul className="flex w-64 shrink-0 flex-col gap-1" aria-label="Kategoriler">
            {kategoriler.map((k) => {
              const adet = urunler.filter((u) => u.category_id === k.id).length
              return (
                <li key={k.id}>
                  <button
                    onClick={() => setSecili(k.id)}
                    aria-current={k.id === seciliId ? 'true' : undefined}
                    className={`flex h-12 w-full items-center justify-between rounded-lg px-4 text-left font-semibold transition-colors duration-150 ${
                      k.id === seciliId ? 'bg-white shadow-sm ring-1 ring-stone-200' : 'text-stone-700 hover:bg-stone-200/60'
                    } ${k.active ? '' : 'text-stone-500 line-through'}`}
                  >
                    <span className="truncate">{k.name}</span>
                    <span className="text-sm font-medium text-stone-500">{adet}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <section className="min-w-0 flex-1 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
            {seciliKategori && (
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{seciliKategori.name}</h2>
                  {!seciliKategori.active && <Rozet className="bg-stone-100 text-stone-700 ring-stone-300">Gizli</Rozet>}
                </div>
                <div className="flex">
                  <IkonButon etiket={seciliKategori.active ? 'Kategoriyi gizle' : 'Kategoriyi göster'} ikon={seciliKategori.active ? EyeOff : Eye} onClick={() => aktiflikDegistir('categories', seciliKategori)} />
                  <IkonButon etiket="Kategoriyi düzenle" ikon={Pencil} onClick={() => setKategoriFormu(seciliKategori)} />
                  <IkonButon etiket="Kategoriyi sil" ikon={Trash2} className="hover:text-red-700" onClick={() => sil('categories', seciliKategori, 'Kategorideki tüm ürünler de silinir.')} />
                </div>
              </div>
            )}

            {liste.length === 0 ? (
              <Bos baslik="Bu kategoride ürün yok">
                <Buton ikon={Plus} className="mt-2" onClick={() => setUrunFormu({ category_id: seciliId })}>Ürün ekle</Buton>
              </Bos>
            ) : (
              <table className="w-full text-left">
                <thead className="border-b border-stone-200 text-sm text-stone-600">
                  <tr>
                    <th className="pb-2 font-semibold">Ürün</th>
                    <th className="pb-2 text-right font-semibold">Fiyat</th>
                    <th className="pb-2 text-center font-semibold">Durum</th>
                    <th className="pb-2"><span className="sr-only">İşlemler</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {liste.map((u) => (
                    <tr key={u.id} className={u.active ? '' : 'text-stone-500'}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <Kucukresim u={u} />
                          <div>
                            <p className="font-semibold">{u.name}</p>
                            {u.description && <p className="text-sm text-stone-600">{u.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right font-bold">{tl(u.price)}</td>
                      <td className="py-3 text-center">
                        <button onClick={() => aktiflikDegistir('products', u)} className="rounded-full" aria-label={`${u.name}: ${u.active ? 'satışta, kaldırmak için tıkla' : 'satışta değil, açmak için tıkla'}`}>
                          <Rozet className={u.active ? 'bg-green-50 text-green-800 ring-green-200' : 'bg-stone-100 text-stone-700 ring-stone-300'}>
                            {u.active ? 'Satışta' : 'Tükendi'}
                          </Rozet>
                        </button>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <IkonButon etiket="Düzenle" ikon={Pencil} onClick={() => setUrunFormu(u)} />
                        <IkonButon etiket="Sil" ikon={Trash2} className="hover:text-red-700" onClick={() => sil('products', u, 'Geçmiş siparişlerde ürün adı ve fiyatı korunur.')} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      <KategoriFormu kayit={kategoriFormu} kapat={() => setKategoriFormu(null)} kaydedildi={yenile} siradaki={kategoriler.length + 1} />
      <UrunFormu kayit={urunFormu} kapat={() => setUrunFormu(null)} kaydedildi={yenile} kategoriler={kategoriler} />
    </>
  )
}

function useForm(kayit, bosHal) {
  const [deger, setDeger] = useState(bosHal)
  const [onceki, setOnceki] = useState(null)
  if (kayit !== onceki) {
    setOnceki(kayit)
    setDeger({ ...bosHal, ...kayit })
  }
  return [deger, (alanlar) => setDeger((d) => ({ ...d, ...alanlar }))]
}

function KategoriFormu({ kayit, kapat, kaydedildi, siradaki }) {
  const { goster } = useUyari()
  const [d, set] = useForm(kayit, { name: '', sort_order: siradaki })
  const [bekliyor, setBekliyor] = useState(false)

  async function kaydet(e) {
    e.preventDefault()
    setBekliyor(true)
    const veri = { name: d.name.trim(), sort_order: Number(d.sort_order) || 0 }
    const { error } = kayit.id
      ? await supabase.from('categories').update(veri).eq('id', kayit.id)
      : await supabase.from('categories').insert(veri)
    setBekliyor(false)
    if (error) return goster(hataMesaji(error), 'hata')
    goster('Kategori kaydedildi')
    kaydedildi()
    kapat()
  }

  return (
    <Modal acik={!!kayit} kapat={kapat} baslik={kayit?.id ? 'Kategoriyi düzenle' : 'Yeni kategori'}
      alt={<><Buton tur="ikincil" onClick={kapat}>Vazgeç</Buton><Buton type="submit" form="kategori-form" yukleniyor={bekliyor}>Kaydet</Buton></>}>
      <form id="kategori-form" onSubmit={kaydet} className="flex flex-col gap-4">
        <Alan etiket="Kategori adı">{(id) => <input id={id} required maxLength={50} value={d.name} onChange={(e) => set({ name: e.target.value })} className={girdiSinifi} />}</Alan>
        <Alan etiket="Sıra" ipucu="Küçük sayı menüde daha üstte görünür.">{(id) => <input id={id} type="number" value={d.sort_order} onChange={(e) => set({ sort_order: e.target.value })} className={girdiSinifi} />}</Alan>
      </form>
    </Modal>
  )
}

function UrunFormu({ kayit, kapat, kaydedildi, kategoriler }) {
  const { goster } = useUyari()
  const [d, set] = useForm(kayit, { name: '', description: '', price: '', category_id: '', image_url: '', sort_order: 0, active: true })
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)

  async function kaydet(e) {
    e.preventDefault()
    const fiyat = fiyatOku(d.price)
    if (fiyat === null) return setHata('Geçerli bir fiyat gir (ör. 85 veya 85,50).')
    setHata('')
    setBekliyor(true)
    const veri = {
      name: d.name.trim(),
      description: d.description.trim(),
      price: fiyat,
      category_id: Number(d.category_id),
      image_url: d.image_url.trim(),
      sort_order: Number(d.sort_order) || 0,
      active: d.active,
    }
    const { error } = kayit.id
      ? await supabase.from('products').update(veri).eq('id', kayit.id)
      : await supabase.from('products').insert(veri)
    setBekliyor(false)
    if (error) return goster(hataMesaji(error), 'hata')
    // Fotoğraf değiştiyse eskisini depodan sil
    if (kayit.image_url && kayit.image_url !== veri.image_url) fotoSil(kayit.image_url)
    goster('Ürün kaydedildi')
    kaydedildi()
    kapat()
  }

  return (
    <Modal acik={!!kayit} kapat={kapat} baslik={kayit?.id ? 'Ürünü düzenle' : 'Yeni ürün'}
      alt={<><Buton tur="ikincil" onClick={kapat}>Vazgeç</Buton><Buton type="submit" form="urun-form" yukleniyor={bekliyor}>Kaydet</Buton></>}>
      <form id="urun-form" onSubmit={kaydet} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Alan etiket="Ürün adı">{(id) => <input id={id} required maxLength={80} value={d.name} onChange={(e) => set({ name: e.target.value })} className={girdiSinifi} />}</Alan>
        </div>
        <div className="col-span-2">
          <Alan etiket="Açıklama" ipucu="İsteğe bağlı. Müşteri ürüne dokununca görür.">{(id) => <input id={id} maxLength={160} value={d.description} onChange={(e) => set({ description: e.target.value })} className={girdiSinifi} />}</Alan>
        </div>
        <Alan etiket="Fiyat (₺)" hata={hata}>{(id) => <input id={id} required inputMode="decimal" value={d.price} onChange={(e) => set({ price: e.target.value })} className={girdiSinifi} />}</Alan>
        <Alan etiket="Kategori">
          {(id) => (
            <select id={id} value={d.category_id} onChange={(e) => set({ category_id: e.target.value })} className={girdiSinifi}>
              {kategoriler.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          )}
        </Alan>
        <div className="col-span-2">
          <FotoSecici adres={d.image_url} ad={d.name} degisti={(image_url) => set({ image_url })} />
        </div>
        <Alan etiket="Sıra">{(id) => <input id={id} type="number" value={d.sort_order} onChange={(e) => set({ sort_order: e.target.value })} className={girdiSinifi} />}</Alan>
        <label className="flex items-center gap-3 self-end pb-2.5 font-medium">
          <input type="checkbox" checked={d.active} onChange={(e) => set({ active: e.target.checked })} className="size-5 accent-brand-700" />
          Satışta
        </label>
      </form>
    </Modal>
  )
}

function Kucukresim({ u }) {
  return u.image_url ? (
    <img src={u.image_url} alt="" width="48" height="48" loading="lazy" className="size-12 shrink-0 rounded-lg bg-stone-100 object-cover" />
  ) : (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400" title="Fotoğraf yok">
      <ImageOff className="size-5" aria-hidden />
    </div>
  )
}

function FotoSecici({ adres, ad, degisti }) {
  const { goster } = useUyari()
  const girdi = useRef(null)
  const [yukleniyor, setYukleniyor] = useState(false)

  async function sec(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return
    setYukleniyor(true)
    try {
      degisti(await fotoYukle(dosya))
    } catch (err) {
      goster(hataMesaji(err), 'hata')
    }
    setYukleniyor(false)
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-stone-800">Fotoğraf</p>
      <div className="flex items-center gap-4">
        <div className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-stone-100">
          {adres ? (
            <img src={adres} alt={ad || 'Ürün fotoğrafı'} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-stone-400"><ImageOff className="size-7" aria-hidden /></div>
          )}
          {yukleniyor && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="size-6 animate-spin text-brand-700" aria-label="Yükleniyor" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <input ref={girdi} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={sec} />
          <Buton type="button" tur="ikincil" boyut="kucuk" ikon={ImagePlus} disabled={yukleniyor} onClick={() => girdi.current.click()}>
            {adres ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle'}
          </Buton>
          {adres && (
            <Buton type="button" tur="hayalet" boyut="kucuk" ikon={Trash2} disabled={yukleniyor} onClick={() => degisti('')}>Kaldır</Buton>
          )}
          <p className="text-sm text-stone-600">Kare olarak kırpılır. En iyi sonuç için ürünü ortalayarak çek.</p>
        </div>
      </div>
    </div>
  )
}
