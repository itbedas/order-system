import { createClient } from '@supabase/supabase-js'

// .env dosyanda veya Vercel Environment Variables’da olacak:
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
