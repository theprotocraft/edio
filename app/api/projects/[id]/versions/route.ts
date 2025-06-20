import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { generatePresignedUrl } from "@/lib/s3-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = resolvedParams.id

    const supabase = await createServerClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Check if user has access to this project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Check if user is the owner or an assigned editor
    const isOwner = project.owner_id === user.id
    let isEditor = false

    if (!isOwner) {
      const { data: editorRelation } = await supabase
        .from("youtuber_editors")
        .select("id")
        .eq("youtuber_id", project.owner_id)
        .eq("editor_id", user.id)
        .eq("status", "active")
        .single()

      isEditor = !!editorRelation
    }

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Fetch video versions for this project
    const { data: versions, error: versionsError } = await supabase
      .from("video_versions")
      .select(`
        id,
        version_number,
        file_url,
        notes,
        created_at,
        uploader_id,
        uploader:users(id, name, email)
      `)
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })

    if (versionsError) {
      console.error("Error fetching versions:", versionsError)
      return NextResponse.json(
        { error: "Failed to fetch video versions" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      versions: versions || []
    })
  } catch (error) {
    console.error("Error in versions GET API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { fileName, contentType, fileSize, notes } = await request.json()
    const resolvedParams = await params
    const projectId = resolvedParams.id

    if (!fileName || !contentType || !fileSize || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!notes || !notes.trim()) {
      return NextResponse.json(
        { error: "Version notes are required" },
        { status: 400 }
      )
    }

    // Validate file size (10GB max)
    const maxSize = 10 * 1024 * 1024 * 1024 // 10GB
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10GB limit" },
        { status: 400 }
      )
    }

    // Validate content type
    if (!contentType.startsWith("video/")) {
      return NextResponse.json(
        { error: "Only video files are allowed" },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Check if user has access to this project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Check if user is the owner or an assigned editor
    const isOwner = project.owner_id === user.id
    let isEditor = false

    if (!isOwner) {
      const { data: editorRelation } = await supabase
        .from("youtuber_editors")
        .select("id")
        .eq("youtuber_id", project.owner_id)
        .eq("editor_id", user.id)
        .eq("status", "active")
        .single()

      isEditor = !!editorRelation
    }

    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Get the next version number
    const { data: versions } = await supabase
      .from("video_versions")
      .select("version_number")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(1)

    const nextVersionNumber = versions && versions.length > 0 
      ? versions[0].version_number + 1 
      : 1

    // Generate a unique file name
    const timestamp = Date.now()
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const s3Key = `projects/${projectId}/versions/v${nextVersionNumber}_${timestamp}_${cleanFileName}`

    // Generate presigned URL for upload
    const result = await generatePresignedUrl({
      fileName: cleanFileName,
      contentType,
      fileType: "video",
      customPath: s3Key
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    const { uploadUrl, fileUrl } = result

    // Create the video version record
    const { data: version, error: versionError } = await supabase
      .from("video_versions")
      .insert({
        project_id: projectId,
        uploader_id: user.id,
        version_number: nextVersionNumber,
        file_url: fileUrl,
        notes: notes.trim(),
      })
      .select("id")
      .single()

    if (versionError) {
      console.error("Error creating version:", versionError)
      return NextResponse.json(
        { error: "Failed to create version record" },
        { status: 500 }
      )
    }

    // Get user role to update project status if needed
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    // Update project status to "in_review" if editor submitted a version
    if (userData?.role === "editor") {
      await supabase
        .from("projects")
        .update({ status: "in_review" })
        .eq("id", projectId)
    }

    return NextResponse.json({
      uploadUrl,
      versionId: version.id,
      versionNumber: nextVersionNumber,
    })
  } catch (error) {
    console.error("Error in version upload API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}