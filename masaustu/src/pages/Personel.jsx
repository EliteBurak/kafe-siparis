import { useCallback, useEffect, useState } from 'react'
import { UserPlus, Trash2, Copy, Users, Lock } from 'lucide-react'
import { supabase, hataMesaji } from '../lib/supabase'
import { useRestoran, ROL_ADI } from '../hooks/useRestoran'
import { Alan, Bos, Buton, IkonButon, Modal, Rozet, SayfaBasligi, girdiSinifi, useUyari } from '../components/ui'

const ROL_RENK = {
  sahip: 'bg-brand-50 text-brand-800 ring-brand-200',
  kasiyer: 'bg-sky-50 text-sky-900 ring-sky-200',
  garson: 'bg-amber-50 text-amber-900 ring-amber-200',
}

export default function Personel() {
  const { restoran, kullaniciId, pro } = useRestoran()
  const { goster, sor } = useUyari()
  const [uyeler, setUyeler] = useState(null)
  const [davetler, setDavetler] = useState([])
  const [davetAcik, setDavetAcik] = useState(false)
  const [yeniDavet, setYeniDavet] = useState(null) // oluşturulunca kodu göstermek için

  const yukle = useCallback(async () => {
    const [u, d] = await Promise.all([
      supabase.from('members').select('user_id, role, display_name, created_at').eq('restaurant_id', restoran.id).order('created_at'),
      supabase.from('invitations').select('*').eq('restaurant_id', restoran.id).order('created_at'),
    ])
    setUyeler(u.data ?? [])
    setDavetler(d.data ?? [])
  }, [restoran.id])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function rolDegistir(uye, role) {
    const { error } = await supabase.from('members').update({ role }).eq('restaurant_id', restoran.id).eq('user_id', uye.user_id)
    if (error) return goster(hataMesaji(error), 'hata')
    goster(`${uye.display_name} artık ${ROL_ADI[role].toLowerCase()}`)
    yukle()
  }

  async function cikar(uye) {
    if (!(await sor({ baslik: `${uye.display_name} çıkarılsın mı?`, mesaj: 'Bu kişi artık restorana giriş yapamaz. Aldığı siparişler raporlarda kalır.', evet: 'Çıkar', tehlikeli: true }))) return
    const { error } = await supabase.from('members').delete().eq('restaurant_id', restoran.id).eq('user_id', uye.user_id)
    if (error) return goster(hataMesaji(error), 'hata')
    goster(`${uye.display_name} çıkarıldı`)
    yukle()
  }

  async function davetSil(d) {
    const { error } = await supabase.from('invitations').delete().eq('id', d.id)
    if (error) return goster(hataMesaji(error), 'hata')
    yukle()
  }

  return (
    <>
      <SayfaBasligi baslik="Personel" aciklama="Kasiyer ve garsonlar kendi hesaplarıyla giriş yapar. Menüyü sadece sen düzenleyebilirsin.">
        <Buton ikon={UserPlus} onClick={() => setDavetAcik(true)} disabled={!pro}>Personel davet et</Buton>
      </SayfaBasligi>

      {!pro && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
          <Lock className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>Personel hesapları Pro sürümde. Ücretsiz sürümde sadece restoran sahibi giriş yapabilir.</p>
        </div>
      )}

      <section className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-stone-200" aria-label="Personel listesi">
        {uyeler === null ? (
          <div className="h-24 animate-pulse rounded-xl bg-stone-100" />
        ) : (
          <ul className="divide-y divide-stone-100">
            {uyeler.map((u) => (
              <li key={u.user_id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-100 font-bold text-stone-700" aria-hidden>
                  {u.display_name.charAt(0).toLocaleUpperCase('tr-TR')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {u.display_name}
                    {u.user_id === kullaniciId && <span className="font-normal text-stone-600"> (sen)</span>}
                  </p>
                </div>
                {u.role === 'sahip' ? (
                  <Rozet className={ROL_RENK.sahip}>{ROL_ADI.sahip}</Rozet>
                ) : (
                  <div className="flex items-center gap-1">
                    <select
                      aria-label={`${u.display_name} rolü`}
                      value={u.role}
                      onChange={(e) => rolDegistir(u, e.target.value)}
                      className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-sm font-semibold"
                    >
                      <option value="kasiyer">Kasiyer</option>
                      <option value="garson">Garson</option>
                    </select>
                    <IkonButon etiket={`${u.display_name} çıkar`} ikon={Trash2} onClick={() => cikar(u)} className="hover:text-red-700" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {davetler.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-bold">Bekleyen davetler</h2>
          <ul className="flex flex-col gap-2">
            {davetler.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{d.display_name || d.email}</p>
                  <p className="truncate text-sm text-stone-600">{d.email}</p>
                </div>
                <Rozet className={ROL_RENK[d.role]}>{ROL_ADI[d.role]}</Rozet>
                <KodKutusu kod={d.code} />
                <IkonButon etiket="Daveti sil" ikon={Trash2} onClick={() => davetSil(d)} className="hover:text-red-700" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {uyeler?.length === 1 && davetler.length === 0 && pro && (
        <div className="mt-6">
          <Bos ikon={Users} baslik="Henüz personel yok" aciklama="Kasiyer ve garsonlarını davet et. Her biri kendi hesabıyla giriş yapar, aldığı siparişler adıyla kaydedilir." />
        </div>
      )}

      <DavetFormu acik={davetAcik} kapat={() => setDavetAcik(false)} olustu={(d) => { setYeniDavet(d); yukle() }} />
      <Modal acik={!!yeniDavet} kapat={() => setYeniDavet(null)} baslik="Davet hazır" alt={<Buton onClick={() => setYeniDavet(null)}>Tamam</Buton>}>
        {yeniDavet && (
          <div className="flex flex-col gap-4">
            <p className="text-stone-700">
              <strong>{yeniDavet.display_name || yeniDavet.email}</strong> için davet oluşturuldu. Bu kodu kendisine ilet:
            </p>
            <KodKutusu kod={yeniDavet.code} buyuk />
            <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-700">
              <li>Uygulamayı açıp <strong>{yeniDavet.email}</strong> adresiyle <strong>Hesap oluştur</strong> der.</li>
              <li><strong>Davet koduyla katıl</strong> seçeneğine bu kodu yazar.</li>
            </ol>
          </div>
        )}
      </Modal>
    </>
  )
}

function KodKutusu({ kod, buyuk }) {
  const { goster } = useUyari()
  async function kopyala() {
    try {
      await navigator.clipboard.writeText(kod)
      goster('Kod kopyalandı')
    } catch {
      goster('Kopyalanamadı, kodu elle yaz.', 'hata')
    }
  }
  return (
    <button
      onClick={kopyala}
      className={`inline-flex items-center gap-2 rounded-lg bg-stone-100 font-mono font-bold tracking-widest text-stone-900 hover:bg-stone-200 ${buyuk ? 'h-14 justify-center px-5 text-2xl' : 'h-9 px-3 text-sm'}`}
      aria-label={`Davet kodu ${kod}, kopyala`}
    >
      {kod}
      <Copy className={buyuk ? 'size-5' : 'size-4'} aria-hidden />
    </button>
  )
}

function DavetFormu({ acik, kapat, olustu }) {
  const { restoran } = useRestoran()
  const { goster } = useUyari()
  const [eposta, setEposta] = useState('')
  const [ad, setAd] = useState('')
  const [rol, setRol] = useState('garson')
  const [bekliyor, setBekliyor] = useState(false)

  async function gonder(e) {
    e.preventDefault()
    setBekliyor(true)
    const { data, error } = await supabase
      .from('invitations')
      .insert({ restaurant_id: restoran.id, email: eposta.trim().toLowerCase(), display_name: ad.trim(), role: rol })
      .select()
      .single()
    setBekliyor(false)
    if (error) return goster(hataMesaji(error), 'hata')
    setEposta('')
    setAd('')
    kapat()
    olustu(data)
  }

  return (
    <Modal
      acik={acik}
      kapat={kapat}
      baslik="Personel davet et"
      alt={<><Buton tur="ikincil" onClick={kapat}>Vazgeç</Buton><Buton type="submit" form="davet-form" yukleniyor={bekliyor}>Davet oluştur</Buton></>}
    >
      <form id="davet-form" onSubmit={gonder} className="flex flex-col gap-4">
        <Alan etiket="Adı" ipucu="Siparişlerde bu ad görünür.">
          {(id) => <input id={id} required maxLength={40} value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Örn: Ahmet" className={girdiSinifi} />}
        </Alan>
        <Alan etiket="E-posta" ipucu="Kişi bu e-postayla hesap oluşturacak.">
          {(id) => <input id={id} type="email" required value={eposta} onChange={(e) => setEposta(e.target.value)} className={girdiSinifi} />}
        </Alan>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-stone-800">Görevi</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['garson', 'Garson', 'Sipariş alır, masaları görür'],
              ['kasiyer', 'Kasiyer', 'Ayrıca hesap kapatır, raporu görür'],
            ].map(([id, baslik, alt]) => (
              <label key={id} className={`flex cursor-pointer flex-col rounded-xl p-3 ring-1 ${rol === id ? 'bg-brand-50 ring-2 ring-brand-600' : 'ring-stone-300'}`}>
                <input type="radio" name="rol" value={id} checked={rol === id} onChange={() => setRol(id)} className="sr-only" />
                <span className="font-semibold">{baslik}</span>
                <span className="text-sm text-stone-600">{alt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
