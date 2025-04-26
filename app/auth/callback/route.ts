import { createRouteClient } from "@/app/supabase-route"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const userType = requestUrl.searchParams.get("user_type") || "creator"

  if (code) {
    const supabase = createRouteClient()

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // Check if user profile exists
      const { data: profile } = await supabase.from("profiles").select().eq("id", data.user.id).single()

      // If profile doesn't exist, create it
      if (!profile) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata.full_name || data.user.user_metadata.name || "",
          avatar_url: data.user.user_metadata.avatar_url || "",
          user_type: userType,
        })
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL("/dashboard", request.url))
}
