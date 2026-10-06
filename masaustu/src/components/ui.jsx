import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const BUTON = {
  ana: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
  ikincil: 'bg-white text-stone-800 ring-1 ring-stone-300 hover:bg-stone-100',
  hayalet: 'text-stone-700 hover:bg-stone-200/70',
  tehlike: 'bg-red-700 text-white hover:bg-red-800 shadow-sm',
  basari: 'bg-green-700 text-white hover:bg-green-800 shadow-sm',
}
const BOYUT = {
  kucuk: 'h-9 px-3 text-sm gap-1.5',
  orta: 'h-11 px-4 text-[15px] gap-2',
  buyuk: 'h-14 px-6 text-lg gap-2.5',
}

export function Buton({ tur = 'ana', boyut = 'orta', yukleniyor, ikon: Ikon, children, className = '', disabled, ...p }) {
  return (
    <button
      disabled={disabled || yukleniyor}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-150 disabled:opacity-50 ${BUTON[tur]} ${BOYUT[boyut]} ${className}`}
      {...p}
    >
      {yukleniyor ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Ikon && <Ikon className="size-4.5 shrink-0" aria-hidden />}
      {children}
    </button>
  )
}

export function IkonButon({ etiket, ikon: Ikon, className = '', ...p }) {
  return (
    <button
      aria-label={etiket}
      title={etiket}
      className={`inline-flex size-9 items-center justify-center rounded-lg text-stone-600 transition-colors duration-150 hover:bg-stone-200/70 hover:text-stone-900 ${className}`}
      {...p}
    >
      <Ikon className="size-4.5" aria-hidden />
    </button>
  )
}

export function Alan({ etiket, ipucu, hata, children }) {
  const id = useId()
  const cocuk = typeof children === 'function' ? children(id) : children
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-stone-800">
        {etiket}
      </label>
      {cocuk}
      {ipucu && !hata && <p className="text-sm text-stone-600">{ipucu}</p>}
      {hata && <p className="text-sm font-medium text-red-700">{hata}</p>}
    </div>
  )
}

export const girdiSinifi =
  'h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-[15px] text-stone-900 placeholder:text-stone-500 transition-colors duration-150 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200'

export function Rozet({ className = '', children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${className}`}>{children}</span>
}

export function Modal({ acik, kapat, baslik, children, alt, genis }) {
  const ref = useRef(null)
  // kapat fonksiyonu her render'da değişebilir; ref'te tutarak efektin tekrar çalışmasını
  // (ve yazarken odağın kaymasını) önlüyoruz (react-best-practices: event handler refs)
  const kapatRef = useRef(kapat)
  kapatRef.current = kapat
  useEffect(() => {
    if (!acik) return
    const onKey = (e) => e.key === 'Escape' && kapatRef.current()
    window.addEventListener('keydown', onKey)
    ref.current?.querySelector('input, textarea, select, button:not([aria-label="Kapat"])')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [acik])
  if (!acik) return null
  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-6" onMouseDown={(e) => e.target === e.currentTarget && kapat()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={baslik} className={`flex max-h-full w-full flex-col rounded-2xl bg-white shadow-2xl ${genis ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-bold">{baslik}</h2>
          <IkonButon etiket="Kapat" ikon={X} onClick={kapat} />
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {alt && <div className="flex justify-end gap-2 border-t border-stone-200 px-6 py-4">{alt}</div>}
      </div>
    </div>
  )
}

export function Bos({ ikon: Ikon, baslik, aciklama, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 px-6 py-12 text-center">
      {Ikon && <Ikon className="size-8 text-stone-400" aria-hidden />}
      <p className="font-semibold text-stone-800">{baslik}</p>
      {aciklama && <p className="max-w-sm text-sm text-stone-600">{aciklama}</p>}
      {children}
    </div>
  )
}

export function SayfaBasligi({ baslik, aciklama, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{baslik}</h1>
        {aciklama && <p className="mt-1 text-stone-600">{aciklama}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

/* ---------- Bildirim (toast) ve onay penceresi ---------- */

const UyariCtx = createContext(null)

export function UyariSaglayici({ children }) {
  const [liste, setListe] = useState([])
  const [onay, setOnay] = useState(null)

  const goster = useCallback((mesaj, tur = 'basari') => {
    const id = Math.random()
    setListe((l) => [...l, { id, mesaj, tur }])
    setTimeout(() => setListe((l) => l.filter((x) => x.id !== id)), tur === 'hata' ? 6000 : 3000)
  }, [])

  const sor = useCallback(
    (secenek) => new Promise((coz) => setOnay({ ...secenek, coz })),
    []
  )
  const kapatOnay = (sonuc) => {
    onay?.coz(sonuc)
    setOnay(null)
  }

  return (
    <UyariCtx.Provider value={{ goster, sor }}>
      {children}
      <div className="no-print pointer-events-none fixed right-6 bottom-6 z-[60] flex flex-col gap-2" aria-live="polite">
        {liste.map((u) => (
          <div
            key={u.id}
            className={`pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${u.tur === 'hata' ? 'bg-red-700' : 'bg-stone-900'}`}
          >
            {u.tur === 'hata' ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />}
            {u.mesaj}
          </div>
        ))}
      </div>
      <Modal
        acik={!!onay}
        kapat={() => kapatOnay(false)}
        baslik={onay?.baslik}
        alt={
          <>
            <Buton tur="ikincil" onClick={() => kapatOnay(false)}>Vazgeç</Buton>
            <Buton tur={onay?.tehlikeli ? 'tehlike' : 'ana'} onClick={() => kapatOnay(true)}>
              {onay?.evet || 'Onayla'}
            </Buton>
          </>
        }
      >
        <p className="text-stone-700">{onay?.mesaj}</p>
      </Modal>
    </UyariCtx.Provider>
  )
}

export const useUyari = () => useContext(UyariCtx)
