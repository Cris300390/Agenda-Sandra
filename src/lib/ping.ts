import { supabase } from "./supabase"

export async function pingSupabase() {
  const { data, error } = await supabase.from("alumnos").select("*").limit(1)
  if (error) {
    console.error("Supabase ERROR:", error)
  } else {
    console.log("Supabase OK, ejemplo de datos:", data)
  }
}
