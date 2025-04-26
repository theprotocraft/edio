import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Client-side Supabase client (singleton pattern)
let clientInstance: ReturnType<typeof createClientComponentClient> | null = null

export const createClient = () => {
  // Use singleton pattern to avoid creating multiple clients
  if (clientInstance) return clientInstance

  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Validate URL and key
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Anon Key is missing in environment variables")
  }

  // Ensure URL is properly formatted
  try {
    // Test if URL is valid by constructing it
    new URL(supabaseUrl)

    // Create the client
    clientInstance = createClientComponentClient({
      supabaseUrl,
      supabaseKey,
    })

    return clientInstance
  } catch (error) {
    console.error("Invalid Supabase URL:", error)
    throw new Error("Invalid Supabase URL. Please check your NEXT_PUBLIC_SUPABASE_URL environment variable.")
  }
}

// Server-side Supabase client
export const createServerClient = () => {
  try {
    const cookieStore = cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL or Anon Key is missing in environment variables")
    }

    // Test if URL is valid
    new URL(supabaseUrl)

    return createServerComponentClient({
      cookies: () => cookieStore,
      supabaseUrl,
      supabaseKey,
    })
  } catch (error) {
    console.error("Error creating server client:", error)
    throw error
  }
}

// Route handler Supabase client
export const createRouteClient = () => {
  try {
    const cookieStore = cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL or Anon Key is missing in environment variables")
    }

    // Test if URL is valid
    new URL(supabaseUrl)

    return createRouteHandlerClient({
      cookies: () => cookieStore,
      supabaseUrl,
      supabaseKey,
    })
  } catch (error) {
    console.error("Error creating route client:", error)
    throw error
  }
}
