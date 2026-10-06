import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRestoran } from './useRestoran'

const VeriCtx = createContext(null)

/** Seçili restoranın menüsünü ve masalarını tek yerden yükler; sayfalar değişiklikten sonra yenile() çağırır. */
export function VeriSaglayici({ children }) {
  const { restoran } = useRestoran()
  const rid = restoran.id
  const [kategoriler, setKategoriler] = useState([])
  const [urunler, setUrunler] = useState([])
  const [masalar, setMasalar] = useState([])
  const [hazir, setHazir] = useState(false)

  const yenile = useCallback(async () => {
    // Birbirinden bağımsız istekler paralel (react-best-practices: async-parallel)
    const [k, u, m] = await Promise.all([
      supabase.from('categories').select('*').eq('restaurant_id', rid).order('sort_order').order('id'),
      supabase.from('products').select('*').eq('restaurant_id', rid).order('sort_order').order('id'),
      supabase.from('dining_tables').select('*').eq('restaurant_id', rid).order('sort_order').order('id'),
    ])
    if (k.data) setKategoriler(k.data)
    if (u.data) setUrunler(u.data)
    if (m.data) setMasalar(m.data)
    setHazir(true)
  }, [rid])

  useEffect(() => {
    setHazir(false)
    yenile()
  }, [yenile])

  const deger = useMemo(
    () => ({ kategoriler, urunler, masalar, hazir, yenile }),
    [kategoriler, urunler, masalar, hazir, yenile]
  )
  return <VeriCtx.Provider value={deger}>{children}</VeriCtx.Provider>
}

export const useVeri = () => useContext(VeriCtx)

/** Restoranın müşteriye açık QR menü adresi */
export function menuAdresi(slug) {
  return `${MENU_TABANI}?r=${encodeURIComponent(slug)}`
}
export const MENU_TABANI = 'https://eliteburak.github.io/kafe-siparis/'
