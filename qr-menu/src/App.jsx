import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Minus, ShoppingBag, X, Loader2, CheckCircle2, ChefHat, Clock, BellRing, AlertCircle, RotateCw } from 'lucide-react'
import { masaGetir, menuGetir, siparisVer, siparisDurumu } from './lib/api'

const para = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 2 })
const tl = (n) => para.format(Number(n) || 0)

const DURUM = {
  yeni: { ad: 'Alındı', ikon: Clock, renk: 'bg-sky-50 text-sky-900' },
  hazirlaniyor: { ad: 'Hazırlanıyor', ikon: ChefHat, renk: 'bg-amber-50 text-amber-900' },
  hazir: { ad: 'Hazır, geliyor', ikon: BellRing, renk: 'bg-fistik-acik text-fistik-koyu' },
  teslim: { ad: 'Teslim edildi', ikon: CheckCircle2, renk: 'bg-stone-100 text-stone-700' },
  iptal: { ad: 'İptal edildi', ikon: X, renk: 'bg-red-50 text-red-800' },
}

/* ---- Bu telefondan verilen siparişleri hatırla (12 saat) ---- */
const depoAnahtari = (kod) => `siparislerim:${kod}`
function siparisleriOku(kod) {
  try {
    const l = JSON.parse(localStorage.getItem(depoAnahtari(kod)) || '[]')
    return l.filter((s) => Date.now() - s.zaman < 12 * 3600_000)
  } catch {
    return []
  }
}
function siparisleriYaz(kod, l) {
  try {
    localStorage.setItem(depoAnahtari(kod), JSON.stringify(l))
  } catch { /* depolama kapalıysa sorun değil */ }
}

export default function App() {
  const kod = useMemo(() => new URLSearchParams(location.search).get('masa') || '', [])
  const [durum, setDurum] = useState('yukleniyor') // yukleniyor | hazir | gecersiz | hata
  const [hata, setHata] = useState('')
  const [masa, setMasa] = useState(null)
  const [menu, setMenu] = useState(null)
  const [sepet, setSepet] = useState({}) // urunId -> adet
  const [sepetAcik, setSepetAcik] = useState(false)
  const [detay, setDetay] = useState(null) // açık ürün
  const [siparislerim, setSiparislerim] = useState(() => siparisleriOku(kod))

  const yukle = useCallback(async () => {
    if (!kod) return setDurum('gecersiz')
    setDurum('yukleniyor')
    try {
      const [m, mn] = await Promise.all([masaGetir(kod), menuGetir()])
      if (!m) return setDurum('gecersiz')
      setMasa(m)
      setMenu(mn)
      document.title = mn.ayar.cafe_name || 'Menü'
      setDurum('hazir')
    } catch (e) {
      setHata(e.message)
      setDurum('hata')
    }
  }, [kod])

  useEffect(() => {
    yukle()
  }, [yukle])

  const urunMap = useMemo(() => new Map(menu?.urunler.map((u) => [u.id, u]) ?? []), [menu])
  const sepetListesi = Object.entries(sepet)
    .map(([id, adet]) => ({ urun: urunMap.get(Number(id)), adet }))
    .filter((s) => s.urun && s.adet > 0)
  const sepetAdet = sepetListesi.reduce((t, s) => t + s.adet, 0)
  const sepetToplam = sepetListesi.reduce((t, s) => t + s.adet * s.urun.price, 0)

  const adetDegistir = useCallback((id, fark) => {
    setSepet((s) => {
      const yeni = Math.max(0, Math.min(50, (s[id] || 0) + fark))
      const k = { ...s }
      if (yeni) k[id] = yeni
      else delete k[id]
      return k
    })
  }, [])

  const sepetiKapat = useCallback(() => setSepetAcik(false), [])
  const detayiKapat = useCallback(() => setDetay(null), [])

  function siparisEklendi(s) {
    const l = [{ ...s, zaman: Date.now() }, ...siparislerim]
    setSiparislerim(l)
    siparisleriYaz(kod, l)
    setSepet({})
    setSepetAcik(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (durum === 'yukleniyor') return <Iskelet />
  if (durum === 'gecersiz')
    return <TamEkran baslik="Bu QR kod çalışmıyor" metin="Masadaki QR kodu tekrar okutun. Yine açılmazsa garsondan yardım isteyin." />
  if (durum === 'hata')
    return (
      <TamEkran baslik="Menü açılamadı" metin={hata}>
        <button onClick={yukle} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-fistik px-6 font-semibold text-white hover:bg-fistik-koyu">
          <RotateCw className="size-5" aria-hidden /> Tekrar dene
        </button>
      </TamEkran>
    )

  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-32">
      <header className="px-5 pt-10 pb-5">
        <h1 className="text-[2.75rem] leading-[0.95] font-extrabold tracking-[-0.035em] text-balance" style={{ fontVariationSettings: "'opsz' 96" }}>
          {menu.ayar.cafe_name || 'Menü'}
        </h1>
        <p className="mt-3 text-lg text-gri">
          <span className="font-semibold text-murekkep">{masa.name}</span> için sipariş
        </p>
      </header>

      <Siparislerim liste={siparislerim} />

      <Vitrin menu={menu} sepet={sepet} adetDegistir={adetDegistir} ac={setDetay} />

      {sepetAdet > 0 && !sepetAcik && !detay && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => setSepetAcik(true)}
            className="flex h-16 w-full items-center gap-3 rounded-full bg-fistik pr-6 pl-2 text-white shadow-[0_8px_24px_rgb(20_33_61/0.25)] transition-colors duration-150 hover:bg-fistik-koyu"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-white text-lg font-bold text-fistik" aria-label={`${sepetAdet} ürün`}>
              {sepetAdet}
            </span>
            <span className="flex-1 text-left text-lg font-semibold">Sepeti gör</span>
            <span className="text-lg font-bold tabular-nums">{tl(sepetToplam)}</span>
          </button>
        </div>
      )}

      {detay && <UrunDetay u={detay} adet={sepet[detay.id] || 0} adetDegistir={adetDegistir} kapat={detayiKapat} />}

      {sepetAcik && (
        <Sepet kod={kod} liste={sepetListesi} toplam={sepetToplam} adetDegistir={adetDegistir} kapat={sepetiKapat} tamamlandi={siparisEklendi} />
      )}
    </div>
  )
}

