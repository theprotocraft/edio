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

    try {
      // Check if user profile exists
      const { data: user, error: userError } = await supabase
        .from("users")
        .select()
        .eq("id", data.user.id)
        .single()
      
      console.log("User check result:", { user, userError })
        
      if (userError && userError.code !== "PGRST116") {
        console.error("Error checking for existing user:", userError)
        return NextResponse.redirect(new URL("/login?error=user_check", request.url))
      }

      // If user doesn't exist, create it
      if (!user) {
        console.log("Creating new user profile:", {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata.full_name || data.user.user_metadata.name || "",
          role: userRole,
          avatar_url: data.user.user_metadata.avatar_url || null,
        })

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
          return NextResponse.redirect(new URL("/login?error=user_create", request.url))
        }

        if (!newUser) {
          console.error("No user data returned after creation")
          return NextResponse.redirect(new URL("/login?error=user_create_no_data", request.url))
        }
      }

      // URL to redirect to after sign in process completes
      return NextResponse.redirect(new URL("/dashboard", request.url))
    } catch (profileError) {
      console.error("Error handling user profile:", profileError)
      return NextResponse.redirect(new URL("/login?error=profile_error", request.url))
    }
  } catch (error) {
    console.error("Auth callback error:", error)
    return NextResponse.redirect(new URL("/?error=callback_failed", request.url))
  }
}
