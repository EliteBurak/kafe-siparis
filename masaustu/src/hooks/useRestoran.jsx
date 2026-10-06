import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const RestoranCtx = createContext(null)
const SECIM_ANAHTARI = 'secili-restoran'

const oku = () => { try { return localStorage.getItem(SECIM_ANAHTARI) } catch { return null } }
const yaz = (id) => { try { localStorage.setItem(SECIM_ANAHTARI, id) } catch { /* önemli değil */ } }

export const ROL_ADI = { sahip: 'Restoran sahibi', kasiyer: 'Kasiyer', garson: 'Garson' }

/**
 * Giriş yapan kişinin üyesi olduğu restoranları ve seçili restorandaki rolünü tutar.
 * Yetki kontrolleri asıl olarak veritabanında yapılır; buradaki bilgi sadece arayüzü düzenlemek için.
 */
export function RestoranSaglayici({ oturum, children }) {
  const [uyelikler, setUyelikler] = useState(null) // null = yükleniyor
  const [seciliId, setSeciliId] = useState(oku)

  const yenile = useCallback(async () => {
    const { data, error } = await supabase
      .from('members')
      .select('role, display_name, restaurant_id, restaurants(id, name, slug, plan)')
      .eq('user_id', oturum.user.id)
      .order('created_at')
    setUyelikler(error ? [] : data.filter((u) => u.restaurants))
  }, [oturum.user.id])

  useEffect(() => {
    yenile()
  }, [yenile])

  const restoranSec = useCallback((id) => {
    yaz(id)
    setSeciliId(id)
  }, [])

  const deger = useMemo(() => {
    if (!uyelikler) return { yukleniyor: true }
    const uye = uyelikler.find((u) => u.restaurant_id === seciliId) ?? uyelikler[0] ?? null
    const rol = uye?.role ?? null
    return {
      yukleniyor: false,
      kullaniciId: oturum.user.id,
      eposta: oturum.user.email,
      uyelikler,
      uye,
      restoran: uye?.restaurants ?? null,
      rol,
      sahip: rol === 'sahip',
      kasa: rol === 'sahip' || rol === 'kasiyer',
      pro: uye?.restaurants?.plan === 'pro',
      restoranSec,
      yenile,
    }
  }, [uyelikler, seciliId, oturum.user.id, oturum.user.email, restoranSec, yenile])

  return <RestoranCtx.Provider value={deger}>{children}</RestoranCtx.Provider>
}

export const useRestoran = () => useContext(RestoranCtx)
