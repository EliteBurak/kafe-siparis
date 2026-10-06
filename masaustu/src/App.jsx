import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from './lib/supabase'
import { VeriSaglayici } from './hooks/useVeri'
import { useSiparisler } from './hooks/useSiparisler'
import Giris from './pages/Giris'
import Kenar from './components/Kenar'
import Siparisler from './pages/Siparisler'
import GarsonSiparis from './pages/GarsonSiparis'
import Masalar from './pages/Masalar'
import Menu from './pages/Menu'
import Rapor from './pages/Rapor'
import Ayarlar from './pages/Ayarlar'

export default function App() {
  const [oturum, setOturum] = useState(undefined) // undefined = kontrol ediliyor

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setOturum(data.session))
    const { data } = supabase.auth.onAuthStateChange((_olay, s) => setOturum(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (oturum === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-stone-500" aria-label="Yükleniyor" />
      </div>
    )
  }
  if (!oturum) return <Giris />

  return (
    <VeriSaglayici>
      <Panel eposta={oturum.user.email} />
    </VeriSaglayici>
  )
}

function Panel({ eposta }) {
  const [sayfa, setSayfa] = useState('siparisler')
  const s = useSiparisler()
  const bekleyen = s.siparisler.filter((o) => o.status === 'yeni').length

  return (
    <div className="flex h-full">
      <Kenar sayfa={sayfa} setSayfa={setSayfa} bekleyen={bekleyen} baglanti={s.baglanti} eposta={eposta} />
      <main className="min-w-0 flex-1 overflow-y-auto px-8 py-7">
        {sayfa === 'siparisler' && <Siparisler {...s} />}
        {sayfa === 'garson' && <GarsonSiparis bitti={() => { s.yenile(); setSayfa('siparisler') }} />}
        {sayfa === 'masalar' && <Masalar siparisler={s.siparisler} yenileSiparis={s.yenile} />}
        {sayfa === 'menu' && <Menu />}
        {sayfa === 'rapor' && <Rapor />}
        {sayfa === 'ayarlar' && <Ayarlar />}
      </main>
    </div>
  )
}
