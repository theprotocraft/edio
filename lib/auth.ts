"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { User } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import type { Database } from "@/types/supabase"

type SupabaseContext = {
  supabase: SupabaseClient<Database>
  user: User | null
  loading: boolean
  error: Error | null
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null)
  const router = useRouter()

  useEffect(() => {
    try {
      const supabaseClient = createClientComponentClient<Database>({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      })
      setSupabase(supabaseClient)

      const {
        data: { subscription },
      } = supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
          setUser(session.user)
        } else {
          setUser(null)
        }
        setLoading(false)
        router.refresh()
      })

      const getUser = async () => {
        try {
          const { data, error } = await supabaseClient.auth.getUser()
          if (error) {
            throw error
          }
          if (data.user) {
            setUser(data.user)
          }
        } catch (err) {
          console.error("Error getting user:", err)
          setError(err instanceof Error ? err : new Error(String(err)))
        } finally {
          setLoading(false)
        }
      }

      getUser()

      return () => {
        subscription.unsubscribe()
      }
    } catch (err) {
      console.error("Error initializing Supabase client:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
      setLoading(false)
    }
  }, [router])

  // If there's an error with Supabase initialization and we're on a protected route, redirect
  useEffect(() => {
    if (error && window.location.pathname.match(/^\/dashboard|^\/projects|^\/auth/)) {
      router.push("/setup-required")
    }
  }, [error, router])

  return (
    <Context.Provider
      value={{
        supabase: supabase as SupabaseClient<Database>,
        user,
        loading,
        error,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider")
  }
  return context
}
