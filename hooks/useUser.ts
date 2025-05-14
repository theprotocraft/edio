"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/supabase-provider"

export interface UserDetails {
  id: string
  first_name: string
  last_name: string
  avatar_url: string
  email: string
  created_at: string
  updated_at: string
}

export const useUser = () => {
  const { supabase } = useSupabase()
  const [user, setUser] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)

        // Get the current user from Supabase Auth
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!authUser) {
          setUser(null)
          return
        }

        // Get the user details from the users table
        const { data, error: profileError } = await supabase
          .from("users") // Changed from 'profiles' to 'users'
          .select("*")
          .eq("id", authUser.id)
          .single()

        if (profileError) {
          throw profileError
        }

        setUser(data as UserDetails)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("An unknown error occurred"))
        console.error("Error fetching user:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // Set up a subscription to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchUser()
      } else if (event === "SIGNED_OUT") {
        setUser(null)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  return { user, loading, error }
}
