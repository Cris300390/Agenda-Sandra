// src/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Pequeño test para ejecutar desde la consola del navegador sin pegar mucho código.
 * En desarrollo, queda colgado en window.supaTest()
 */
async function _supaTest() {
  const { data, error } = await supabase.from('students').select('id,name').limit(1)
  console.log('TEST Supabase:', { data, error })
  if (error) console.error('❌ Supabase error:', error.message)
  else console.log('✅ Conexión OK (si data=[], no hay alumnos aún)')
}

// Solo en desarrollo lo colgamos en window
if (import.meta.env.DEV) {
  // @ts-ignore
  ;(window as any).supaTest = _supaTest
}
