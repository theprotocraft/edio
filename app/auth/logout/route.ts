import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Database } from "@/types/supabase"

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  
  // Sign out the user
  await supabase.auth.signOut()
  
  // Redirect to the home page
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL))
} 