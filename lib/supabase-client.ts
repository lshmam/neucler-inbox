// lib/supabase-client.ts
import { createBrowserClient } from '@supabase/ssr'

// Create a singleton client for the browser
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}