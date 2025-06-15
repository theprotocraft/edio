import { NextResponse } from "next/server"
import { createServerClient } from "@/app/lib/supabase-server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const channelId = resolvedParams.id
    const supabase = createServerClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify channel ownership
    const { data: channel, error: channelError } = await supabase
      .from("youtube_channels")
      .select("user_id")
      .eq("id", channelId)
      .single()

    if (channelError || !channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      )
    }

    if (channel.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Delete the channel
    const { error: deleteError } = await supabase
      .from("youtube_channels")
      .delete()
      .eq("id", channelId)

    if (deleteError) {
      console.error("Error deleting YouTube channel:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete channel" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in delete channel route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 