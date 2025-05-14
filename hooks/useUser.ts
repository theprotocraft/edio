"use client"

import { useSupabase as useSupabaseProvider } from "@/lib/supabase-provider"
import type { User } from "@supabase/auth-helpers-nextjs"

export function useSupabase() {
  // Call the hook at the top level
  const supabaseContext = useSupabaseProvider()
  const user: User | null = supabaseContext.user
  const loading = supabaseContext.loading
  const error: Error | null = supabaseContext.error

  return {
    ...supabaseContext,
    user,
    loading,
    error,
    isAuthenticated: !!user,
  }
}
