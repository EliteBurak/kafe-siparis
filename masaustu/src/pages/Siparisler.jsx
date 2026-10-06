import { memo, useCallback, useEffect, useState } from 'react'
import { Clock, UserRound, MessageSquareText, XCircle, RefreshCw, Inbox } from 'lucide-react'
import { DURUMLAR, gecenSure, saatYaz, tl } from '../lib/format'
import { hataMesaji } from '../lib/supabase'
import { Buton, IkonButon, Rozet, SayfaBasligi, useUyari } from '../components/ui'

const SUTUNLAR = ['yeni', 'hazirlaniyor', 'hazir']

export default function Siparisler({ siparisler, yukleniyor, yeniIdler, yenile, durumDegistir }) {
  const { goster, sor } = useUyari()
  const [simdi, setSimdi] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setSimdi(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Kartlar memo'lu; fonksiyonlar sabit kalsın ki her saniye tüm kartlar yeniden çizilmesin
  const ilerlet = useCallback(async (o) => {
    const err = await durumDegistir(o.id, DURUMLAR[o.status].sonraki)
    if (err) goster(hataMesaji(err), 'hata')
  }, [durumDegistir, goster])

  const iptal = useCallback(async (o) => {
    const tamam = await sor({
      baslik: `#${o.order_no} iptal edilsin mi?`,
      mesaj: `${o.table_name} masasının ${tl(o.total)} tutarındaki siparişi iptal edilecek ve hesaba yansımayacak.`,
      evet: 'İptal et',
      tehlikeli: true,
    })
    if (!tamam) return
    const err = await durumDegistir(o.id, 'iptal')
    goster(err ? hataMesaji(err) : `#${o.order_no} iptal edildi`, err ? 'hata' : 'basari')
  }, [durumDegistir, goster, sor])

  return (
    <>
      <SayfaBasligi baslik="Siparişler" aciklama="Personelin girdiği siparişler buraya anında düşer. Başkası sipariş girince zil çalar.">
        <Buton tur="ikincil" boyut="kucuk" ikon={RefreshCw} onClick={yenile}>Yenile</Buton>
      </SayfaBasligi>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {SUTUNLAR.map((durum) => {
          const liste = siparisler.filter((o) => o.status === durum)
          return (
            <section key={durum} className="flex lg:min-h-[60vh] flex-col rounded-2xl bg-stone-100 p-3" aria-label={DURUMLAR[durum].ad}>
              <header className="mb-3 flex items-center justify-between px-2 pt-1">
                <h2 className="font-bold">{DURUMLAR[durum].ad}</h2>
                <Rozet className={DURUMLAR[durum].renk}>{liste.length}</Rozet>
              </header>
              <div className="flex flex-col gap-3">
                {liste.map((o) => (
                  <SiparisKarti key={o.id} o={o} simdi={simdi} yeni={yeniIdler.has(o.id)} ilerlet={ilerlet} iptal={iptal} />
                ))}
                {!yukleniyor && liste.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-sm text-stone-500">
                    <Inbox className="size-6" aria-hidden />
                    Sipariş yok
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}

const SiparisKarti = memo(function SiparisKarti({ o, simdi, yeni, ilerlet, iptal }) {
  const d = DURUMLAR[o.status]
  const dk = (simdi - new Date(o.created_at).getTime()) / 60000
  const gecikti = o.status !== 'hazir' && dk >= 15
  const [bekliyor, setBekliyor] = useState(false)

  async function tikla() {
    setBekliyor(true)
    await ilerlet(o)
    setBekliyor(false)
  }

  return (
    <article className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200 ${yeni ? 'yeni-siparis ring-2 ring-brand-500' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold leading-tight">{o.table_name || 'Masa yok'}</p>
          <p className="text-sm text-stone-600">
            Sipariş {o.order_no}, saat {saatYaz(o.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Rozet className="bg-stone-100 text-stone-700 ring-stone-200" title="Siparişi alan">
            <UserRound className="mr-1 size-3" aria-hidden />
            {o.created_by_name || 'Personel'}
          </Rozet>
          <IkonButon etiket="Siparişi iptal et" ikon={XCircle} onClick={() => iptal(o)} className="hover:text-red-700" />
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5 border-t border-stone-100 pt-3">
        {o.order_items?.map((k) => (
          <li key={k.id}>
            <div className="flex gap-2">
              <span className="w-7 shrink-0 font-bold text-brand-800">{k.quantity}×</span>
              <span className="font-medium">{k.product_name}</span>
            </div>
            {k.note && <p className="ml-9 text-sm text-stone-600">↳ {k.note}</p>}
          </li>
        ))}
      </ul>

      {o.note && (
        <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <MessageSquareText className="mt-0.5 size-4 shrink-0" aria-hidden />
          {o.note}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className={`flex items-center gap-1 font-medium ${gecikti ? 'text-red-700' : 'text-stone-600'}`}>
          <Clock className="size-4" aria-hidden />
          {gecenSure(o.created_at, simdi)}
          {gecikti && ' – gecikti'}
        </span>
        <span className="font-bold">{tl(o.total)}</span>
      </div>

      {d.buton && (
        <Buton tur={o.status === 'hazir' ? 'basari' : 'ana'} className="mt-3 w-full" yukleniyor={bekliyor} onClick={tikla}>
          {d.buton}
        </Buton>
      )}
    </article>
  )
})
