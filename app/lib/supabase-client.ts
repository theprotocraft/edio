import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Client-side Supabase client
export const createClient = () => {
  return createClientComponentClient<Database>()
} 