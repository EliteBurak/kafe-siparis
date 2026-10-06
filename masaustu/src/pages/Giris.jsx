import { useState } from 'react'
import { UtensilsCrossed, MailCheck } from 'lucide-react'
import { supabase, hataMesaji } from '../lib/supabase'
import { UYGULAMA_ADI } from '../lib/marka'
import { Alan, Buton, girdiSinifi } from '../components/ui'

export default function Giris() {
  const [mod, setMod] = useState('giris') // giris | kayit
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [dogrulamaBekliyor, setDogrulamaBekliyor] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)

  async function gonder(e) {
    e.preventDefault()
    setHata('')
    setYukleniyor(true)
    const bilgi = { email: eposta.trim().toLowerCase(), password: sifre }
    if (mod === 'giris') {
      const { error } = await supabase.auth.signInWithPassword(bilgi)
      if (error) setHata(hataMesaji(error))
    } else {
      const { data, error } = await supabase.auth.signUp(bilgi)
      if (error) setHata(hataMesaji(error))
      // E-posta doğrulaması açıksa oturum hemen açılmaz
      else if (!data.session) setDogrulamaBekliyor(true)
    }
    setYukleniyor(false)
  }

  const modDegistir = (m) => {
    setMod(m)
    setHata('')
  }

  if (dogrulamaBekliyor) {
    return (
      <Cerceve>
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-10 text-brand-700" aria-hidden />
          <h2 className="text-xl font-bold">E-postanı kontrol et</h2>
          <p className="text-stone-700">
            <strong>{eposta}</strong> adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladıktan sonra buradan giriş yapabilirsin.
          </p>
          <Buton tur="ikincil" className="mt-2" onClick={() => { setDogrulamaBekliyor(false); modDegistir('giris') }}>
            Giriş ekranına dön
          </Buton>
        </div>
      </Cerceve>
    )
  }

  return (
    <Cerceve>
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1" role="tablist">
        {[['giris', 'Giriş yap'], ['kayit', 'Hesap oluştur']].map(([id, ad]) => (
          <button
            key={id}
            role="tab"
            aria-selected={mod === id}
            onClick={() => modDegistir(id)}
            className={`h-10 rounded-lg text-sm font-semibold transition-colors duration-150 ${mod === id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
          >
            {ad}
          </button>
        ))}
      </div>
      <form onSubmit={gonder} className="flex flex-col gap-4">
        <Alan etiket="E-posta">
          {(id) => <input id={id} type="email" autoComplete="username" required value={eposta} onChange={(e) => setEposta(e.target.value)} className={girdiSinifi} />}
        </Alan>
        <Alan etiket="Şifre" ipucu={mod === 'kayit' ? 'En az 6 karakter.' : undefined}>
          {(id) => (
            <input
              id={id}
              type="password"
              autoComplete={mod === 'giris' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              className={girdiSinifi}
            />
          )}
        </Alan>
        {hata && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{hata}</p>}
        <Buton type="submit" boyut="buyuk" yukleniyor={yukleniyor} className="mt-2 w-full">
          {mod === 'giris' ? 'Giriş yap' : 'Hesap oluştur'}
        </Buton>
        {mod === 'kayit' && (
          <p className="text-center text-sm text-stone-600">
            Restoran sahibiysen hesap oluşturduktan sonra restoranını kurarsın. Personelsen, sahibin sana verdiği davet koduyla katılırsın.
          </p>
        )}
      </form>
    </Cerceve>
  )
}

function Cerceve({ children }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-stone-100 p-4 sm:p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-stone-200 sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-700 text-white">
            <UtensilsCrossed className="size-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold">{UYGULAMA_ADI}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
