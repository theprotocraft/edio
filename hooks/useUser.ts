"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/supabase-provider"

export function useUser() {
  const { supabase, user } = useSupabase()
  const [userData, setUserData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setUserData(null)
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.from("users").select("*").eq("id", user.id).single()

        if (error) {
          console.error("Error fetching user data:", error)
          setUserData(null)
        } else {
          setUserData(data)
        }
      } catch (error) {
        console.error("Error in useUser hook:", error)
        setUserData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [supabase, user])

  return { user: userData, loading }
}

// Re-export useSupabase for convenience
export { useSupabase } from "@/lib/supabase-provider"
