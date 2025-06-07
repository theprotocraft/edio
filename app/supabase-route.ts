import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

// Route handler Supabase client
export const createRouteClient = async () => {
  try {
    const cookieStore = cookies()

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables in route handler")
      throw new Error("Missing Supabase environment variables")
    }

    // Create client with service role key for admin operations
    const client = createRouteHandlerClient<Database>(
      { cookies: () => cookieStore },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    )

    return client
  } catch (error) {
    console.error("Error creating route client:", error)
    throw error
  }
}
