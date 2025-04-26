import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Environment variables with fallbacks for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Client-side Supabase client
export const createClient = () => {
  return createClientComponentClient({
    supabaseUrl,
    supabaseKey,
  })
}

// Server-side Supabase client
export const createServerClient = () => {
  const cookieStore = cookies()
  return createServerComponentClient({
    cookies: () => cookieStore,
    supabaseUrl,
    supabaseKey,
  })
}

// Route handler Supabase client
export const createRouteClient = () => {
  const cookieStore = cookies()
  return createRouteHandlerClient({
    cookies: () => cookieStore,
    supabaseUrl,
    supabaseKey,
  })
}
