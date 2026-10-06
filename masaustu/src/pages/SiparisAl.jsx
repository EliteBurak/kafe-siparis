import { useMemo, useState } from 'react'
import { Minus, Plus, Trash2, ShoppingBasket, Send, ChevronUp, X } from 'lucide-react'
import { useVeri } from '../hooks/useVeri'
import { supabase, hataMesaji } from '../lib/supabase'
import { tl } from '../lib/format'
import { Bos, Buton, IkonButon, SayfaBasligi, useUyari } from '../components/ui'

/**
 * Kasiyer, garson veya sahip masaya sipariş girer.
 * Bilgisayarda sepet sağda sabit durur; telefonda altta bir çubuk olur ve dokununca açılır.
 */
export default function SiparisAl({ bitti, baslangicMasa = null }) {
  const { kategoriler, urunler, masalar } = useVeri()
  const { goster } = useUyari()
  const aktifKategoriler = useMemo(() => kategoriler.filter((k) => k.active), [kategoriler])
  const aktifMasalar = useMemo(() => masalar.filter((m) => m.active), [masalar])

  const [masaId, setMasaId] = useState(baslangicMasa)
  const [kategori, setKategori] = useState(null)
  const [sepet, setSepet] = useState([]) // { urun, adet, not }
  const [not, setNot] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [sepetAcik, setSepetAcik] = useState(false) // sadece telefonda

  const seciliKategori = kategori ?? aktifKategoriler[0]?.id
  const gorunen = urunler.filter((u) => u.active && u.category_id === seciliKategori)
  const toplam = sepet.reduce((t, s) => t + s.urun.price * s.adet, 0)
  const adet = sepet.reduce((t, s) => t + s.adet, 0)
  const masa = aktifMasalar.find((m) => m.id === masaId)

  const ekle = (urun) =>
    setSepet((l) => {
      const var_ = l.find((s) => s.urun.id === urun.id && !s.not)
      return var_ ? l.map((s) => (s === var_ ? { ...s, adet: Math.min(50, s.adet + 1) } : s)) : [...l, { urun, adet: 1, not: '' }]
    })
  const degistir = (i, alanlar) => setSepet((l) => l.map((s, j) => (j === i ? { ...s, ...alanlar } : s)))
  const sil = (i) => setSepet((l) => l.filter((_, j) => j !== i))

  async function gonder() {
    if (!masaId) return goster('Önce masa seç.', 'hata')
    setGonderiliyor(true)
    const { data, error } = await supabase.rpc('siparis_olustur', {
      p_masa: masaId,
      p_kalemler: sepet.map((s) => ({ product_id: s.urun.id, quantity: s.adet, note: s.not })),
      p_not: not,
    })
    setGonderiliyor(false)
    if (error) return goster(hataMesaji(error), 'hata')
    goster(`${masa?.name ?? 'Masa'} için sipariş ${data[0].order_no} gönderildi`)
    setSepet([])
    setNot('')
    setSepetAcik(false)
    bitti()
  }

  if (!aktifMasalar.length || !aktifKategoriler.length) {
    return (
      <>
        <SayfaBasligi baslik="Sipariş Al" />
        <Bos
          ikon={ShoppingBasket}
          baslik={!aktifMasalar.length ? 'Henüz masa yok' : 'Menüde ürün yok'}
          aciklama="Restoran sahibinin önce Masalar ve Menü sayfalarından masa ve ürün eklemesi gerekiyor."
        />
      </>
    )
  }

  const sepetIcerigi = (
    <SepetIcerigi
      sepet={sepet}
      not={not}
      setNot={setNot}
      degistir={degistir}
      sil={sil}
      toplam={toplam}
      masa={masa}
      gonderiliyor={gonderiliyor}
      gonder={gonder}
    />
  )

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <SayfaBasligi baslik="Sipariş Al" />

        {/* Masa seçimi */}
        <section aria-labelledby="masa-baslik" className="mb-6">
          <h2 id="masa-baslik" className="mb-2 text-sm font-semibold text-stone-700">Masa</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="masa-baslik">
            {aktifMasalar.map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={m.id === masaId}
                onClick={() => setMasaId(m.id)}
                className={`h-11 min-w-16 rounded-lg px-4 font-semibold transition-colors duration-150 ${
                  m.id === masaId ? 'bg-brand-700 text-white' : 'bg-white text-stone-800 ring-1 ring-stone-300 hover:bg-stone-100'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </section>

        {/* Kategoriler */}
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Kategoriler">
          {aktifKategoriler.map((k) => (
            <button
              key={k.id}
              role="tab"
              aria-selected={k.id === seciliKategori}
              onClick={() => setKategori(k.id)}
              className={`h-11 shrink-0 rounded-full px-5 font-semibold whitespace-nowrap transition-colors duration-150 ${
                k.id === seciliKategori ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100'
              }`}
            >
              {k.name}
            </button>
          ))}
        </div>

        {/* Ürünler */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
          {gorunen.map((u) => {
            const sepette = sepet.filter((s) => s.urun.id === u.id).reduce((t, s) => t + s.adet, 0)
            return (
              <button
                key={u.id}
                onClick={() => ekle(u)}
                className={`relative flex min-h-24 flex-col justify-between rounded-xl p-4 text-left shadow-sm ring-1 transition-colors duration-150 ${
                  sepette ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-stone-200 hover:bg-stone-50'
                }`}
              >
                <span className="font-semibold leading-snug">{u.name}</span>
                <span className="mt-2 font-bold text-brand-800">{tl(u.price)}</span>
                {sepette > 0 && (
                  <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white" aria-label={`Sepette ${sepette}`}>
                    {sepette}
                  </span>
                )}
              </button>
            )
          })}
          {gorunen.length === 0 && <p className="text-stone-600">Bu kategoride satışta ürün yok.</p>}
        </div>
      </div>

      {/* Bilgisayar: sağda sabit sepet */}
      <aside className="sticky top-0 hidden max-h-[calc(100dvh-3.5rem)] w-96 shrink-0 flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 lg:flex" aria-label="Sepet">
        {sepetIcerigi}
      </aside>

      {/* Telefon/tablet: alt çubuk + açılır sepet */}
      {adet > 0 && !sepetAcik && (
        <div className="fixed inset-x-0 bottom-16 z-30 px-3 pb-[env(safe-area-inset-bottom)] lg:hidden">
          <button onClick={() => setSepetAcik(true)} className="flex h-14 w-full items-center gap-3 rounded-xl bg-brand-700 px-4 text-white shadow-lg">
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-800">{adet}</span>
            <span className="flex-1 text-left font-semibold">{masa ? `${masa.name} siparişi` : 'Masa seçilmedi'}</span>
            <span className="font-bold">{tl(toplam)}</span>
            <ChevronUp className="size-5" aria-hidden />
          </button>
        </div>
      )}
      {sepetAcik && (
        <div className="fixed inset-0 z-50 flex items-end bg-stone-900/50 lg:hidden" onClick={(e) => e.target === e.currentTarget && setSepetAcik(false)}>
          <div role="dialog" aria-modal="true" aria-label="Sepet" className="flex max-h-[88dvh] w-full flex-col rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-lg font-bold">Sepet</p>
              <IkonButon etiket="Kapat" ikon={X} onClick={() => setSepetAcik(false)} />
            </div>
            {sepetIcerigi}
          </div>
        </div>
      )}
    </div>
  )
}

function SepetIcerigi({ sepet, not, setNot, degistir, sil, toplam, masa, gonderiliyor, gonder }) {
  return (
    <>
      <p className="text-sm text-stone-600">
        Masa: <strong className="text-stone-900">{masa?.name ?? 'seçilmedi'}</strong>
      </p>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {sepet.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-600">Ürünlere dokunarak sepete ekle.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-stone-100">
            {sepet.map((s, i) => (
              <li key={i} className="py-3">
                <div className="flex items-center gap-1">
                  <span className="min-w-0 flex-1 truncate font-semibold">{s.urun.name}</span>
                  <IkonButon etiket="Azalt" ikon={Minus} onClick={() => (s.adet > 1 ? degistir(i, { adet: s.adet - 1 }) : sil(i))} />
                  <span className="w-6 text-center font-bold" aria-live="polite">{s.adet}</span>
                  <IkonButon etiket="Artır" ikon={Plus} onClick={() => degistir(i, { adet: Math.min(50, s.adet + 1) })} />
                  <IkonButon etiket="Sil" ikon={Trash2} onClick={() => sil(i)} className="hover:text-red-700" />
                </div>
                <input
                  aria-label={`${s.urun.name} için not`}
                  placeholder="Not (ör. acısız)"
                  value={s.not}
                  maxLength={200}
                  onChange={(e) => degistir(i, { not: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-md border border-stone-200 px-2.5 text-base placeholder:text-stone-500 focus:border-brand-600 focus:outline-none sm:h-9 sm:text-sm"
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
        className="mt-3 w-full resize-none rounded-lg border border-stone-300 p-3 text-base placeholder:text-stone-500 focus:border-brand-600 focus:outline-none sm:text-sm"
      />
      <div className="mt-3 flex items-center justify-between text-lg">
        <span className="font-semibold">Toplam</span>
        <span className="font-bold">{tl(toplam)}</span>
      </div>
      <Buton boyut="buyuk" ikon={Send} className="mt-3 w-full" disabled={sepet.length === 0 || !masa} yukleniyor={gonderiliyor} onClick={gonder}>
        Siparişi gönder
      </Buton>
    </>
  )
}
