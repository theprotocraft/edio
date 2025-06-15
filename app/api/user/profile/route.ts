import { NextResponse } from "next/server"
import { createServerClient } from "@/app/lib/supabase-server"

export async function PATCH(request: Request) {
  try {
    const supabase = createServerClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get request body
    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    // Update user profile
    const { data, error } = await supabase
      .from("users")
      .update({ name: name.trim() })
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating user profile:", error)
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in profile update route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 