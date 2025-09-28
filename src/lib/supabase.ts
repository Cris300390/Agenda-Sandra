// src/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// 1) Intentar leer de .env (en Pages no existe)
let url  = import.meta.env.VITE_SUPABASE_URL as string | undefined
let anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// 2) Fallbacks (usa los tuyos reales; estos son los que has pasado)
const FALLBACK_URL  = 'https://mejzzeyggeyshvnmhiva.supabase.co'
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lanp6ZXlnZ2V5c2h2bm1oaXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTkzOTcsImV4cCI6MjA3NDM5NTM5N30.ahinVBdVqofCmj7hLSCFTnj8--_OPd9lVn8YA6lI1Lg'

if (!url)  url  = FALLBACK_URL
if (!anon) anon = FALLBACK_ANON

// 3) Crear cliente solo si hay strings válidos (¡sin throw!)
function ok(s?: string) { return typeof s === 'string' && s.trim().length > 0 }

let supabase: SupabaseClient | null = null
if (ok(url) && ok(anon)) {
  supabase = createClient(url!, anon!)
  console.info('[supabase] Cliente creado')
} else {
  console.warn('[supabase] Sin URL o ANON; Supabase desactivado.')
}

// Exponer en DEV para pruebas
if (import.meta.env.DEV) {
  ;(window as any).supaTest = supabase
}

export { supabase }
