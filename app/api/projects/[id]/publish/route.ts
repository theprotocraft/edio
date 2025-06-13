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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, role)
      `)
      .eq("id", projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Verify project ownership and role
    if (project.owner.id !== user.id || project.owner.role !== "youtuber") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Check if YouTube channel is set
    if (!project.youtube_channel_id) {
      return NextResponse.json(
        { error: "YouTube channel not set for this project" },
        { status: 400 }
      )
    }

    // Get the latest video version
    const { data: latestVersion, error: versionError } = await supabase
      .from("video_versions")
      .select("*")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single()

    if (versionError || !latestVersion) {
      return NextResponse.json(
        { error: "No video version found to publish" },
        { status: 400 }
      )
    }

    try {
      // Get YouTube client
      const youtube = await getYouTubeClient(user.id)

      // Upload to YouTube
      const uploadResult = await uploadVideoToYouTube({
        youtube,
        videoUrl: latestVersion.file_url,
        title: project.video_title || project.project_title,
        description: project.description || "",
        channelId: project.youtube_channel_id,
        privacyStatus: "private"
      })

      // Update project with YouTube video ID
      await supabase
        .from("projects")
        .update({
          youtube_video_id: uploadResult.id,
          status: "published"
        })
        .eq("id", projectId)

      return NextResponse.json({ 
        success: true,
        message: "Video published to YouTube in private mode",
        videoId: uploadResult.id
      })
    } catch (error: any) {
      // If token expired, try to refresh and retry
      if (error.message?.includes("token")) {
        try {
          console.log("Token expired, refreshing...")
          await refreshYouTubeToken(user.id)
          // Retry the upload with new token
          const youtube = await getYouTubeClient(user.id)
          
          const uploadResult = await uploadVideoToYouTube({
            youtube,
            videoUrl: latestVersion.file_url,
            title: project.video_title || project.project_title,
            description: project.description || "",
            channelId: project.youtube_channel_id,
            privacyStatus: "private"
          })

          await supabase
            .from("projects")
            .update({
              youtube_video_id: uploadResult.id,
              status: "published"
            })
            .eq("id", projectId)

          return NextResponse.json({ 
            success: true,
            message: "Video published to YouTube in private mode",
            videoId: uploadResult.id
          })
        } catch (retryError: any) {
          console.error("Error in retry upload:", retryError)
          return NextResponse.json(
            { error: "Failed to upload video to YouTube after token refresh" },
            { status: 500 }
          )
        }
      }

      console.error("Error uploading to YouTube:", error)
      return NextResponse.json(
        { error: error.message || "Failed to upload video to YouTube" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in publish route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 