import { createClient, type SupabaseClient } from '@supabase/supabase-js'
const url  = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const supa: SupabaseClient = createClient(url, anon)
export const client = supa
