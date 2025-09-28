// src/data/supaClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl)  throw new Error('VITE_SUPABASE_URL is required')
if (!supabaseAnon) throw new Error('VITE_SUPABASE_ANON_KEY is required')

// Cliente único
export const supabase = createClient(supabaseUrl, supabaseAnon)

// Alias de compatibilidad (por si otros archivos importan con otros nombres)
export const supa   = supabase
export const client = supabase

// Export por defecto (permite: import supabase from './supaClient')
export default supabase
