import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from './lib/supabase'
import { RestoranSaglayici, useRestoran } from './hooks/useRestoran'
import { VeriSaglayici } from './hooks/useVeri'
import { useSiparisler } from './hooks/useSiparisler'
import Giris from './pages/Giris'
import Kurulum from './pages/Kurulum'
import Kenar, { SAYFALAR } from './components/Kenar'
import Siparisler from './pages/Siparisler'
import SiparisAl from './pages/SiparisAl'
import Masalar from './pages/Masalar'
import Menu from './pages/Menu'
import Rapor from './pages/Rapor'
import Personel from './pages/Personel'
import Ayarlar from './pages/Ayarlar'

function Yukleniyor() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="size-6 animate-spin text-stone-500" aria-label="Yükleniyor" />
    </div>
  )
}

export default function App() {
  const [oturum, setOturum] = useState(undefined) // undefined = kontrol ediliyor

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setOturum(data.session))
    const { data } = supabase.auth.onAuthStateChange((_olay, s) => setOturum(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (oturum === undefined) return <Yukleniyor />
  if (!oturum) return <Giris />

  return (
    <RestoranSaglayici key={oturum.user.id} oturum={oturum}>
      <RestoranKapisi />
    </RestoranSaglayici>
  )
}

/** Restoranı olmayan kişiyi kurulum ekranına, olanı panele yönlendirir. */
function RestoranKapisi() {
  const r = useRestoran()
  if (r.yukleniyor) return <Yukleniyor />
  if (!r.restoran) return <Kurulum />
  return (
    <VeriSaglayici key={r.restoran.id}>
      <Panel key={r.restoran.id} />
    </VeriSaglayici>
  )
}

function Panel() {
  const { restoran, kullaniciId, rol } = useRestoran()
  const izinli = SAYFALAR.filter((s) => s.roller.includes(rol))
  const [sayfa, setSayfa] = useState(rol === 'garson' ? 'masalar' : 'siparisler')
  const [secilenMasa, setSecilenMasa] = useState(null) // Masalar'dan "Sipariş" ile gelince
  const s = useSiparisler(restoran.id, kullaniciId)
  const bekleyen = s.siparisler.filter((o) => o.status === 'yeni').length
  const aktifSayfa = izinli.some((x) => x.id === sayfa) ? sayfa : izinli[0].id

  return (
    <div className="flex h-full flex-col md:flex-row">
      <Kenar sayfa={aktifSayfa} setSayfa={(x) => { setSecilenMasa(null); setSayfa(x) }} sayfalar={izinli} bekleyen={bekleyen} baglanti={s.baglanti} />
      <main className="min-w-0 flex-1 overflow-y-auto px-4 pt-5 pb-24 md:px-8 md:py-7">
        {aktifSayfa === 'siparisler' && <Siparisler {...s} />}
        {aktifSayfa === 'siparis-al' && (
          <SiparisAl
            key={secilenMasa ?? 'yok'}
            baslangicMasa={secilenMasa}
            bitti={() => { s.yenile(); setSecilenMasa(null); setSayfa(rol === 'garson' ? 'masalar' : 'siparisler') }}
          />
        )}
        {aktifSayfa === 'masalar' && (
          <Masalar siparisler={s.siparisler} yenileSiparis={s.yenile} siparisAl={(id) => { setSecilenMasa(id); setSayfa('siparis-al') }} />
        )}
        {aktifSayfa === 'menu' && <Menu />}
        {aktifSayfa === 'rapor' && <Rapor />}
        {aktifSayfa === 'personel' && <Personel />}
        {aktifSayfa === 'ayarlar' && <Ayarlar />}
      </main>
    </div>
  )
}
