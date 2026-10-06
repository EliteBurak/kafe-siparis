import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ReceiptTurkishLira as Receipt, LayoutGrid, ClipboardPlus } from 'lucide-react'
import { useVeri } from '../hooks/useVeri'
import { useRestoran } from '../hooks/useRestoran'
import { supabase, hataMesaji } from '../lib/supabase'
import { DURUMLAR, tl } from '../lib/format'
import { YETKI_YOK } from '../hooks/useSiparisler'
import { Alan, Bos, Buton, IkonButon, Modal, Rozet, SayfaBasligi, girdiSinifi, useUyari } from '../components/ui'

export default function Masalar({ siparisler, yenileSiparis, siparisAl }) {
  const { masalar, yenile } = useVeri()
  const { sahip, pro } = useRestoran()
  const { goster, sor } = useUyari()
  const [duzenlenen, setDuzenlenen] = useState(null) // null | {} (yeni) | masa
  const [hesapMasa, setHesapMasa] = useState(null)

  // Masa id -> açık siparişler (tek geçişte grupla; react-best-practices: js-index-maps)
  const acikHesaplar = useMemo(() => {
    const m = new Map()
    for (const o of siparisler) {
      if (o.table_id == null) continue
      if (!m.has(o.table_id)) m.set(o.table_id, [])
      m.get(o.table_id).push(o)
    }
    return m
  }, [siparisler])

  const gorunen = sahip ? masalar : masalar.filter((m) => m.active)
  const doluSayisi = gorunen.filter((m) => acikHesaplar.has(m.id)).length

  async function sil(masa) {
    const tamam = await sor({ baslik: `${masa.name} silinsin mi?`, mesaj: 'Geçmiş siparişler raporlarda kalır.', evet: 'Sil', tehlikeli: true })
    if (!tamam) return
    const { error } = await supabase.from('dining_tables').delete().eq('id', masa.id)
    if (error) return goster(hataMesaji(error), 'hata')
    goster(`${masa.name} silindi`)
    yenile()
  }

  return (
    <>
      <SayfaBasligi baslik="Masalar" aciklama={`${doluSayisi} dolu, ${gorunen.length - doluSayisi} boş masa`}>
        {sahip && <Buton ikon={Plus} onClick={() => setDuzenlenen({})}>Masa ekle</Buton>}
      </SayfaBasligi>

      {sahip && !pro && (
        <p className="mb-4 text-sm text-stone-600">Ücretsiz sürümde {masalar.length}/10 masa kullanılıyor.</p>
      )}

      {gorunen.length === 0 ? (
        <Bos ikon={LayoutGrid} baslik="Henüz masa yok" aciklama={sahip ? 'Restorandaki masaları ekleyerek başla.' : 'Restoran sahibinin masa eklemesi gerekiyor.'}>
          {sahip && <Buton ikon={Plus} className="mt-2" onClick={() => setDuzenlenen({})}>Masa ekle</Buton>}
        </Bos>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4">
          {gorunen.map((m) => {
            const acik = acikHesaplar.get(m.id) ?? []
            const toplam = acik.reduce((t, o) => t + Number(o.total), 0)
            return (
              <article key={m.id} className={`flex flex-col rounded-xl p-3 shadow-sm ring-1 sm:p-4 ${acik.length ? 'bg-brand-50 ring-brand-200' : 'bg-white ring-stone-200'} ${m.active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{m.name}</h2>
                    <p className="text-sm text-stone-600">{acik.length ? `${acik.length} açık sipariş` : m.active ? 'Boş' : 'Pasif'}</p>
                  </div>
                  {sahip && (
                    <div className="-mr-2 -mt-1 flex shrink-0">
                      <IkonButon etiket={`${m.name} düzenle`} ikon={Pencil} onClick={() => setDuzenlenen(m)} />
                      <IkonButon etiket={`${m.name} sil`} ikon={Trash2} onClick={() => sil(m)} className="hover:text-red-700" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xl font-bold sm:text-2xl">{tl(toplam)}</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Buton tur="ikincil" boyut="kucuk" ikon={ClipboardPlus} className="h-11! flex-1 sm:h-9!" disabled={!m.active} onClick={() => siparisAl(m.id)}>
                    Sipariş
                  </Buton>
                  <Buton tur={acik.length ? 'ana' : 'ikincil'} boyut="kucuk" ikon={Receipt} className="h-11! flex-1 sm:h-9!" disabled={!acik.length} onClick={() => setHesapMasa(m)}>
                    Hesap
                  </Buton>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {sahip && <MasaFormu masa={duzenlenen} kapat={() => setDuzenlenen(null)} kaydedildi={yenile} />}
      <HesapPenceresi masa={hesapMasa} siparisler={hesapMasa ? acikHesaplar.get(hesapMasa.id) ?? [] : []} kapat={() => setHesapMasa(null)} yenileSiparis={yenileSiparis} />
    </>
  )
}

function MasaFormu({ masa, kapat, kaydedildi }) {
  const { goster } = useUyari()
  const { restoran } = useRestoran()
  const [ad, setAd] = useState('')
  const [aktif, setAktif] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [oncekiMasa, setOncekiMasa] = useState(null)

  // Pencere açılınca formu doldur (render sırasında türetilmiş durum güncellemesi)
  if (masa !== oncekiMasa) {
    setOncekiMasa(masa)
    setAd(masa?.name ?? '')
    setAktif(masa?.active ?? true)
  }

  async function kaydet(e) {
    e.preventDefault()
    if (!ad.trim()) return
    setKaydediliyor(true)
    const kayit = { name: ad.trim(), active: aktif }
    const { error } = masa.id
      ? await supabase.from('dining_tables').update(kayit).eq('id', masa.id)
      : await supabase.from('dining_tables').insert({ ...kayit, restaurant_id: restoran.id })
    setKaydediliyor(false)
    if (error) return goster(hataMesaji(error), 'hata')
    goster('Masa kaydedildi')
    kaydedildi()
    kapat()
  }

  return (
    <Modal
      acik={!!masa}
      kapat={kapat}
      baslik={masa?.id ? 'Masayı düzenle' : 'Yeni masa'}
      alt={
        <>
          <Buton tur="ikincil" onClick={kapat}>Vazgeç</Buton>
          <Buton type="submit" form="masa-form" yukleniyor={kaydediliyor}>Kaydet</Buton>
        </>
      }
    >
      <form id="masa-form" onSubmit={kaydet} className="flex flex-col gap-4">
        <Alan etiket="Masa adı" ipucu="Örn: Masa 7, Bahçe 2, Bar">
          {(id) => <input id={id} required maxLength={40} value={ad} onChange={(e) => setAd(e.target.value)} className={girdiSinifi} />}
        </Alan>
        <label className="flex items-center gap-3 font-medium">
          <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="size-5 accent-brand-700" />
          Aktif (kapalıysa bu masaya sipariş girilemez)
        </label>
      </form>
    </Modal>
  )
}

function HesapPenceresi({ masa, siparisler, kapat, yenileSiparis }) {
  const { goster, sor } = useUyari()
  const { kasa } = useRestoran()
  const [kapatiliyor, setKapatiliyor] = useState(false)

  // Aynı üründen gelen kalemleri birleştir
  const kalemler = useMemo(() => {
    const m = new Map()
    for (const o of siparisler)
      for (const k of o.order_items ?? []) {
        const anahtar = `${k.product_name}|${k.unit_price}`
        const v = m.get(anahtar) ?? { ad: k.product_name, fiyat: Number(k.unit_price), adet: 0 }
        v.adet += k.quantity
        m.set(anahtar, v)
      }
    return [...m.values()]
  }, [siparisler])
  const toplam = siparisler.reduce((t, o) => t + Number(o.total), 0)
  const teslimEdilmemis = siparisler.filter((o) => o.status !== 'teslim')

  async function hesabiKapat() {
    if (teslimEdilmemis.length) {
      const tamam = await sor({
        baslik: 'Teslim edilmemiş sipariş var',
        mesaj: `${teslimEdilmemis.length} sipariş henüz teslim edilmedi (${teslimEdilmemis.map((o) => DURUMLAR[o.status].ad).join(', ')}). Yine de hesap kapatılsın mı?`,
        evet: 'Hesabı kapat',
      })
      if (!tamam) return
    }
    setKapatiliyor(true)
    const { data, error } = await supabase
      .from('orders')
      .update({ paid: true, status: 'teslim' })
      .in('id', siparisler.map((o) => o.id))
      .select('id')
    setKapatiliyor(false)
    if (error) return goster(hataMesaji(error), 'hata')
    if (!data?.length) return goster(YETKI_YOK, 'hata')
    goster(`${masa.name} hesabı kapatıldı: ${tl(toplam)}`)
    yenileSiparis()
    kapat()
  }

  return (
    <Modal
      acik={!!masa}
      kapat={kapat}
      baslik={`${masa?.name} – Hesap`}
      alt={
        <>
          <Buton tur="ikincil" onClick={kapat}>Kapat</Buton>
          {kasa && <Buton tur="basari" ikon={Receipt} yukleniyor={kapatiliyor} onClick={hesabiKapat}>Ödendi, hesabı kapat</Buton>}
        </>
      }
    >
      <table className="w-full text-left">
        <thead className="text-sm text-stone-600">
          <tr><th className="pb-2 font-semibold">Ürün</th><th className="pb-2 text-center font-semibold">Adet</th><th className="pb-2 text-right font-semibold">Tutar</th></tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {kalemler.map((k) => (
            <tr key={`${k.ad}${k.fiyat}`}>
              <td className="py-2 font-medium">{k.ad}</td>
              <td className="py-2 text-center">{k.adet}</td>
              <td className="py-2 text-right">{tl(k.fiyat * k.adet)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-stone-200 text-lg">
            <td className="pt-3 font-bold" colSpan={2}>Toplam</td>
            <td className="pt-3 text-right font-bold">{tl(toplam)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {siparisler.map((o) => (
          <Rozet key={o.id} className={DURUMLAR[o.status].renk}>Sipariş {o.order_no}: {DURUMLAR[o.status].ad}</Rozet>
        ))}
      </div>
      {!kasa && <p className="mt-4 text-sm text-stone-600">Hesabı kasiyer ya da restoran sahibi kapatabilir.</p>}
    </Modal>
  )
}
