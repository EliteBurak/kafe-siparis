import { useEffect, useState } from 'react'
import { Store, KeyRound, LogOut, Lock } from 'lucide-react'
import { supabase, hataMesaji } from '../lib/supabase'
import { useRestoran } from '../hooks/useRestoran'
import { Alan, Buton, girdiSinifi } from '../components/ui'

/** Henüz bir restorana bağlı olmayan kullanıcı: restoran açar ya da davet koduyla katılır. */
export default function Kurulum() {
  const { eposta, yenile, restoranSec } = useRestoran()
  const [mod, setMod] = useState('olustur') // olustur | katil
  const [ad, setAd] = useState('')
  const [adim, setAdim] = useState('')
  const [kod, setKod] = useState('')
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [askida, setAskida] = useState([])

  // Personel olduğu restoran ücretsiz sürüme geçtiyse bunu açıkça söyle
  useEffect(() => {
    supabase.rpc('askidaki_restoranlarim').then(({ data }) => setAskida(data ?? []))
  }, [])

  async function gonder(e) {
    e.preventDefault()
    setHata('')
    setBekliyor(true)
    const { data, error } =
      mod === 'olustur'
        ? await supabase.rpc('restoran_olustur', { p_ad: ad.trim(), p_adim: adim.trim() })
        : await supabase.rpc('davet_kabul', { p_kod: kod.trim() })
    if (error) {
      setHata(hataMesaji(error))
      setBekliyor(false)
      return
    }
    restoranSec(data)
    await yenile()
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-stone-100 p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-stone-200 sm:p-8">
        <h1 className="text-2xl font-bold">Hoş geldin</h1>
        <p className="mt-1 text-stone-600">{eposta} ile giriş yaptın. Nasıl devam etmek istersin?</p>

        {askida.length > 0 && (
          <div role="status" className="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
            <Lock className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>
              <strong>{askida.map((r) => r.name).join(', ')}</strong> ücretsiz sürüme geçtiği için personel girişi şu an kapalı.
              Restoran sahibi Pro sürüme geçince hesabın otomatik olarak yeniden açılır.
            </p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            ['olustur', Store, 'Restoranımı kur', 'Sahibiysen'],
            ['katil', KeyRound, 'Davet koduyla katıl', 'Personelsen'],
          ].map(([id, Ikon, baslik, alt]) => (
            <button
              key={id}
              onClick={() => { setMod(id); setHata('') }}
              aria-pressed={mod === id}
              className={`flex flex-col items-start gap-2 rounded-xl p-4 text-left ring-1 transition-colors duration-150 ${
                mod === id ? 'bg-brand-50 ring-2 ring-brand-600' : 'ring-stone-300 hover:bg-stone-50'
              }`}
            >
              <Ikon className={`size-6 ${mod === id ? 'text-brand-700' : 'text-stone-500'}`} aria-hidden />
              <span className="font-semibold leading-tight">{baslik}</span>
              <span className="text-sm text-stone-600">{alt}</span>
            </button>
          ))}
        </div>

        <form onSubmit={gonder} className="mt-6 flex flex-col gap-4">
          {mod === 'olustur' ? (
            <>
              <Alan etiket="Restoranın adı">
                {(id) => <input id={id} required minLength={2} maxLength={80} value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Örn: Çınar Köşk" className={girdiSinifi} />}
              </Alan>
              <Alan etiket="Adın" ipucu="Siparişlerde ve personel listesinde görünür.">
                {(id) => <input id={id} maxLength={40} value={adim} onChange={(e) => setAdim(e.target.value)} placeholder="Örn: Burak" className={girdiSinifi} />}
              </Alan>
            </>
          ) : (
            <Alan etiket="Davet kodu" ipucu="Restoran sahibinden aldığın 8 haneli kod. Bu hesabın e-postası davetteki e-postayla aynı olmalı.">
              {(id) => (
                <input
                  id={id}
                  required
                  maxLength={8}
                  value={kod}
                  onChange={(e) => setKod(e.target.value.toUpperCase())}
                  placeholder="Örn: 4F9A2C1B"
                  className={`${girdiSinifi} font-mono text-lg tracking-widest uppercase`}
                />
              )}
            </Alan>
          )}
          {hata && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{hata}</p>}
          <Buton type="submit" boyut="buyuk" yukleniyor={bekliyor} className="w-full">
            {mod === 'olustur' ? 'Restoranı oluştur' : 'Restorana katıl'}
          </Buton>
        </form>

        <button onClick={() => supabase.auth.signOut()} className="mx-auto mt-6 flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900">
          <LogOut className="size-4" aria-hidden /> Farklı hesapla giriş yap
        </button>
      </div>
    </div>
  )
}
