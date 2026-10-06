import { useMemo, useState } from 'react'
import { Minus, Plus, Trash2, ShoppingBasket, Send } from 'lucide-react'
import { useVeri } from '../hooks/useVeri'
import { supabase, hataMesaji } from '../lib/supabase'
import { tl } from '../lib/format'
import { Bos, Buton, IkonButon, SayfaBasligi, girdiSinifi, useUyari } from '../components/ui'

export default function GarsonSiparis({ bitti }) {
  const { kategoriler, urunler, masalar } = useVeri()
  const { goster } = useUyari()
  const aktifKategoriler = useMemo(() => kategoriler.filter((k) => k.active), [kategoriler])
  const aktifMasalar = useMemo(() => masalar.filter((m) => m.active), [masalar])

  const [masaKod, setMasaKod] = useState('')
  const [kategori, setKategori] = useState(null)
  const [sepet, setSepet] = useState([]) // { urun, adet, not }
  const [not, setNot] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  const seciliKategori = kategori ?? aktifKategoriler[0]?.id
  const gorunen = urunler.filter((u) => u.active && u.category_id === seciliKategori)
  const toplam = sepet.reduce((t, s) => t + s.urun.price * s.adet, 0)

  const ekle = (urun) =>
    setSepet((l) => {
      const var_ = l.find((s) => s.urun.id === urun.id && !s.not)
      return var_ ? l.map((s) => (s === var_ ? { ...s, adet: Math.min(50, s.adet + 1) } : s)) : [...l, { urun, adet: 1, not: '' }]
    })
  const degistir = (i, alanlar) => setSepet((l) => l.map((s, j) => (j === i ? { ...s, ...alanlar } : s)))
  const sil = (i) => setSepet((l) => l.filter((_, j) => j !== i))

  async function gonder() {
    if (!masaKod) return goster('Önce masa seç.', 'hata')
    setGonderiliyor(true)
    const { data, error } = await supabase.rpc('place_order', {
      p_table_code: masaKod,
      p_items: sepet.map((s) => ({ product_id: s.urun.id, quantity: s.adet, note: s.not })),
      p_note: not,
    })
    setGonderiliyor(false)
    if (error) return goster(hataMesaji(error), 'hata')
    goster(`Sipariş #${data[0].order_no} oluşturuldu`)
    setSepet([])
    setNot('')
    bitti()
  }

  if (aktifKategoriler.length === 0) {
    return (
      <>
        <SayfaBasligi baslik="Sipariş Gir" />
        <Bos ikon={ShoppingBasket} baslik="Menüde ürün yok" aciklama="Önce Menü sayfasından kategori ve ürün ekle." />
      </>
    )
  }

  return (
    <div className="flex h-full gap-6">
      <div className="min-w-0 flex-1">
        <SayfaBasligi baslik="Sipariş Gir" aciklama="Garsonun masadan aldığı siparişi buradan gir." />

        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Kategoriler">
          {aktifKategoriler.map((k) => (
            <button
              key={k.id}
              role="tab"
              aria-selected={k.id === seciliKategori}
              onClick={() => setKategori(k.id)}
              className={`h-11 rounded-full px-5 font-semibold transition-colors duration-150 ${
                k.id === seciliKategori ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100'
              }`}
            >
              {k.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {gorunen.map((u) => (
            <button
              key={u.id}
              onClick={() => ekle(u)}
              className="flex min-h-28 flex-col justify-between rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-stone-200 transition-colors duration-150 hover:bg-brand-50 hover:ring-brand-300"
            >
              <span className="font-semibold leading-snug">{u.name}</span>
              <span className="mt-2 font-bold text-brand-800">{tl(u.price)}</span>
            </button>
          ))}
          {gorunen.length === 0 && <p className="text-stone-600">Bu kategoride satışta ürün yok.</p>}
        </div>
      </div>

      <aside className="flex w-96 shrink-0 flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200" aria-label="Sepet">
        <label htmlFor="masa-sec" className="text-sm font-semibold">Masa</label>
        <select id="masa-sec" value={masaKod} onChange={(e) => setMasaKod(e.target.value)} className={`${girdiSinifi} mt-1.5`}>
          <option value="">Masa seç…</option>
          {aktifMasalar.map((m) => (
            <option key={m.id} value={m.code}>{m.name}</option>
          ))}
        </select>

        <div className="mt-4 flex-1 overflow-y-auto">
          {sepet.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-600">Ürünlere tıklayarak sepete ekle.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-stone-100">
              {sepet.map((s, i) => (
                <li key={i} className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-semibold">{s.urun.name}</span>
                    <IkonButon etiket="Azalt" ikon={Minus} onClick={() => (s.adet > 1 ? degistir(i, { adet: s.adet - 1 }) : sil(i))} />
                    <span className="w-6 text-center font-bold" aria-live="polite">{s.adet}</span>
                    <IkonButon etiket="Artır" ikon={Plus} onClick={() => degistir(i, { adet: Math.min(50, s.adet + 1) })} />
                    <IkonButon etiket="Sil" ikon={Trash2} onClick={() => sil(i)} className="hover:text-red-700" />
                  </div>
                  <input
                    aria-label={`${s.urun.name} için not`}
                    placeholder="Not (ör. şekersiz)"
                    value={s.not}
                    maxLength={200}
                    onChange={(e) => degistir(i, { not: e.target.value })}
                    className="mt-1.5 h-9 w-full rounded-md border border-stone-200 px-2.5 text-sm placeholder:text-stone-500 focus:border-brand-600 focus:outline-none"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <textarea
          aria-label="Sipariş notu"
          placeholder="Sipariş notu (isteğe bağlı)"
          value={not}
          maxLength={300}
          onChange={(e) => setNot(e.target.value)}
          rows={2}
          className="mt-3 w-full resize-none rounded-lg border border-stone-300 p-3 text-sm placeholder:text-stone-500 focus:border-brand-600 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between text-lg">
          <span className="font-semibold">Toplam</span>
          <span className="font-bold">{tl(toplam)}</span>
        </div>
        <Buton boyut="buyuk" ikon={Send} className="mt-3 w-full" disabled={sepet.length === 0 || !masaKod} yukleniyor={gonderiliyor} onClick={gonder}>
          Siparişi gönder
        </Buton>
      </aside>
    </div>
  )
}
