import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const VeriCtx = createContext(null)

/** Menü, masalar ve ayarları tek yerden yükler; sayfalar değişiklikten sonra yenile() çağırır. */
export function VeriSaglayici({ children }) {
  const [ayarlar, setAyarlar] = useState({ cafe_name: '', menu_url: '' })
  const [kategoriler, setKategoriler] = useState([])
  const [urunler, setUrunler] = useState([])
  const [masalar, setMasalar] = useState([])
  const [hazir, setHazir] = useState(false)

  const yenile = useCallback(async () => {
    // Birbirinden bağımsız istekler paralel (react-best-practices: async-parallel)
    const [a, k, u, m] = await Promise.all([
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('categories').select('*').order('sort_order').order('id'),
      supabase.from('products').select('*').order('sort_order').order('id'),
      supabase.from('cafe_tables').select('*').order('id'),
    ])
    if (a.data) setAyarlar(a.data)
    if (k.data) setKategoriler(k.data)
    if (u.data) setUrunler(u.data)
    if (m.data) setMasalar(m.data)
    setHazir(true)
  }, [])

  useEffect(() => {
    yenile()
  }, [yenile])

  const deger = useMemo(
    () => ({ ayarlar, kategoriler, urunler, masalar, hazir, yenile }),
    [ayarlar, kategoriler, urunler, masalar, hazir, yenile]
  )
  return <VeriCtx.Provider value={deger}>{children}</VeriCtx.Provider>
}

export const useVeri = () => useContext(VeriCtx)

/** Masa için QR menü adresi */
export function menuAdresi(menuUrl, kod) {
  if (!menuUrl) return ''
  const temel = menuUrl.trim().replace(/[?#].*$/, '')
  return `${temel}?masa=${encodeURIComponent(kod)}`
}
