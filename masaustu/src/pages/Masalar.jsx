import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, QrCode, Pencil, Trash2, ReceiptTurkishLira as Receipt, Printer, LayoutGrid, AlertTriangle, ExternalLink } from 'lucide-react'
import { useVeri, menuAdresi } from '../hooks/useVeri'
import { supabase, hataMesaji } from '../lib/supabase'
import { DURUMLAR, tl } from '../lib/format'
import { Alan, Bos, Buton, IkonButon, Modal, Rozet, SayfaBasligi, girdiSinifi, useUyari } from '../components/ui'
import QrKod from '../components/QrKod'

export default function Masalar({ siparisler, yenileSiparis }) {
  const { masalar, ayarlar, yenile } = useVeri()
  const { goster, sor } = useUyari()
  const [duzenlenen, setDuzenlenen] = useState(null) // null | {} (yeni) | masa
  const [qrMasa, setQrMasa] = useState(null)
  const [hesapMasa, setHesapMasa] = useState(null)
  const [topluQr, setTopluQr] = useState(false)

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

  async function sil(masa) {
    const tamam = await sor({ baslik: `${masa.name} silinsin mi?`, mesaj: 'Bu masanın QR kodu artık çalışmaz. Geçmiş siparişler raporlarda kalır.', evet: 'Sil', tehlikeli: true })
    if (!tamam) return
    const { error } = await supabase.from('cafe_tables').delete().eq('id', masa.id)
    if (error) return goster(hataMesaji(error), 'hata')
    goster(`${masa.name} silindi`)
    yenile()
  }

  return (
    <>
      <SayfaBasligi baslik="Masalar & Hesap" aciklama="Açık hesapları gör, hesap kapat, masa QR kodlarını yazdır.">
        <Buton tur="ikincil" ikon={Printer} onClick={() => setTopluQr(true)} disabled={!masalar.length}>Tüm QR'ları yazdır</Buton>
        <Buton ikon={Plus} onClick={() => setDuzenlenen({})}>Masa ekle</Buton>
      </SayfaBasligi>

      {!ayarlar.menu_url && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>QR kodların çalışması için <strong>Ayarlar</strong> sayfasından QR menü adresini girmen gerekiyor.</p>
        </div>
      )}

      {masalar.length === 0 ? (
        <Bos ikon={LayoutGrid} baslik="Henüz masa yok" aciklama="Masa ekleyince her masa için ayrı bir QR kod oluşur.">
          <Buton ikon={Plus} className="mt-2" onClick={() => setDuzenlenen({})}>Masa ekle</Buton>
        </Bos>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {masalar.map((m) => {
            const acik = acikHesaplar.get(m.id) ?? []
            const toplam = acik.reduce((t, o) => t + Number(o.total), 0)
            return (
              <article key={m.id} className={`flex flex-col rounded-xl p-4 shadow-sm ring-1 ${acik.length ? 'bg-brand-50 ring-brand-200' : 'bg-white ring-stone-200'} ${m.active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{m.name}</h2>
                    <p className="text-sm text-stone-600">{acik.length ? `${acik.length} açık sipariş` : m.active ? 'Boş' : 'Pasif'}</p>
                  </div>
                  <div className="flex">
                    <IkonButon etiket="QR kodu göster" ikon={QrCode} onClick={() => setQrMasa(m)} />
                    <IkonButon etiket="Düzenle" ikon={Pencil} onClick={() => setDuzenlenen(m)} />
                    <IkonButon etiket="Sil" ikon={Trash2} onClick={() => sil(m)} className="hover:text-red-700" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold">{tl(toplam)}</p>
                <Buton tur={acik.length ? 'ana' : 'ikincil'} ikon={Receipt} className="mt-3" disabled={!acik.length} onClick={() => setHesapMasa(m)}>
                  Hesap
                </Buton>
              </article>
            )
          })}
        </div>
      )}

      <MasaFormu masa={duzenlenen} kapat={() => setDuzenlenen(null)} kaydedildi={yenile} />
      <Modal acik={!!qrMasa} kapat={() => setQrMasa(null)} baslik={`${qrMasa?.name} – QR kod`}>
        {qrMasa && <QrDetay masa={qrMasa} menuUrl={ayarlar.menu_url} />}
      </Modal>
      <HesapPenceresi masa={hesapMasa} siparisler={hesapMasa ? acikHesaplar.get(hesapMasa.id) ?? [] : []} kapat={() => setHesapMasa(null)} yenileSiparis={yenileSiparis} />
      <TopluQr acik={topluQr} kapat={() => setTopluQr(false)} masalar={masalar.filter((m) => m.active)} ayarlar={ayarlar} />
    </>
  )
}

function MasaFormu({ masa, kapat, kaydedildi }) {
  const { goster } = useUyari()
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
      ? await supabase.from('cafe_tables').update(kayit).eq('id', masa.id)
      : await supabase.from('cafe_tables').insert(kayit)
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
          Aktif (kapalıysa bu masadan QR ile sipariş verilemez)
        </label>
      </form>
    </Modal>
  )
}

function QrDetay({ masa, menuUrl }) {
  const adres = menuAdresi(menuUrl, masa.code)
  if (!adres) return <p className="text-stone-700">Önce Ayarlar sayfasından QR menü adresini gir.</p>
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <QrKod adres={adres} boyut={260} />
      <p className="break-all text-sm text-stone-600">{adres}</p>
      <a href={adres} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-800 hover:underline">
        Menüyü tarayıcıda aç <ExternalLink className="size-4" aria-hidden />
      </a>
    </div>
  )
}

function HesapPenceresi({ masa, siparisler, kapat, yenileSiparis }) {
  const { goster, sor } = useUyari()
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
    const { error } = await supabase
      .from('orders')
      .update({ paid: true, status: 'teslim' })
      .in('id', siparisler.map((o) => o.id))
    setKapatiliyor(false)
    if (error) return goster(hataMesaji(error), 'hata')
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
          <Buton tur="basari" ikon={Receipt} yukleniyor={kapatiliyor} onClick={hesabiKapat}>Ödendi, hesabı kapat</Buton>
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
    </Modal>
  )
}

function TopluQr({ acik, kapat, masalar, ayarlar }) {
  const kartlar = (boyut) =>
    masalar.map((m) => (
      <div key={m.id} className="flex break-inside-avoid flex-col items-center gap-2 rounded-xl border border-stone-300 p-4 text-center">
        <p className="text-sm font-semibold text-stone-600">{ayarlar.cafe_name}</p>
        <QrKod adres={menuAdresi(ayarlar.menu_url, m.code)} boyut={boyut} />
        <p className="text-xl font-bold">{m.name}</p>
        <p className="text-xs text-stone-600">Okut, menüyü gör, sipariş ver</p>
      </div>
    ))

  return (
    <Modal acik={acik} kapat={kapat} genis baslik="Tüm masaların QR kodları" alt={<Buton ikon={Printer} onClick={() => window.print()} disabled={!ayarlar.menu_url}>Yazdır</Buton>}>
      {!ayarlar.menu_url ? (
        <p className="text-stone-700">Önce Ayarlar sayfasından QR menü adresini gir.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">{kartlar(160)}</div>
          {acik && createPortal(<div className="yazdir-sayfa"><div className="grid grid-cols-3 gap-4">{kartlar(170)}</div></div>, document.body)}
        </>
      )}
    </Modal>
  )
}
