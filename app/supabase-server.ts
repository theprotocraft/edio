import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

// Server-side Supabase client for Server Components
export const createServerClient = () => {
  try {
    const cookieStore = cookies()

    return createServerComponentClient<Database>({
      cookies: () => cookieStore,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    } as any)
  } catch (error) {
    console.error("Error creating server client:", error)
    throw error
  }
}
