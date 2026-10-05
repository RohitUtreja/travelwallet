import { createBrowserClient } from '@supabase/ssr'

let client = null

/** One shared browser client — creating several duplicates auth listeners and sockets. */
export function getSupabaseClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return client
}

export const createClient = getSupabaseClient
