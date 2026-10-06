import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Save, Printer, ExternalLink, Copy, Sparkles } from 'lucide-react'
import { useRestoran } from '../hooks/useRestoran'
import { useVeri, menuAdresi } from '../hooks/useVeri'
import { supabase, hataMesaji } from '../lib/supabase'
import { Alan, Buton, SayfaBasligi, girdiSinifi, useUyari } from '../components/ui'
import QrKod from '../components/QrKod'
import { zilCal } from '../lib/bildirim'

export default function Ayarlar() {
  const { restoran, pro, yenile } = useRestoran()
  const { masalar, urunler } = useVeri()
  const { goster } = useUyari()
  const [ad, setAd] = useState(restoran.name)
  const [bekliyor, setBekliyor] = useState(false)
  const adres = menuAdresi(restoran.slug)

  async function kaydet(e) {
    e.preventDefault()
    setBekliyor(true)
    const { error } = await supabase.from('restaurants').update({ name: ad.trim() }).eq('id', restoran.id)
    setBekliyor(false)
    if (error) return goster(hataMesaji(error), 'hata')
    goster('Kaydedildi')
    yenile()
  }

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(adres)
      goster('Menü bağlantısı kopyalandı')
    } catch {
      goster('Kopyalanamadı', 'hata')
    }
  }

  return (
    <>
      <SayfaBasligi baslik="Ayarlar" />
      <div className="grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Restoran bilgileri */}
        <form onSubmit={kaydet} className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-lg font-bold">Restoran</h2>
          <Alan etiket="Restoranın adı" ipucu="QR menünün en üstünde görünür.">
            {(id) => <input id={id} required minLength={2} maxLength={80} value={ad} onChange={(e) => setAd(e.target.value)} className={girdiSinifi} />}
          </Alan>
          <div className="flex flex-wrap justify-between gap-3">
            <Buton type="button" tur="ikincil" onClick={zilCal}>Sipariş zilini dene</Buton>
            <Buton type="submit" ikon={Save} yukleniyor={bekliyor}>Kaydet</Buton>
          </div>
        </form>

        {/* Sürüm */}
        <section className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200" aria-labelledby="surum">
          <div className="flex items-center justify-between">
            <h2 id="surum" className="text-lg font-bold">Sürüm</h2>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${pro ? 'bg-brand-700 text-white' : 'bg-stone-100 text-stone-800'}`}>
              {pro ? 'Pro' : 'Ücretsiz'}
            </span>
          </div>
          {pro ? (
            <p className="text-stone-700">Tüm özellikler açık: sınırsız masa ve ürün, personel hesapları, geçmiş raporlar.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                <Kullanim ad="Masa" sayi={masalar.length} sinir={10} />
                <Kullanim ad="Ürün" sayi={urunler.length} sinir={40} />
              </ul>
              <div className="rounded-xl bg-brand-50 p-4">
                <p className="flex items-center gap-2 font-semibold text-brand-900">
                  <Sparkles className="size-4.5" aria-hidden /> Pro ile gelenler
                </p>
                <p className="mt-1 text-sm text-brand-900">Sınırsız masa ve ürün, kasiyer ve garson hesapları, geçmiş günlerin raporu, menüde kendi markan.</p>
              </div>
            </>
          )}
        </section>

        {/* QR menü */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 lg:col-span-2" aria-labelledby="qr">
          <h2 id="qr" className="text-lg font-bold">QR menü</h2>
          <p className="mt-1 text-stone-600">Müşteriler bu kodu okutup menüyü telefonlarında görür. Her masaya aynı kodu koyabilirsin.</p>
          <div className="mt-5 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <QrKod adres={adres} boyut={180} className="rounded-xl ring-1 ring-stone-200" />
            <div className="flex min-w-0 flex-col gap-3">
              <p className="break-all text-sm text-stone-700">{adres}</p>
              <div className="flex flex-wrap gap-2">
                <Buton tur="ikincil" boyut="kucuk" ikon={Copy} onClick={kopyala}>Bağlantıyı kopyala</Buton>
                <a href={adres} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-brand-800 hover:bg-brand-50">
                  Menüyü aç <ExternalLink className="size-4" aria-hidden />
                </a>
                <Buton boyut="kucuk" ikon={Printer} onClick={() => window.print()}>Masa kartlarını yazdır</Buton>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Yazdırma: A4 sayfaya 6 masa kartı */}
      {createPortal(
        <div className="yazdir-sayfa">
          <div className="grid grid-cols-2 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex break-inside-avoid flex-col items-center gap-3 rounded-2xl border border-stone-300 p-6 text-center">
                <p className="text-2xl font-bold">{restoran.name}</p>
                <QrKod adres={adres} boyut={190} />
                <p className="text-lg font-semibold">Menü için kodu okutun</p>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function Kullanim({ ad, sayi, sinir }) {
  const oran = Math.min(1, sayi / sinir)
  const dolu = sayi >= sinir
  return (
    <li>
      <div className="flex justify-between text-sm">
        <span className="font-semibold">{ad}</span>
        <span className={`flex items-center gap-1 tabular-nums ${dolu ? 'font-semibold text-red-700' : 'text-stone-600'}`}>
          {sayi} / {sinir}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-label={`${ad} kullanımı`} aria-valuenow={sayi} aria-valuemin={0} aria-valuemax={sinir}>
        <div className={`h-full rounded-full ${dolu ? 'bg-red-600' : 'bg-brand-600'}`} style={{ width: `${oran * 100}%` }} />
      </div>
    </li>
  )
}
