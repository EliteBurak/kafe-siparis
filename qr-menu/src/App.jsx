import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Minus, ShoppingBag, X, Loader2, CheckCircle2, ChefHat, Clock, Bell, AlertCircle, MapPin, RotateCw } from 'lucide-react'
import { masaGetir, menuGetir, siparisVer, siparisDurumu } from './lib/api'

const para = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
const tl = (n) => para.format(Number(n) || 0)

const DURUM = {
  yeni: { ad: 'Alındı', ikon: Clock, renk: 'bg-blue-50 text-blue-800' },
  hazirlaniyor: { ad: 'Hazırlanıyor', ikon: ChefHat, renk: 'bg-amber-50 text-amber-900' },
  hazir: { ad: 'Hazır, geliyor', ikon: Bell, renk: 'bg-green-50 text-green-800' },
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
  const [siparislerim, setSiparislerim] = useState(() => siparisleriOku(kod))

  const yukle = useCallback(async () => {
    if (!kod) return setDurum('gecersiz')
    setDurum('yukleniyor')
    try {
      const [m, mn] = await Promise.all([masaGetir(kod), menuGetir()])
      if (!m) return setDurum('gecersiz')
      setMasa(m)
      setMenu(mn)
      document.title = mn.ayar.cafe_name ? `${mn.ayar.cafe_name} – Menü` : 'Menü'
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
    return <TamEkran ikon={AlertCircle} baslik="QR kod geçersiz" metin="Lütfen masadaki QR kodu tekrar okut ya da garsondan yardım iste." />
  if (durum === 'hata')
    return (
      <TamEkran ikon={AlertCircle} baslik="Menü yüklenemedi" metin={hata}>
        <button onClick={yukle} className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-brand-700 px-6 font-bold text-white hover:bg-brand-800">
          <RotateCw className="size-5" aria-hidden /> Tekrar dene
        </button>
      </TamEkran>
    )

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-32">
      <header className="px-5 pt-8 pb-4">
        <p className="text-sm font-semibold tracking-wide text-brand-800 uppercase">Hoş geldiniz</p>
        <h1 className="font-display text-4xl leading-tight text-kahve">{menu.ayar.cafe_name || 'Menü'}</h1>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-stone-800 ring-1 ring-brand-200">
          <MapPin className="size-4 text-brand-700" aria-hidden /> {masa.name}
        </p>
      </header>

      <Siparislerim liste={siparislerim} />

      <MenuListesi menu={menu} sepet={sepet} adetDegistir={adetDegistir} />

      {sepetAdet > 0 && !sepetAcik && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => setSepetAcik(true)}
            className="flex h-16 w-full items-center gap-3 rounded-2xl bg-kahve px-5 text-white shadow-xl transition-colors duration-150 hover:bg-brand-900"
          >
            <span className="relative">
              <ShoppingBag className="size-6" aria-hidden />
              <span className="absolute -top-2 -right-2.5 flex size-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold">{sepetAdet}</span>
            </span>
            <span className="flex-1 text-left text-lg font-bold">Sepeti gör</span>
            <span className="text-lg font-bold">{tl(sepetToplam)}</span>
          </button>
        </div>
      )}

      {sepetAcik && (
        <Sepet
          kod={kod}
          liste={sepetListesi}
          toplam={sepetToplam}
          adetDegistir={adetDegistir}
          kapat={sepetiKapat}
          tamamlandi={siparisEklendi}
        />
      )}
    </div>
  )
}

/* ---------------- Menü ---------------- */

