import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
// Admin işlemleri için Service Role Key kullanıyoruz:
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

export const supabaseAdmin = createClient(supabaseUrl, serviceKey)
