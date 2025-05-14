import { type NextRequest, NextResponse } from "next/server"
import { createRouteSupabaseClient } from "@/app/supabase-route"
import { getS3Client } from "@/lib/s3-service"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabaseClient()

    // Use getUser instead of getSession for secure authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId, fileName, fileType, fileSize } = await request.json()

    if (!projectId || !fileName || !fileType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user has access to this project
    // First check if user is the owner
    const { data: ownedProject } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .single()

    // If not the owner, check if user is an editor
    let hasAccess = !!ownedProject

    if (!hasAccess) {
      const { data: editorAccess } = await supabase
        .from("project_editors")
        .select("project_id")
        .eq("project_id", projectId)
        .eq("editor_id", user.id)
        .single()

      hasAccess = !!editorAccess
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 })
    }

    // Generate a unique file key
    const fileKey = `projects/${projectId}/${Date.now()}-${fileName}`

    // Get S3 client
    const s3Client = getS3Client()

    // Generate presigned URL
    const presignedUrl = await s3Client.getSignedUrlPromise("putObject", {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      Expires: 300, // URL expires in 5 minutes
    })

    // Record the upload in the database
    const { data: upload, error } = await supabase
      .from("uploads")
      .insert({
        project_id: projectId,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize || 0,
        file_key: fileKey,
        uploaded_by: user.id,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error recording upload:", error)
      return NextResponse.json({ error: "Failed to record upload" }, { status: 500 })
    }

    return NextResponse.json({
      presignedUrl,
      fileKey,
      uploadId: upload.id,
    })
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
