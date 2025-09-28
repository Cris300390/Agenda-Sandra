// src/lib/supabaseClient.ts
let cached: any | null = null

function env(name: string): string | undefined {
  const v = (import.meta as any).env?.[name]
  return typeof v === 'string' && v.trim() ? v : undefined
}

/** Crea el cliente SOLO cuando se llama. Si faltan claves, devuelve null. */
export async function getSupabase() {
  if (cached) return cached

  const url  = env('VITE_SUPABASE_URL')
  const anon = env('VITE_SUPABASE_ANON_KEY')

  if (!url || !anon) {
    console.warn('[supabase] No hay VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. No se inicializa.')
    return null
  }

  const { createClient } = await import('@supabase/supabase-js')
  cached = createClient(url, anon)
  return cached
}
