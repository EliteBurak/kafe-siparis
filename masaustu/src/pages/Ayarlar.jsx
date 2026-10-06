import { useState } from 'react'
import { Save } from 'lucide-react'
import { useVeri } from '../hooks/useVeri'
import { supabase, hataMesaji } from '../lib/supabase'
import { Alan, Buton, SayfaBasligi, girdiSinifi, useUyari } from '../components/ui'
import { zilCal } from '../lib/bildirim'

export default function Ayarlar() {
  const { ayarlar, yenile } = useVeri()
  const { goster } = useUyari()
  const [ad, setAd] = useState(ayarlar.cafe_name)
  const [url, setUrl] = useState(ayarlar.menu_url)
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)

  async function kaydet(e) {
    e.preventDefault()
    const temizUrl = url.trim()
    if (temizUrl && !/^https:\/\/[^\s]+$/i.test(temizUrl)) {
      return setHata('Adres https:// ile başlamalı.')
    }
    setHata('')
    setBekliyor(true)
    const { error } = await supabase.from('settings').upsert({ id: 1, cafe_name: ad.trim() || 'Kafem', menu_url: temizUrl })
    setBekliyor(false)
    if (error) return goster(hataMesaji(error), 'hata')
    goster('Ayarlar kaydedildi')
    yenile()
  }

  return (
    <>
      <SayfaBasligi baslik="Ayarlar" />
      <form onSubmit={kaydet} className="flex max-w-2xl flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <Alan etiket="Kafe adı" ipucu="QR menünün en üstünde ve masa QR kartlarında görünür.">
          {(id) => <input id={id} maxLength={60} value={ad} onChange={(e) => setAd(e.target.value)} className={girdiSinifi} />}
        </Alan>
        <Alan etiket="QR menü adresi" hata={hata} ipucu="QR menü sayfasını yayınladığın adres. Örn: https://kullaniciadi.github.io/kafe-menu/">
          {(id) => <input id={id} type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} className={girdiSinifi} />}
        </Alan>
        <div className="flex justify-between gap-3">
          <Buton type="button" tur="ikincil" onClick={zilCal}>Sipariş zilini dene</Buton>
          <Buton type="submit" ikon={Save} yukleniyor={bekliyor}>Kaydet</Buton>
        </div>
      </form>
    </>
  )
}