/* ---------------- Vitrin ---------------- */

function Vitrin({ menu, sepet, adetDegistir, ac }) {
  const kategoriler = useMemo(
    () => menu.kategoriler.map((k) => ({ ...k, urunler: menu.urunler.filter((u) => u.category_id === k.id) })).filter((k) => k.urunler.length),
    [menu]
  )
  const [aktif, setAktif] = useState(kategoriler[0]?.id)
  const sekmeRef = useRef(null)
  // Sekmeye basınca yapılan otomatik kaydırma sürerken, kaydırma takibi aktif sekmeyi değiştirmesin
  const kilit = useRef(0)

  // Kaydırdıkça aktif kategoriyi bul: üst kenarı sekmelerin altına geçmiş son bölüm
  useEffect(() => {
    let kare = 0
    const hesapla = () => {
      kare = 0
      if (Date.now() < kilit.current) return
      const bolumler = document.querySelectorAll('[data-kategori]')
      const sinir = (sekmeRef.current?.offsetHeight ?? 56) + 24
      let secilen = bolumler[0]
      for (const el of bolumler) if (el.getBoundingClientRect().top <= sinir) secilen = el
      if (secilen) setAktif(Number(secilen.dataset.id))
    }
    const dinle = () => { if (!kare) kare = requestAnimationFrame(hesapla) }
    hesapla()
    window.addEventListener('scroll', dinle, { passive: true })
    return () => {
      window.removeEventListener('scroll', dinle)
      cancelAnimationFrame(kare)
    }
  }, [kategoriler])

  // Aktif sekmeyi şeritte ortala. Sadece şeridi YATAY kaydırır;
  // scrollIntoView kullanmıyoruz çünkü sayfayı da dikey kaydırıp kullanıcının kaydırmasıyla çakışıyordu.
  useEffect(() => {
    const serit = sekmeRef.current
    const sekme = serit?.querySelector(`[data-sekme="${aktif}"]`)
    if (!serit || !sekme) return
    serit.scrollTo({ left: sekme.offsetLeft - (serit.clientWidth - sekme.offsetWidth) / 2, behavior: 'smooth' })
  }, [aktif])

  function kategoriyeGit(id) {
    const bolum = document.getElementById(`k-${id}`)
    if (!bolum) return
    setAktif(id)
    kilit.current = Date.now() + 900
    const hedef = bolum.getBoundingClientRect().top + window.scrollY - (sekmeRef.current?.offsetHeight ?? 56) + 1
    window.scrollTo({ top: hedef, behavior: 'smooth' })
  }

  if (!kategoriler.length) return <p className="px-5 py-16 text-center text-gri">Menü henüz hazır değil. Siparişinizi garsona verebilirsiniz.</p>

  return (
    <>
      <nav ref={sekmeRef} className="kaydirma-gizli sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-cizgi bg-white/95 px-3 backdrop-blur" aria-label="Kategoriler">
        {kategoriler.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => kategoriyeGit(k.id)}
            data-sekme={k.id}
            aria-current={aktif === k.id ? 'true' : undefined}
            className={`relative flex h-14 shrink-0 items-center px-3 text-[17px] whitespace-nowrap transition-colors duration-150 ${
              aktif === k.id ? 'font-bold text-murekkep' : 'font-medium text-gri hover:text-murekkep'
            }`}
          >
            {k.name}
            <span className={`absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-fistik transition-opacity duration-150 ${aktif === k.id ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
          </button>
        ))}
      </nav>

      {kategoriler.map((k, i) => (
        <section
          key={k.id}
          id={`k-${k.id}`}
          data-kategori
          data-id={k.id}
          className="px-4 pt-8"
          style={i === kategoriler.length - 1 ? { minHeight: 'calc(100dvh - 3.5rem)' } : undefined}
          aria-labelledby={`b-${k.id}`}
        >
          <h2 id={`b-${k.id}`} className="mb-4 px-1 text-2xl font-bold tracking-[-0.02em]">{k.name}</h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
            {k.urunler.map((u) => (
              <UrunKarti key={u.id} u={u} adet={sepet[u.id] || 0} adetDegistir={adetDegistir} ac={ac} />
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

function Foto({ u, className = '', buyuk }) {
  const [hatali, setHatali] = useState(false)
  if (u.image_url && !hatali) {
    return (
      <img
        src={u.image_url}
        alt={u.name}
        loading={buyuk ? 'eager' : 'lazy'}
        decoding="async"
        width="600"
        height="600"
        onError={() => setHatali(true)}
        className={`aspect-square w-full bg-fistik-acik object-cover ${className}`}
      />
    )
  }
  // Fotoğrafı olmayan ürün: açık fıstık zemin üzerinde büyük baş harf
  return (
    <div className={`flex aspect-square w-full items-center justify-center bg-fistik-acik ${className}`} aria-hidden>
      <span className={`font-extrabold text-fistik/70 ${buyuk ? 'text-9xl' : 'text-6xl'}`} style={{ fontVariationSettings: "'opsz' 96" }}>
        {u.name.trim().charAt(0).toLocaleUpperCase('tr-TR')}
      </span>
    </div>
  )
}

const UrunKarti = memo(function UrunKarti({ u, adet, adetDegistir, ac }) {
  return (
    <li className="flex flex-col">
      <div className="relative">
        <button onClick={() => ac(u)} className="block w-full overflow-hidden rounded-2xl" aria-label={`${u.name} ayrıntıları`}>
          <Foto u={u} />
        </button>
        <div className="absolute right-2 bottom-2">
          <Sayac adet={adet} ad={u.name} azalt={() => adetDegistir(u.id, -1)} artir={() => adetDegistir(u.id, 1)} kucuk />
        </div>
      </div>
      <button onClick={() => ac(u)} className="mt-2.5 px-1 text-left">
        <span className="block text-[17px] leading-snug font-semibold">{u.name}</span>
        <span className="mt-0.5 block text-[17px] font-medium text-gri tabular-nums">{tl(u.price)}</span>
      </button>
    </li>
  )
})

function Sayac({ adet, ad, azalt, artir, kucuk }) {
  if (!adet)
    return (
      <button
        onClick={artir}
        aria-label={`${ad} sepete ekle`}
        className={`flex items-center justify-center rounded-full bg-white text-fistik shadow-[0_2px_8px_rgb(20_33_61/0.18)] transition-colors duration-150 hover:bg-fistik hover:text-white ${kucuk ? 'size-11' : 'h-12 gap-2 px-5 font-semibold'}`}
      >
        <Plus className="size-5" strokeWidth={2.5} aria-hidden />
        {!kucuk && 'Ekle'}
      </button>
    )
  return (
    <div className={`flex items-center rounded-full bg-fistik text-white shadow-[0_2px_8px_rgb(20_33_61/0.18)] ${kucuk ? 'h-11' : 'h-12'}`}>
      <button onClick={azalt} aria-label={`${ad} azalt`} className="flex size-11 items-center justify-center rounded-full hover:bg-fistik-koyu">
        <Minus className="size-5" strokeWidth={2.5} aria-hidden />
      </button>
      <span className="min-w-5 text-center text-lg font-bold tabular-nums" aria-live="polite">{adet}</span>
      <button onClick={artir} aria-label={`${ad} artır`} className="flex size-11 items-center justify-center rounded-full hover:bg-fistik-koyu">
        <Plus className="size-5" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
}

/* ---------------- Alt pencere (detay ve sepet ortak) ---------------- */

function AltPencere({ etiket, kapat, children }) {
  const kapatRef = useRef(kapat)
  kapatRef.current = kapat
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && kapatRef.current()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [])
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-murekkep/50" onClick={(e) => e.target === e.currentTarget && kapat()}>
      <div role="dialog" aria-modal="true" aria-label={etiket} className="alt-pencere relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white">
        {children}
      </div>
    </div>
  )
}

function KapatButonu({ kapat, ustte }) {
  return (
    <button
      onClick={kapat}
      aria-label="Kapat"
      className={`flex size-11 items-center justify-center rounded-full ${ustte ? 'absolute top-3 right-3 z-10 bg-white/90 shadow-sm backdrop-blur' : 'hover:bg-stone-100'}`}
    >
      <X className="size-6" aria-hidden />
    </button>
  )
}

function UrunDetay({ u, adet, adetDegistir, kapat }) {
  return (
    <AltPencere etiket={u.name} kapat={kapat}>
      <KapatButonu kapat={kapat} ustte />
      <div className="overflow-y-auto">
        <Foto u={u} buyuk className="max-h-[55dvh]" />
        <div className="px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <h2 className="text-3xl leading-tight font-bold tracking-[-0.025em]">{u.name}</h2>
          <p className="mt-1 text-xl font-medium text-gri tabular-nums">{tl(u.price)}</p>
          {u.description && <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-gri">{u.description}</p>}
          <div className="mt-6 flex items-center gap-3">
            {adet > 0 ? (
              <>
                <Sayac adet={adet} ad={u.name} azalt={() => adetDegistir(u.id, -1)} artir={() => adetDegistir(u.id, 1)} />
                <button onClick={kapat} className="h-12 flex-1 rounded-full border-2 border-fistik font-semibold text-fistik hover:bg-fistik-acik">
                  Menüye dön
                </button>
              </>
            ) : (
              <button
                onClick={() => { adetDegistir(u.id, 1); kapat() }}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-fistik text-lg font-semibold text-white hover:bg-fistik-koyu"
              >
                <Plus className="size-5" strokeWidth={2.5} aria-hidden /> Sepete ekle
              </button>
            )}
          </div>
        </div>
      </div>
    </AltPencere>
  )
}

function Sepet({ kod, liste, toplam, adetDegistir, kapat, tamamlandi }) {
  const [not, setNot] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    if (!liste.length) kapat()
  }, [liste.length, kapat])

  async function gonder() {
    setGonderiliyor(true)
    setHata('')
    try {
      const s = await siparisVer(kod, liste.map((x) => ({ product_id: x.urun.id, quantity: x.adet })), not.trim())
      tamamlandi({ id: s.order_id, no: s.order_no })
    } catch (e) {
      setHata(e.message)
      setGonderiliyor(false)
    }
  }

  return (
    <AltPencere etiket="Sepetim" kapat={kapat}>
      <div className="flex items-center justify-between px-6 pt-5 pb-2">
        <h2 className="text-2xl font-bold tracking-[-0.02em]">Sepetim</h2>
        <KapatButonu kapat={kapat} />
      </div>

      <ul className="flex-1 overflow-y-auto px-6">
        {liste.map(({ urun, adet }) => (
          <li key={urun.id} className="flex items-center gap-3 border-b border-cizgi py-3 last:border-0">
            <div className="w-14 shrink-0 overflow-hidden rounded-xl">
              <Foto u={urun} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{urun.name}</p>
              <p className="text-gri tabular-nums">{tl(urun.price * adet)}</p>
            </div>
            <Sayac adet={adet} ad={urun.name} azalt={() => adetDegistir(urun.id, -1)} artir={() => adetDegistir(urun.id, 1)} kucuk />
          </li>
        ))}
      </ul>

      <div className="border-t border-cizgi px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <label htmlFor="not" className="font-semibold">
          Not <span className="font-normal text-gri">(isteğe bağlı)</span>
        </label>
        <textarea
          id="not"
          rows={2}
          maxLength={300}
          value={not}
          onChange={(e) => setNot(e.target.value)}
          placeholder="Örneğin: kahve şekersiz olsun"
          className="mt-1.5 w-full resize-none rounded-2xl border border-cizgi bg-stone-50 p-3 text-base placeholder:text-gri/80 focus:border-fistik focus:bg-white focus:ring-2 focus:ring-fistik-acik focus:outline-none"
        />
        {hata && (
          <p role="alert" className="mt-2 flex items-start gap-2 rounded-2xl bg-red-50 p-3 font-medium text-nar">
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden /> {hata}
          </p>
        )}
        <button
          onClick={gonder}
          disabled={gonderiliyor}
          className="mt-3 flex h-14 w-full items-center justify-between rounded-full bg-fistik px-6 text-lg font-semibold text-white transition-colors duration-150 hover:bg-fistik-koyu disabled:opacity-60"
        >
          <span className="flex items-center gap-2">
            {gonderiliyor && <Loader2 className="size-5 animate-spin" aria-hidden />}
            {gonderiliyor ? 'Gönderiliyor' : 'Siparişi gönder'}
          </span>
          <span className="font-bold tabular-nums">{tl(toplam)}</span>
        </button>
        <p className="mt-2.5 text-center text-sm text-gri">Ödemeyi kasada ya da garsona yapabilirsiniz.</p>
      </div>
    </AltPencere>
  )
}

/* ---------------- Sipariş takibi ---------------- */

function Siparislerim({ liste }) {
  const [durumlar, setDurumlar] = useState({})

  useEffect(() => {
    if (!liste.length) return
    let iptal = false
    async function kontrol() {
      if (document.hidden) return
      const sonuc = await Promise.all(liste.map((s) => siparisDurumu(s.id).catch(() => null)))
      if (iptal) return
      setDurumlar(Object.fromEntries(liste.map((s, i) => [s.id, sonuc[i]])))
    }
    kontrol()
    const t = setInterval(kontrol, 8000)
    document.addEventListener('visibilitychange', kontrol)
    return () => {
      iptal = true
      clearInterval(t)
      document.removeEventListener('visibilitychange', kontrol)
    }
  }, [liste])

  if (!liste.length) return null
  const yeniGeldi = Date.now() - liste[0].zaman < 15000

  return (
    <section className="mx-4 mb-6 rounded-3xl bg-fistik-acik p-5" aria-label="Siparişlerim" aria-live="polite">
      {yeniGeldi ? (
        <p className="flex items-center gap-2 text-lg font-bold text-fistik-koyu">
          <CheckCircle2 className="size-6 shrink-0" aria-hidden /> Siparişiniz mutfağa iletildi
        </p>
      ) : (
        <h2 className="text-lg font-bold">Siparişleriniz</h2>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {liste.map((s) => {
          const d = DURUM[durumlar[s.id]?.status] ?? DURUM.yeni
          const Ikon = d.ikon
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
              <div>
                <p className="font-semibold">Sipariş {s.no}</p>
                {durumlar[s.id] && <p className="text-sm text-gri tabular-nums">{tl(durumlar[s.id].total)}</p>}
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${d.renk}`}>
                <Ikon className="size-4" aria-hidden /> {d.ad}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ---------------- Yardımcı ekranlar ---------------- */

function TamEkran({ baslik, metin, children }) {
  return (
    <div className="flex min-h-dvh flex-col justify-center px-8">
      <AlertCircle className="size-10 text-nar" aria-hidden />
      <h1 className="mt-4 text-4xl leading-tight font-extrabold tracking-[-0.03em]">{baslik}</h1>
      <p className="mt-3 max-w-sm text-lg text-gri">{metin}</p>
      {children && <div>{children}</div>}
    </div>
  )
}

function Iskelet() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse px-5 pt-10" aria-label="Menü yükleniyor">
      <div className="h-11 w-60 rounded-xl bg-stone-100" />
      <div className="mt-4 h-5 w-32 rounded bg-stone-100" />
      <div className="mt-10 grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="aspect-square rounded-2xl bg-stone-100" />
            <div className="mt-3 h-4 w-3/4 rounded bg-stone-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
