import { NextResponse } from "next/server"
import { createServerClient } from "@/app/lib/supabase-server"

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch user's YouTube channels from database
    const { data: channels, error } = await supabase
      .from("youtube_channels")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching YouTube channels:", error)
      return NextResponse.json(
        { error: "Failed to fetch YouTube channels" },
        { status: 500 }
      )
    }

    return NextResponse.json({ channels: channels || [] })
  } catch (error) {
    console.error("Error in YouTube channels route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 