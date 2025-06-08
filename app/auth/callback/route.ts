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

    const supabase = await createRouteClient()

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    console.log("Auth exchange result:", { data, error })

    if (error || !data?.user) {
      console.error("Auth exchange error:", error)
      return NextResponse.redirect(new URL("/login?error=auth_exchange", request.url))
    }

    // Check if user profile exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select()
      .eq("id", data.user.id)
      .single()
      
    if (userError && userError.code !== "PGRST116") {
      console.error("Error checking for existing user:", userError)
    }

    // If user doesn't exist, create it or redirect to role selection
    if (!user) {
      // If a role was specified (from registration), create the user
      if (requestUrl.searchParams.has('role')) {
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata.full_name || data.user.user_metadata.name || "",
            role: userRole,
            avatar_url: data.user.user_metadata.avatar_url || null,
          })
          .select()
          .single()

        console.log("User creation result:", { newUser, insertError })

        if (insertError) {
          console.error("Error creating user profile:", insertError)
          return NextResponse.redirect(new URL("/login?error=profile_creation", request.url))
        }
      } else {
        // New user from sign-in flow, redirect to role selection
        return NextResponse.redirect(new URL(`/select-role?session=${encodeURIComponent(code)}`, request.url))
      }
    }

    // Successful authentication, redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url))
  } catch (error) {
    console.error("Auth callback error:", error)
    return NextResponse.redirect(new URL("/?error=callback_failed", request.url))
  }
}
