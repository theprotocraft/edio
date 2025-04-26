import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

// Route handler Supabase client
export const createRouteClient = () => {
  try {
    const cookieStore = cookies()

    return createRouteHandlerClient<Database>({
      cookies: () => cookieStore,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    } as any)
  } catch (error) {
    console.error("Error creating route client:", error)
    throw error
  }
}
