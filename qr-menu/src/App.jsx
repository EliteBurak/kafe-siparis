import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, AlertCircle, RotateCw } from 'lucide-react'
import { menuGetir } from './lib/api'

const para = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 2 })
const tl = (n) => para.format(Number(n) || 0)

/**
 * Müşterinin QR kodla açtığı menü. Sadece görüntüleme: sipariş garson veya kasa tarafından alınır.
 * Adres: ...?r=<restoran-kisa-adi>
 */
export default function App() {
  const slug = useMemo(() => new URLSearchParams(location.search).get('r') || '', [])
  const [durum, setDurum] = useState('yukleniyor') // yukleniyor | hazir | gecersiz | hata
  const [hata, setHata] = useState('')
  const [menu, setMenu] = useState(null)
  const [detay, setDetay] = useState(null)

  const yukle = useCallback(async () => {
    if (!slug) return setDurum('gecersiz')
    setDurum('yukleniyor')
    try {
      const m = await menuGetir(slug)
      if (!m) return setDurum('gecersiz')
      setMenu(m)
      document.title = m.restoran.name
      setDurum('hazir')
    } catch (e) {
      setHata(e.message)
      setDurum('hata')
    }
  }, [slug])

  useEffect(() => {
    yukle()
  }, [yukle])

  const detayiKapat = useCallback(() => setDetay(null), [])

  if (durum === 'yukleniyor') return <Iskelet />
  if (durum === 'gecersiz')
    return <TamEkran baslik="Menü bulunamadı" metin="QR kodu tekrar okutun. Yine açılmazsa personelden yardım isteyin." />
  if (durum === 'hata')
    return (
      <TamEkran baslik="Menü açılamadı" metin={hata}>
        <button onClick={yukle} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-fistik px-6 font-semibold text-white hover:bg-fistik-koyu">
          <RotateCw className="size-5" aria-hidden /> Tekrar dene
        </button>
      </TamEkran>
    )

  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-10">
      <header className="px-5 pt-10 pb-6">
        <h1 className="text-[2.75rem] leading-[0.95] font-extrabold tracking-[-0.035em] text-balance" style={{ fontVariationSettings: "'opsz' 96" }}>
          {menu.restoran.name}
        </h1>
        <p className="mt-3 text-lg text-gri">Siparişiniz için garsonunuza seslenebilirsiniz.</p>
      </header>

      <Vitrin menu={menu} ac={setDetay} />

      {menu.restoran.plan !== 'pro' && (
        <p className="mt-10 text-center text-sm text-gri">Restoran Sipariş ile hazırlandı</p>
      )}

      {detay && <UrunDetay u={detay} kapat={detayiKapat} />}
    </div>
  )
}

/* ---------------- Vitrin ---------------- */

function Vitrin({ menu, ac }) {
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

  if (!kategoriler.length) return <p className="px-5 py-16 text-center text-gri">Menü henüz hazırlanıyor.</p>

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
              <UrunKarti key={u.id} u={u} ac={ac} />
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

const UrunKarti = memo(function UrunKarti({ u, ac }) {
  return (
    <li>
      <button onClick={() => ac(u)} className="flex w-full flex-col text-left" aria-label={`${u.name}, ${tl(u.price)}. Ayrıntılar`}>
        <span className="block overflow-hidden rounded-2xl">
          <Foto u={u} />
        </span>
        <span className="mt-2.5 block px-1 text-[17px] leading-snug font-semibold">{u.name}</span>
        <span className="mt-0.5 block px-1 text-[17px] font-medium text-gri tabular-nums">{tl(u.price)}</span>
      </button>
    </li>
  )
})

/* ---------------- Ürün ayrıntısı ---------------- */

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

function KapatButonu({ kapat }) {
  return (
    <button onClick={kapat} aria-label="Kapat" className="absolute top-3 right-3 z-10 flex size-11 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur">
      <X className="size-6" aria-hidden />
    </button>
  )
}

function UrunDetay({ u, kapat }) {
  return (
    <AltPencere etiket={u.name} kapat={kapat}>
      <KapatButonu kapat={kapat} />
      <div className="overflow-y-auto">
        <Foto u={u} buyuk className="max-h-[55dvh]" />
        <div className="px-6 pt-5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
          <h2 className="text-3xl leading-tight font-bold tracking-[-0.025em]">{u.name}</h2>
          <p className="mt-1 text-xl font-medium text-gri tabular-nums">{tl(u.price)}</p>
          {u.description && <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-gri">{u.description}</p>}
          <button onClick={kapat} className="mt-6 h-12 w-full rounded-full border-2 border-fistik font-semibold text-fistik hover:bg-fistik-acik">
            Menüye dön
          </button>
        </div>
      </div>
    </AltPencere>
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
