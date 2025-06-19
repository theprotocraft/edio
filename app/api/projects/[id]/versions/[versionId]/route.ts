import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id: projectId, versionId } = params

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role
    const { data: userData, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (roleError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get project and version details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { data: version, error: versionError } = await supabase
      .from("video_versions")
      .select("uploader_id, project_id")
      .eq("id", versionId)
      .single()

    if (versionError || !version) {
      return NextResponse.json({ error: "Video version not found" }, { status: 404 })
    }

    // Verify the version belongs to this project
    if (version.project_id !== projectId) {
      return NextResponse.json({ error: "Version does not belong to this project" }, { status: 400 })
    }

    // Check permissions
    const isYoutuber = userData.role === "youtuber"
    const isProjectOwner = project.owner_id === user.id
    const isVersionUploader = version.uploader_id === user.id

    // YouTuber (project owner) can delete any version, Editor can only delete their own
    const canDelete = (isYoutuber && isProjectOwner) || (!isYoutuber && isVersionUploader)

    if (!canDelete) {
      return NextResponse.json(
        { error: "You don't have permission to delete this video version" },
        { status: 403 }
      )
    }

    // Use service role client to bypass RLS for authorized deletion
    const { createClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Delete the video version
    const { error: deleteError } = await supabaseAdmin
      .from("video_versions")
      .delete()
      .eq("id", versionId)

    if (deleteError) {
      console.error("Failed to delete video version:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete video version" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete video version error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}