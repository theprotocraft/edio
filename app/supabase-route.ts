import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Route handler Supabase client
export const createRouteClient = () => {
  try {
    const cookieStore = cookies()
    
    return createRouteHandlerClient({
      cookies: () => cookieStore,
    })
  } catch (error) {
    console.error("Error creating route client:", error)
    throw error
  }
} 