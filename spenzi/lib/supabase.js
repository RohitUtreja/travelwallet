import { createBrowserClient } from '@supabase/ssr'

let client = null

// Supabase renamed the "anon" key to the "publishable" key; accept either variable name.
// (Referenced statically so Next can inline them at build time.)
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** One shared browser client — creating several duplicates auth listeners and sockets. */
export function getSupabaseClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_KEY
    )
  }
  return client
}

export const createClient = getSupabaseClient
