import { useState } from 'react'
import { Coffee } from 'lucide-react'
import { supabase, hataMesaji } from '../lib/supabase'
import { Alan, Buton, girdiSinifi } from '../components/ui'

export default function Giris() {
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  async function gonder(e) {
    e.preventDefault()
    setHata('')
    setYukleniyor(true)
    const { error } = await supabase.auth.signInWithPassword({ email: eposta.trim(), password: sifre })
    setYukleniyor(false)
    if (error) setHata(hataMesaji(error))
  }

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-50 to-stone-100 p-6">
      <form onSubmit={gonder} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-stone-200">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-700 text-white">
            <Coffee className="size-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kafe Sipariş</h1>
            <p className="text-stone-600">Personel girişi</p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Alan etiket="E-posta">
            {(id) => <input id={id} type="email" autoComplete="username" required value={eposta} onChange={(e) => setEposta(e.target.value)} className={girdiSinifi} />}
          </Alan>
          <Alan etiket="Şifre">
            {(id) => <input id={id} type="password" autoComplete="current-password" required value={sifre} onChange={(e) => setSifre(e.target.value)} className={girdiSinifi} />}
          </Alan>
          {hata && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{hata}</p>}
          <Buton type="submit" boyut="buyuk" yukleniyor={yukleniyor} className="mt-2 w-full">Giriş yap</Buton>
        </div>
      </form>
    </div>
  )
}
