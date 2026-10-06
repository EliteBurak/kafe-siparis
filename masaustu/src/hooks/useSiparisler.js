import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zilCal, masaustuBildirimi } from '../lib/bildirim'

const SECIM = '*, order_items(*)'
const aktifMi = (o) => !o.paid && o.status !== 'iptal'

/**
 * Ödenmemiş ve iptal edilmemiş siparişleri tutar, Supabase Realtime ile canlı günceller.
 * Bağlantı koparsa yeniden bağlanınca listeyi baştan çeker; ayrıca 60 sn'de bir yedek yenileme yapar.
 */
export function useSiparisler() {
  const [siparisler, setSiparisler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [baglanti, setBaglanti] = useState('baglaniyor') // baglaniyor | canli | kopuk
  const [yeniIdler, setYeniIdler] = useState(() => new Set())
  const ilkYukleme = useRef(true)
  const siparislerRef = useRef(siparisler)
  siparislerRef.current = siparisler

  const yenile = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(SECIM)
      .eq('paid', false)
      .neq('status', 'iptal')
      .order('created_at', { ascending: true })
    if (!error) setSiparisler(data)
    setYukleniyor(false)
    ilkYukleme.current = false
  }, [])

  useEffect(() => {
    yenile()

    const kanal = supabase
      .channel('siparisler')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (d) => {
        if (d.eventType === 'DELETE') {
          setSiparisler((l) => l.filter((o) => o.id !== d.old.id))
          return
        }
        if (d.eventType === 'INSERT') {
          // Kalemleri de almak için siparişi tekrar çek
          const { data } = await supabase.from('orders').select(SECIM).eq('id', d.new.id).single()
          if (!data || !aktifMi(data)) return
          setSiparisler((l) => (l.some((o) => o.id === data.id) ? l : [...l, data]))
          if (data.source === 'qr') {
            zilCal()
            masaustuBildirimi(`Yeni sipariş – ${data.table_name}`, `${data.order_items.length} kalem`)
            setYeniIdler((s) => new Set(s).add(data.id))
            setTimeout(() => setYeniIdler((s) => { const n = new Set(s); n.delete(data.id); return n }), 4000)
          }
          return
        }
        // UPDATE
        const o = d.new
        setSiparisler((l) =>
          aktifMi(o)
            ? l.map((x) => (x.id === o.id ? { ...x, ...o } : x))
            : l.filter((x) => x.id !== o.id)
        )
      })
      .subscribe((durum) => {
        if (durum === 'SUBSCRIBED') {
          setBaglanti('canli')
          if (!ilkYukleme.current) yenile() // kopukken kaçırılanları al
        } else if (durum === 'CHANNEL_ERROR' || durum === 'TIMED_OUT' || durum === 'CLOSED') {
          setBaglanti('kopuk')
        }
      })

    const zamanlayici = setInterval(yenile, 60_000)
    return () => {
      clearInterval(zamanlayici)
      supabase.removeChannel(kanal)
    }
  }, [yenile])

  /** Durumu hemen ekranda değiştirir, sunucu hata verirse geri alır (iyimser güncelleme). */
  const durumDegistir = useCallback(async (id, status) => {
    const eski = siparislerRef.current.find((o) => o.id === id)
    setSiparisler((l) =>
      status === 'iptal' || status === 'teslim'
        ? l.map((o) => (o.id === id ? { ...o, status } : o)).filter((o) => o.status !== 'iptal')
        : l.map((o) => (o.id === id ? { ...o, status } : o))
    )
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error && eski) {
      setSiparisler((l) => (l.some((o) => o.id === id) ? l.map((o) => (o.id === id ? eski : o)) : [...l, eski]))
    }
    return error
  }, [])

  return { siparisler, yukleniyor, baglanti, yeniIdler, yenile, durumDegistir }
}
