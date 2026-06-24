import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True once both Supabase env vars are present (set in Vercel / .env). */
export const supabaseConfigured = Boolean(url && anon)

// NOTE on secrets: the anon key is *designed* to be public. It carries no
// privileges of its own — Row-Level Security (Phase 1) decides what each
// signed-in user can read or write. The privileged service_role key and the
// Anthropic API key are NEVER shipped to the browser; they live server-side only.
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url as string, anon as string)
  : null
