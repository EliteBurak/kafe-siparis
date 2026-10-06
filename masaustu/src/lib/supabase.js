import { createClient } from '@supabase/supabase-js'

// Bu iki değer herkese açık olacak şekilde tasarlanmıştır (güvenliği veritabanındaki RLS kuralları sağlar).
// Secret / service_role anahtarını ASLA buraya yazma.
export const SUPABASE_URL = 'https://awhdvohpmqhjoosemzxv.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_k5klOtK7230IuuNkyWFjeg_vdZSnDWm'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/** Supabase hatasını Türkçe, anlaşılır bir mesaja çevirir. */
export function hataMesaji(error) {
  if (!error) return ''
  const m = error.message || String(error)
  if (/Invalid login credentials/i.test(m)) return 'E-posta veya şifre hatalı.'
  if (/Failed to fetch|NetworkError|fetch failed/i.test(m)) return 'İnternet bağlantısı yok ya da sunucuya ulaşılamıyor.'
  if (/violates foreign key/i.test(m)) return 'Bu kayıt başka kayıtlarda kullanıldığı için silinemiyor.'
  if (/JWT|not authorized|permission denied/i.test(m)) return 'Yetki hatası. Lütfen çıkış yapıp tekrar giriş yap.'
  return m
}
