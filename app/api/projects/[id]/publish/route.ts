import { NextResponse } from "next/server"
import { createServerClient } from "@/app/lib/supabase-server"
import { getYouTubeClient, uploadVideoToYouTube, refreshYouTubeToken } from "@/lib/youtube-service"
import { generatePresignedViewUrl } from "@/lib/s3-service"

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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get request body
    const { videoTitle, description, hashtags, youtubeChannel, thumbnailUrl } = await request.json()

    // Check if user is project owner
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id, final_version_number")
      .eq("id", projectId)
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

    // Get the latest video version
    const { data: videoVersion, error: versionError } = await supabase
      .from("video_versions")
      .select("file_url")
      .eq("project_id", projectId)
      .eq("version_number", project.final_version_number)
      .single()

    if (versionError || !videoVersion) {
      return NextResponse.json(
        { error: "No video version found for publishing" },
        { status: 400 }
      )
    }

    // Update project status to publishing
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        publishing_status: 'publishing',
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId)

    if (updateError) {
      console.error("Error updating project status:", updateError)
      return NextResponse.json(
        { error: "Failed to update project status" },
        { status: 500 }
      )
    }

    try {
      // Get YouTube client using channel ID
      const youtube = await getYouTubeClient(youtubeChannel)
      if (!youtube) {
        throw new Error("Failed to get YouTube client. Please ensure you have connected your YouTube account.")
      }

      // Try to refresh token if needed
      // try {
      //   await refreshYouTubeToken(youtubeChannel)
      // } catch (refreshError) {
      //   console.error("Error refreshing YouTube token:", refreshError)
      //   throw new Error("Your YouTube session has expired. Please reconnect your YouTube account.")
      // }

      // Upload video to YouTube
      const videoResponse = await uploadVideoToYouTube({
        youtube,
        videoUrl: videoVersion.file_url,
        title: videoTitle,
        description: description,
        channelId: youtubeChannel,
        thumbnailUrl: thumbnailUrl,
        tags: hashtags ? hashtags.split(" ").filter((tag: string) => tag.startsWith("#")) : []
      })

      // Update project status to completed
      const { error: completeError } = await supabase
        .from("projects")
        .update({
          publishing_status: 'completed',
          youtube_video_id: videoResponse.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId)

      if (completeError) {
        console.error("Error updating project status:", completeError)
        return NextResponse.json(
          { error: "Failed to update project status" },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, videoId: videoResponse.id })
    } catch (error: any) {
      console.error("Error publishing to YouTube:", error)
      // Update project status to failed
      await supabase
        .from("projects")
        .update({
          publishing_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId)

      // Return a more user-friendly error message
      const errorMessage = error.message.includes("authentication") 
        ? "Your YouTube session has expired. Please reconnect your YouTube account."
        : error.message || "Failed to publish to YouTube"

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
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
      .eq("id", (await params).id)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 