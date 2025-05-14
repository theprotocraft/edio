import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

// Route handler Supabase client
export const createRouteClient = () => {
  try {
    const cookieStore = cookies()

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables in route handler")
      // Return a minimal client that won't throw errors
      return {
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          exchangeCodeForSession: () => Promise.resolve({ data: null, error: null }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
          insert: () => Promise.resolve({ data: null, error: null }),
        }),
      } as any
    }

    return createRouteHandlerClient<Database>({
      cookies: () => cookieStore,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  } catch (error) {
    console.error("Error creating route client:", error)
    // Return a minimal client that won't throw errors
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        exchangeCodeForSession: () => Promise.resolve({ data: null, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
      }),
    } as any
  }
}