function MenuListesi({ menu, sepet, adetDegistir }) {
  const kategoriler = useMemo(
    () => menu.kategoriler.map((k) => ({ ...k, urunler: menu.urunler.filter((u) => u.category_id === k.id) })).filter((k) => k.urunler.length),
    [menu]
  )
  const [aktif, setAktif] = useState(kategoriler[0]?.id)
  const sekmeRef = useRef(null)

  // Kaydırdıkça hangi kategoride olduğumuzu sekmelerde göster:
  // üst kenarı yapışkan sekmelerin altına geçmiş son bölüm aktiftir
  useEffect(() => {
    let kare = 0
    const hesapla = () => {
      kare = 0
      const bolumler = document.querySelectorAll('[data-kategori]')
      let secilen = bolumler[0]
      for (const el of bolumler) if (el.getBoundingClientRect().top <= 140) secilen = el
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

  useEffect(() => {
    sekmeRef.current?.querySelector(`[data-sekme="${aktif}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [aktif])

  if (!kategoriler.length) return <p className="px-5 py-10 text-center text-stone-700">Menü şu an hazırlanıyor.</p>

  return (
    <>
      <nav ref={sekmeRef} className="kaydirma-gizli sticky top-0 z-20 flex gap-2 overflow-x-auto bg-brand-50/95 px-5 py-3 backdrop-blur" aria-label="Kategoriler">
        {kategoriler.map((k) => (
          <a
            key={k.id}
            href={`#k-${k.id}`}
            data-sekme={k.id}
            aria-current={aktif === k.id ? 'true' : undefined}
            className={`flex h-11 shrink-0 items-center rounded-full px-5 font-semibold whitespace-nowrap transition-colors duration-150 ${
              aktif === k.id ? 'bg-kahve text-white' : 'bg-white text-stone-800 ring-1 ring-brand-200 hover:bg-brand-100'
            }`}
          >
            {k.name}
          </a>
        ))}
      </nav>

      {kategoriler.map((k) => (
        <section key={k.id} id={`k-${k.id}`} data-kategori data-id={k.id} className="px-5 pt-6" aria-labelledby={`b-${k.id}`}>
          <h2 id={`b-${k.id}`} className="mb-3 font-display text-2xl text-kahve">{k.name}</h2>
          <ul className="flex flex-col gap-3">
            {k.urunler.map((u) => (
              <UrunKarti key={u.id} u={u} adet={sepet[u.id] || 0} adetDegistir={adetDegistir} />
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

function UrunKarti({ u, adet, adetDegistir }) {
  return (
    <li className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-lg leading-snug font-bold">{u.name}</h3>
        {u.description && <p className="mt-0.5 text-[15px] leading-relaxed text-stone-600">{u.description}</p>}
        <p className="mt-auto pt-2 text-lg font-bold text-brand-800">{tl(u.price)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-3">
        {u.image_url && (
          <img src={u.image_url} alt={u.name} loading="lazy" width="96" height="96" className="size-24 rounded-xl bg-brand-100 object-cover" />
        )}
        <Sayac adet={adet} ad={u.name} azalt={() => adetDegistir(u.id, -1)} artir={() => adetDegistir(u.id, 1)} />
      </div>
    </li>
  )
}

function Sayac({ adet, ad, azalt, artir }) {
  if (!adet)
    return (
      <button onClick={artir} aria-label={`${ad} sepete ekle`} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-brand-700 px-4 font-bold text-white shadow-sm transition-colors duration-150 hover:bg-brand-800">
        <Plus className="size-5" aria-hidden /> Ekle
      </button>
    )
  return (
    <div className="flex h-11 items-center rounded-full bg-brand-100 ring-1 ring-brand-200">
      <button onClick={azalt} aria-label={`${ad} azalt`} className="flex size-11 items-center justify-center rounded-full text-brand-900 hover:bg-brand-200">
        <Minus className="size-5" aria-hidden />
      </button>
      <span className="w-7 text-center text-lg font-bold" aria-live="polite">{adet}</span>
      <button onClick={artir} aria-label={`${ad} artır`} className="flex size-11 items-center justify-center rounded-full text-brand-900 hover:bg-brand-200">
        <Plus className="size-5" aria-hidden />
      </button>
    </div>
  )
}

/* ---------------- Sepet ---------------- */

function Sepet({ kod, liste, toplam, adetDegistir, kapat, tamamlandi }) {
  const [not, setNot] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && kapat()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [kapat])

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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/50" onClick={(e) => e.target === e.currentTarget && kapat()}>
      <div role="dialog" aria-modal="true" aria-label="Sepetim" className="alt-pencere flex max-h-[90dvh] w-full max-w-xl flex-col rounded-t-3xl bg-white">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-display text-2xl text-kahve">Sepetim</h2>
          <button onClick={kapat} aria-label="Kapat" className="flex size-11 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100">
            <X className="size-6" aria-hidden />
          </button>
        </div>

        <ul className="flex-1 divide-y divide-stone-100 overflow-y-auto px-5">
          {liste.map(({ urun, adet }) => (
            <li key={urun.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{urun.name}</p>
                <p className="text-[15px] text-stone-600">{tl(urun.price * adet)}</p>
              </div>
              <Sayac adet={adet} ad={urun.name} azalt={() => adetDegistir(urun.id, -1)} artir={() => adetDegistir(urun.id, 1)} />
            </li>
          ))}
        </ul>

        <div className="border-t border-stone-100 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <label htmlFor="not" className="text-[15px] font-semibold">Not ekle <span className="font-normal text-stone-600">(isteğe bağlı)</span></label>
          <textarea
            id="not"
            rows={2}
            maxLength={300}
            value={not}
            onChange={(e) => setNot(e.target.value)}
            placeholder="Ör. kahve şekersiz olsun"
            className="mt-1.5 w-full resize-none rounded-xl border border-stone-300 p-3 text-base placeholder:text-stone-500 focus:border-brand-700 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          />
          {hata && (
            <p role="alert" className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[15px] font-medium text-red-800">
              <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden /> {hata}
            </p>
          )}
          <button
            onClick={gonder}
            disabled={gonderiliyor}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-700 text-lg font-bold text-white shadow-lg transition-colors duration-150 hover:bg-brand-800 disabled:opacity-60"
          >
            {gonderiliyor ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
            {gonderiliyor ? 'Gönderiliyor…' : `Siparişi ver · ${tl(toplam)}`}
          </button>
          <p className="mt-2 text-center text-sm text-stone-600">Ödemeyi kasada ya da garsona yapabilirsiniz.</p>
        </div>
      </div>
    </div>
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
  const enYeni = liste[0]
  const yeniGeldi = Date.now() - enYeni.zaman < 15000

  return (
    <section className="mx-5 mb-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-100" aria-label="Siparişlerim" aria-live="polite">
      {yeniGeldi && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-green-50 p-3 font-semibold text-green-800">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden /> Siparişiniz alındı, teşekkürler!
        </p>
      )}
      <h2 className="mb-2 font-bold">Siparişlerim</h2>
      <ul className="flex flex-col gap-2">
        {liste.map((s) => {
          const d = DURUM[durumlar[s.id]?.status] ?? DURUM.yeni
          const Ikon = d.ikon
          return (
            <li key={s.id} className="flex items-center justify-between gap-3">
              <span className="font-medium text-stone-700">
                Sipariş #{s.no}
                {durumlar[s.id] && <span className="text-stone-600"> · {tl(durumlar[s.id].total)}</span>}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${d.renk}`}>
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

function TamEkran({ ikon: Ikon, baslik, metin, children }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <Ikon className="size-12 text-brand-700" aria-hidden />
      <h1 className="mt-4 font-display text-3xl text-kahve">{baslik}</h1>
      <p className="mt-2 max-w-sm text-stone-700">{metin}</p>
      {children}
    </div>
  )
}

function Iskelet() {
  return (
    <div className="mx-auto max-w-xl animate-pulse px-5 pt-8" aria-label="Menü yükleniyor">
      <div className="h-4 w-28 rounded bg-brand-200" />
      <div className="mt-3 h-10 w-56 rounded bg-brand-200" />
      <div className="mt-8 flex gap-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-11 w-28 rounded-full bg-white" />)}
      </div>
      {[1, 2, 3, 4].map((i) => <div key={i} className="mt-4 h-28 rounded-2xl bg-white" />)}
    </div>
  )
}
