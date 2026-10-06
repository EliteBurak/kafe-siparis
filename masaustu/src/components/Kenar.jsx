import { BellRing, ClipboardPlus, LayoutGrid, BookOpen, BarChart3, Settings, LogOut, Coffee } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useVeri } from '../hooks/useVeri'

const MENU = [
  { id: 'siparisler', ad: 'Siparişler', ikon: BellRing },
  { id: 'garson', ad: 'Sipariş Gir', ikon: ClipboardPlus },
  { id: 'masalar', ad: 'Masalar & Hesap', ikon: LayoutGrid },
  { id: 'menu', ad: 'Menü', ikon: BookOpen },
  { id: 'rapor', ad: 'Rapor', ikon: BarChart3 },
  { id: 'ayarlar', ad: 'Ayarlar', ikon: Settings },
]

const BAGLANTI = {
  canli: { metin: 'Canlı bağlantı', nokta: 'bg-green-600' },
  baglaniyor: { metin: 'Bağlanıyor…', nokta: 'bg-amber-500' },
  kopuk: { metin: 'Bağlantı koptu', nokta: 'bg-red-600' },
}

export default function Kenar({ sayfa, setSayfa, bekleyen, baglanti, eposta }) {
  const { ayarlar } = useVeri()
  const b = BAGLANTI[baglanti]

  return (
    <nav className="no-print flex w-64 shrink-0 flex-col border-r border-stone-200 bg-white" aria-label="Ana menü">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-700 text-white">
          <Coffee className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight">{ayarlar.cafe_name || 'Kafe Sipariş'}</p>
          <p className="flex items-center gap-1.5 text-xs text-stone-600">
            <span className={`size-2 rounded-full ${b.nokta}`} aria-hidden />
            {b.metin}
          </p>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-1 px-3">
        {MENU.map(({ id, ad, ikon: Ikon }) => {
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
                {id === 'siparisler' && bekleyen > 0 && (
                  <span className="min-w-6 rounded-full bg-brand-700 px-2 py-0.5 text-center text-xs font-bold text-white" aria-label={`${bekleyen} yeni sipariş`}>
                    {bekleyen}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="border-t border-stone-200 p-3">
        <p className="truncate px-3 pb-2 text-xs text-stone-600" title={eposta}>{eposta}</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-stone-700 transition-colors duration-150 hover:bg-stone-100"
        >
          <LogOut className="size-4.5" aria-hidden /> Çıkış yap
        </button>
      </div>
    </nav>
  )
}
