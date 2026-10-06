import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** Verilen adres için QR kod resmi çizer. */
export default function QrKod({ adres, boyut = 220, className = '' }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let iptal = false
    if (!adres) return setSrc('')
    QRCode.toDataURL(adres, { width: boyut * 2, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1c1917', light: '#ffffff' } })
      .then((u) => !iptal && setSrc(u))
      .catch(() => !iptal && setSrc(''))
    return () => { iptal = true }
  }, [adres, boyut])

  return src ? (
    <img src={src} width={boyut} height={boyut} alt={`QR kod: ${adres}`} className={className} />
  ) : (
    <div style={{ width: boyut, height: boyut }} className={`animate-pulse rounded-lg bg-stone-100 ${className}`} aria-hidden />
  )
}
