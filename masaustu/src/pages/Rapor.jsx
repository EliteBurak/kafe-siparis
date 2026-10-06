import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react'
import { supabase, hataMesaji } from '../lib/supabase'
import { tl } from '../lib/format'
import { Bos, IkonButon, SayfaBasligi, girdiSinifi, useUyari } from '../components/ui'

const gunMetni = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function Rapor() {
  const { goster } = useUyari()
  const [gun, setGun] = useState(() => gunMetni(new Date()))
  const [siparisler, setSiparisler] = useState(null)

  useEffect(() => {
    let iptal = false
    setSiparisler(null)
    const bas = new Date(`${gun}T00:00:00`)
    const bit = new Date(bas)
    bit.setDate(bit.getDate() + 1)
    supabase
      .from('orders')
      .select('id, status, paid, total, created_at, order_items(product_name, quantity, unit_price)')
      .gte('created_at', bas.toISOString())
      .lt('created_at', bit.toISOString())
      .then(({ data, error }) => {
        if (iptal) return
        if (error) goster(hataMesaji(error), 'hata')
        setSiparisler(data ?? [])
      })
    return () => { iptal = true }
  }, [gun, goster])

  const ozet = useMemo(() => {
    if (!siparisler) return null
    const gecerli = siparisler.filter((o) => o.status !== 'iptal')
    const ciro = gecerli.reduce((t, o) => t + Number(o.total), 0)
    const tahsil = gecerli.filter((o) => o.paid).reduce((t, o) => t + Number(o.total), 0)
    const saatler = new Array(24).fill(0)
    const urunler = new Map()
    for (const o of gecerli) {
      saatler[new Date(o.created_at).getHours()] += Number(o.total)
      for (const k of o.order_items) {
        const u = urunler.get(k.product_name) ?? { ad: k.product_name, adet: 0, tutar: 0 }
        u.adet += k.quantity
        u.tutar += k.quantity * Number(k.unit_price)
        urunler.set(k.product_name, u)
      }
    }
    return {
      ciro,
      tahsil,
      acik: ciro - tahsil,
      adet: gecerli.length,
      ortalama: gecerli.length ? ciro / gecerli.length : 0,
      iptal: siparisler.length - gecerli.length,
      saatler,
      urunler: [...urunler.values()].sort((a, b) => b.tutar - a.tutar),
    }
  }, [siparisler])

  const kaydir = (n) => {
    const d = new Date(`${gun}T12:00:00`)
    d.setDate(d.getDate() + n)
    setGun(gunMetni(d))
  }

  return (
    <>
      <SayfaBasligi baslik="Rapor" aciklama="Seçilen günün satışları (iptal edilen siparişler hariç).">
        <IkonButon etiket="Önceki gün" ikon={ChevronLeft} onClick={() => kaydir(-1)} />
        <input type="date" aria-label="Gün" value={gun} max={gunMetni(new Date())} onChange={(e) => e.target.value && setGun(e.target.value)} className={`${girdiSinifi} w-44`} />
        <IkonButon etiket="Sonraki gün" ikon={ChevronRight} onClick={() => kaydir(1)} disabled={gun >= gunMetni(new Date())} />
      </SayfaBasligi>

      {/* Sabit yükseklik: veri gelirken sayfa zıplamasın */}
      <div className="grid grid-cols-4 gap-4">
        <Kutu baslik="Toplam ciro" deger={ozet && tl(ozet.ciro)} alt={ozet && `${tl(ozet.tahsil)} tahsil edildi, ${tl(ozet.acik)} açık hesapta`} />
        <Kutu baslik="Sipariş sayısı" deger={ozet?.adet} alt={ozet && (ozet.iptal ? `${ozet.iptal} iptal` : 'İptal yok')} />
        <Kutu baslik="Ortalama sipariş" deger={ozet && tl(ozet.ortalama)} />
        <Kutu baslik="En çok satan" deger={ozet && (ozet.urunler[0]?.ad ?? '–')} alt={ozet?.urunler[0] && `${ozet.urunler[0].adet} adet`} />
      </div>

      {ozet && ozet.adet === 0 ? (
        <div className="mt-6"><Bos ikon={BarChart3} baslik="Bu gün satış yok" /></div>
      ) : (
        <div className="mt-6 grid grid-cols-5 gap-6">
          <section className="col-span-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
            <h2 className="font-bold">Saatlik ciro</h2>
            <p className="mb-4 text-sm text-stone-600">Siparişin verildiği saate göre</p>
            {ozet ? <SaatGrafigi saatler={ozet.saatler} /> : <div className="h-64 animate-pulse rounded-lg bg-stone-100" />}
          </section>
          <section className="col-span-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
            <h2 className="mb-3 font-bold">Ürün satışları</h2>
            {ozet ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-stone-200 text-stone-600">
                  <tr><th className="pb-2 font-semibold">Ürün</th><th className="pb-2 text-right font-semibold">Adet</th><th className="pb-2 text-right font-semibold">Tutar</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {ozet.urunler.map((u) => (
                    <tr key={u.ad}><td className="py-2 font-medium">{u.ad}</td><td className="py-2 text-right tabular-nums">{u.adet}</td><td className="py-2 text-right tabular-nums">{tl(u.tutar)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="h-64 animate-pulse rounded-lg bg-stone-100" />}
          </section>
        </div>
      )}
    </>
  )
}

function Kutu({ baslik, deger, alt }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
      <p className="text-sm font-semibold text-stone-600">{baslik}</p>
      {deger === undefined || deger === null ? (
        <div className="mt-2 h-8 w-28 animate-pulse rounded bg-stone-100" />
      ) : (
        <p className="mt-1 truncate text-3xl font-bold tabular-nums tracking-tight" title={String(deger)}>{deger}</p>
      )}
      <p className="mt-1 min-h-5 text-sm text-stone-600">{alt}</p>
    </div>
  )
}

/** Tek seri çubuk grafik: ince çubuklar, 4px yuvarlak uç, 2px boşluk, üzerine gelince değer. */
function SaatGrafigi({ saatler }) {
  const [hover, setHover] = useState(null)
  const dolu = saatler.map((v, i) => [i, v]).filter(([, v]) => v > 0)
  const ilk = Math.min(dolu[0]?.[0] ?? 8, 8)
  const son = Math.max(dolu.at(-1)?.[0] ?? 22, 22)
  const araliktakiler = saatler.slice(ilk, son + 1)
  const enBuyuk = Math.max(...araliktakiler, 1)
  const H = 220

  return (
    <div className="relative">
      <div className="flex items-end gap-[2px] border-b border-stone-300" style={{ height: H }} role="img" aria-label="Saatlik ciro grafiği; ayrıntı için ürün tablosuna bakın">
        {araliktakiler.map((v, i) => {
          const saat = ilk + i
          return (
            <div
              key={saat}
              className="relative flex h-full flex-1 items-end justify-center"
              onMouseEnter={() => setHover(saat)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={`w-full max-w-7 rounded-t-[4px] transition-colors duration-150 ${hover === saat ? 'bg-brand-800' : 'bg-brand-600'}`}
                style={{ height: v ? Math.max(3, (v / enBuyuk) * (H - 24)) : 0 }}
              />
              {hover === saat && (
                <div
                  className="pointer-events-none absolute z-10 mb-1.5 rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
                  style={{ bottom: (v ? Math.max(3, (v / enBuyuk) * (H - 24)) : 0) + 6 }}
                >
                  <span className="font-semibold">{String(saat).padStart(2, '0')}:00–{String(saat + 1).padStart(2, '0')}:00</span>
                  <br />
                  {tl(v)}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px] text-xs text-stone-600">
        {araliktakiler.map((_, i) => (
          <span key={i} className="flex-1 text-center tabular-nums">{(ilk + i) % 2 === 0 ? String(ilk + i).padStart(2, '0') : ''}</span>
        ))}
      </div>
    </div>
  )
}
