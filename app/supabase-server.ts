import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()
  return createServerComponentClient<Database>({ cookies: () => cookieStore })
}

export async function getSession() {
  const supabase = await createServerSupabaseClient()
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

export async function getUser() {
  const supabase = await createServerSupabaseClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

export async function getUserDetails() {
  const supabase = await createServerSupabaseClient()
  try {
    const user = await getUser()

    if (!user) {
      return null
    }

    const { data: userDetails } = await supabase
      .from("users") // Changed from 'profiles' to 'users'
      .select("*")
      .eq("id", user.id)
      .single()

    return userDetails
  } catch (error) {
    console.error("Error getting user details:", error)
    return null
  }
}

export async function getServiceSupabase() {
  const supabase = await createServerSupabaseClient()
  return supabase
}
