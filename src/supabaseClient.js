import { createClient } from '@supabase/supabase-js'

// Preencha essas duas variáveis no arquivo .env (veja .env.example)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase não configurado: crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
