import { NextResponse } from "next/server"
import { createServerClient } from "@/app/lib/supabase-server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = resolvedParams.id
    const supabase = await createServerClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Verify project ownership
    if (project.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Check if project is approved
    if (project.status !== "approved") {
      return NextResponse.json(
        { error: "Project must be approved before publishing" },
        { status: 400 }
      )
    }

    // Check if YouTube channel is selected
    if (!project.youtube_channel_id) {
      return NextResponse.json(
        { error: "YouTube channel must be selected before publishing" },
        { status: 400 }
      )
    }

    // TODO: Implement actual YouTube publishing logic here
    // This would involve:
    // 1. Getting the latest video version
    // 2. Uploading to YouTube
    // 3. Setting video metadata (title, description, etc.)
    // 4. Publishing the video

    // For now, we'll just return a success response
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in publish route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 