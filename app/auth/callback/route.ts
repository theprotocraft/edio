import { createRouteClient } from "@/app/supabase-route"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")
    const userRole = requestUrl.searchParams.get("role") === "editor" ? "editor" : "youtuber"

    if (!code) {
      console.error("No code provided in auth callback")
      return NextResponse.redirect(new URL("/login?error=no_code", request.url))
    }

    const supabase = createRouteClient()

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data?.user) {
      console.error("Auth exchange error:", error)
      return NextResponse.redirect(new URL("/login?error=auth_exchange", request.url))
    }

    try {
      // Check if user profile exists
      const { data: user } = await supabase.from("users").select().eq("id", data.user.id).single()

      // If user doesn't exist, create it
      if (!user) {
        const { error: insertError } = await supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata.full_name || data.user.user_metadata.name || "",
          role: userRole,
        })

        if (insertError) {
          console.error("Error creating user profile:", insertError)
        }
      }
    } catch (profileError) {
      console.error("Error handling user profile:", profileError)
      // Continue even if profile creation fails
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL("/dashboard", request.url))
  } catch (error) {
    console.error("Auth callback error:", error)
    // Redirect to home page if there's an error
    return NextResponse.redirect(new URL("/?error=callback_failed", request.url))
  }
}
