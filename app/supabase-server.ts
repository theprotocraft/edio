import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Server-side Supabase client for Server Components
export const createServerClient = () => {
  try {
    const cookieStore = cookies()
    
    return createServerComponentClient({
      cookies: () => cookieStore,
    })
  } catch (error) {
    console.error("Error creating server client:", error)
    throw error
  }
} 