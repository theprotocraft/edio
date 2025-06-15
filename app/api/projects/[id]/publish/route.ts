import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getYouTubeClientByChannel, uploadVideoToYouTubeByChannel } from "@/lib/youtube-service"
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
    const { versionId, privacyStatus } = await request.json()

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

    // Check if user owns the project
    if (project.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Check if YouTube channel is connected
    if (!project.youtube_channel_id) {
      return NextResponse.json(
        { error: "No YouTube channel connected" },
        { status: 400 }
      )
    }

    // Get the specified video version
    const { data: version, error: versionError } = await supabase
      .from("video_versions")
      .select("*")
      .eq("id", versionId)
      .eq("project_id", projectId)
      .single()

    if (versionError || !version) {
      return NextResponse.json(
        { error: "Video version not found" },
        { status: 404 }
      )
    }

    // Get thumbnail from uploads table
    const { data: thumbnailUpload, error: thumbnailError } = await supabase
      .from("uploads")
      .select("file_url")
      .eq("project_id", projectId)
      .eq("file_type", "thumbnail")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (thumbnailError) {
      console.error("Error fetching thumbnail:", thumbnailError)
    }

    // Generate presigned URL for thumbnail if it exists
    let thumbnailPresignedUrl = null
    if (thumbnailUpload?.file_url) {
      try {
        // Extract the file path from the full S3 URL
        const url = new URL(thumbnailUpload.file_url)
        const filePath = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname
        
        // Get presigned URL for the thumbnail
        const { presignedUrl, error } = await generatePresignedViewUrl({ filePath })
        
        if (!error && presignedUrl) {
          thumbnailPresignedUrl = presignedUrl
          console.log("Using thumbnail for YouTube upload:", thumbnailPresignedUrl)
        } else {
          console.warn("Failed to generate presigned URL for thumbnail, using original URL")
          thumbnailPresignedUrl = thumbnailUpload.file_url
        }
      } catch (error) {
        console.error("Error processing thumbnail URL:", error)
        // Use original URL as fallback
        thumbnailPresignedUrl = thumbnailUpload.file_url
      }
    } else {
      console.log("No thumbnail found for project")
    }

    try {
      // Get YouTube client using the legacy channel-based method
      const youtube = await getYouTubeClientByChannel(project.youtube_channel_id)

      // Upload video using the legacy function
      const uploadResult = await uploadVideoToYouTubeByChannel({
        youtube,
        videoUrl: version.file_url,
        title: project.video_title || project.project_title,
        description: project.description || "",
        channelId: project.youtube_channel_id,
        privacyStatus: privacyStatus || "private",
        thumbnailUrl: thumbnailPresignedUrl,
        tags: []
      })

      // Update project with YouTube video ID
      await supabase
        .from("projects")
        .update({
          youtube_video_id: uploadResult.id,
          publishing_status: "completed"
        })
        .eq("id", projectId)

      return NextResponse.json({
        success: true,
        videoId: uploadResult.id,
        message: "Video published to YouTube successfully"
      })

    } catch (error: any) {
      console.error("YouTube upload error:", error)
      
      // Update project status to failed
      await supabase
        .from("projects")
        .update({
          publishing_status: "failed"
        })
        .eq("id", projectId)

      return NextResponse.json(
        { error: error.message || "Failed to upload to YouTube" },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Publish error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Get publish status
export async function GET(
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

    // Get project
    const { data: project, error } = await supabase
      .from("projects")
      .select("youtube_video_id, status")
      .eq("id", projectId)
      .single()

    if (error || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      isPublished: !!project.youtube_video_id,
      status: project.status,
      videoId: project.youtube_video_id
    })

  } catch (error) {
    console.error("Get publish status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 