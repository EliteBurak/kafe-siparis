import { useState } from 'react'
import { BellRing, ClipboardPlus, LayoutGrid, BookOpen, BarChart3, Settings, LogOut, UtensilsCrossed, Users, MoreHorizontal, X, ChevronsUpDown, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestoran, ROL_ADI } from '../hooks/useRestoran'

// Her sayfayı hangi roller görebilir. Asıl yetki kontrolü veritabanında; bu sadece menüyü sadeleştirir.
export const SAYFALAR = [
  { id: 'siparisler', ad: 'Siparişler', ikon: BellRing, roller: ['sahip', 'kasiyer', 'garson'] },
  { id: 'siparis-al', ad: 'Sipariş Al', ikon: ClipboardPlus, roller: ['sahip', 'kasiyer', 'garson'] },
  { id: 'masalar', ad: 'Masalar', ikon: LayoutGrid, roller: ['sahip', 'kasiyer', 'garson'] },
  { id: 'rapor', ad: 'Rapor', ikon: BarChart3, roller: ['sahip', 'kasiyer'] },
  { id: 'menu', ad: 'Menü', ikon: BookOpen, roller: ['sahip'] },
  { id: 'personel', ad: 'Personel', ikon: Users, roller: ['sahip'] },
  { id: 'ayarlar', ad: 'Ayarlar', ikon: Settings, roller: ['sahip'] },
]

const BAGLANTI = {
  canli: { metin: 'Canlı bağlantı', nokta: 'bg-green-600' },
  baglaniyor: { metin: 'Bağlanıyor…', nokta: 'bg-amber-500' },
  kopuk: { metin: 'Bağlantı koptu', nokta: 'bg-red-600' },
}

function RestoranSecici() {
  const { restoran, uyelikler, restoranSec } = useRestoran()
  if (uyelikler.length < 2) return <p className="truncate font-bold leading-tight">{restoran.name}</p>
  return (
    <label className="relative flex items-center">
      <span className="sr-only">Restoran seç</span>
      <select
        value={restoran.id}
        onChange={(e) => restoranSec(e.target.value)}
        className="w-full appearance-none truncate bg-transparent pr-5 font-bold leading-tight focus:outline-none"
      >
        {uyelikler.map((u) => (
          <option key={u.restaurant_id} value={u.restaurant_id}>{u.restaurants.name}</option>
        ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-0 size-4 text-stone-500" aria-hidden />
    </label>
  )
}

function Hesap() {
  const { uye, rol, eposta } = useRestoran()
  return (
    <div className="border-t border-stone-200 p-3">
      <div className="px-3 pb-2">
        <p className="truncate text-sm font-semibold">{uye.display_name}</p>
        <p className="truncate text-xs text-stone-600" title={eposta}>{ROL_ADI[rol]}</p>
      </div>
      <button
        onClick={() => supabase.auth.signOut()}
        className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-stone-700 transition-colors duration-150 hover:bg-stone-100"
      >
        <LogOut className="size-4.5" aria-hidden /> Çıkış yap
      </button>
    </div>
  )
}

function Rozet({ sayi }) {
  if (!sayi) return null
  return (
    <span className="min-w-6 rounded-full bg-brand-700 px-2 py-0.5 text-center text-xs font-bold text-white" aria-label={`${sayi} yeni sipariş`}>
      {sayi}
    </span>
  )
}

export default function Kenar({ sayfa, setSayfa, sayfalar, bekleyen, baglanti }) {
  const b = BAGLANTI[baglanti]
  const [digerAcik, setDigerAcik] = useState(false)
  // Telefonda alt çubukta en fazla 4 sayfa; fazlası "Diğer" altında
  const alttakiler = sayfalar.length > 5 ? sayfalar.slice(0, 4) : sayfalar
  const digerleri = sayfalar.length > 5 ? sayfalar.slice(4) : []

  return (
    <>
      {/* ---------- Masaüstü / tablet: yan menü ---------- */}
      <nav className="no-print hidden w-64 shrink-0 flex-col border-r border-stone-200 bg-white md:flex" aria-label="Ana menü">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
            <UtensilsCrossed className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <RestoranSecici />
            <p className="flex items-center gap-1.5 text-xs text-stone-600">
              <span className={`size-2 rounded-full ${b.nokta}`} aria-hidden />
              {b.metin}
            </p>
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-1 px-3">
          {sayfalar.map(({ id, ad, ikon: Ikon }) => {
            const aktif = sayfa === id
            return (
              <li key={id}>
                <button
                  onClick={() => setSayfa(id)}
                  aria-current={aktif ? 'page' : undefined}
                  className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left font-semibold transition-colors duration-150 ${
                    aktif ? 'bg-brand-50 text-brand-800' : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Ikon className="size-5 shrink-0" aria-hidden />
                  <span className="flex-1">{ad}</span>
                  {id === 'siparisler' && <Rozet sayi={bekleyen} />}
                </button>
              </li>
            )
          })}
        </ul>
        <Hesap />
      </nav>

      {/* ---------- Telefon: üst başlık ---------- */}
      <header className="no-print flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <div className="min-w-0 flex-1"><RestoranSecici /></div>
        <span className="flex items-center gap-1.5 text-xs text-stone-600">
          <span className={`size-2 rounded-full ${b.nokta}`} aria-hidden />
          {b.metin}
        </span>
      </header>

      {/* ---------- Telefon: alt çubuk ---------- */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Ana menü">
        <ul className="flex">
          {[...alttakiler, ...(digerleri.length ? [{ id: '__diger', ad: 'Diğer', ikon: MoreHorizontal }] : [{ id: '__hesap', ad: 'Profil', ikon: UserRound }])].map(({ id, ad, ikon: Ikon }) => {
            const aktif = sayfa === id || (id === '__diger' && digerleri.some((d) => d.id === sayfa))
            return (
              <li key={id} className="flex-1">
                <button
                  onClick={() => (id.startsWith('__') ? setDigerAcik(true) : setSayfa(id))}
                  aria-current={aktif ? 'page' : undefined}
                  className={`relative flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold ${aktif ? 'text-brand-800' : 'text-stone-600'}`}
                >
                  <Ikon className="size-6" aria-hidden />
                  {ad}
                  {id === 'siparisler' && bekleyen > 0 && (
                    <span className="absolute top-2 left-1/2 ml-2 min-w-5 rounded-full bg-brand-700 px-1.5 text-[11px] font-bold text-white">{bekleyen}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {digerAcik && (
        <div className="no-print fixed inset-0 z-50 flex items-end bg-stone-900/50 md:hidden" onClick={(e) => e.target === e.currentTarget && setDigerAcik(false)}>
          <div role="dialog" aria-modal="true" aria-label="Diğer" className="w-full rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-5 pt-4">
              <p className="font-bold">Menü</p>
              <button onClick={() => setDigerAcik(false)} aria-label="Kapat" className="flex size-10 items-center justify-center rounded-full hover:bg-stone-100">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <ul className="px-3 py-2">
              {digerleri.map(({ id, ad, ikon: Ikon }) => (
                <li key={id}>
                  <button
                    onClick={() => { setSayfa(id); setDigerAcik(false) }}
                    className={`flex h-12 w-full items-center gap-3 rounded-lg px-3 font-semibold ${sayfa === id ? 'bg-brand-50 text-brand-800' : 'text-stone-700'}`}
                  >
                    <Ikon className="size-5" aria-hidden /> {ad}
                  </button>
                </li>
              ))}
            </ul>
            <Hesap />
          </div>
        </div>
      )}
    </>
  )
}
