import { NextResponse } from "next/server"
import { createServerClient } from "@/app/lib/supabase-server"
import { getYouTubeClient, uploadVideoToYouTube, refreshYouTubeToken } from "@/lib/youtube-service"
import { generatePresignedViewUrl } from "@/lib/s3-service"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get request body
    const { videoTitle, description, hashtags, youtubeChannel } = await request.json()

    // Check if user is project owner
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", params.id)
      .single()
      
    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    if (user.id !== project.owner_id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Update project status to publishing
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        publishing_status: 'publishing',
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)

    if (updateError) {
      console.error("Error updating project status:", updateError)
      return NextResponse.json(
        { error: "Failed to update project status" },
        { status: 500 }
      )
    }

    // TODO: Implement actual YouTube publishing logic here
    // For now, we'll just simulate a delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Update project status to completed
    const { error: completeError } = await supabase
      .from("projects")
      .update({
        publishing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)

    if (completeError) {
      console.error("Error updating project status:", completeError)
      return NextResponse.json(
        { error: "Failed to update project status" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in publish route:", error)
    // Update project status to failed
    const supabase = await createServerClient()
    await supabase
      .from("projects")
      .update({
        publishing_status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 