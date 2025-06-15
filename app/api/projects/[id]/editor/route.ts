import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function PUT(
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

    // Get request body
    const { editorId } = await request.json()

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    if (project.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Update project editor
    const { error: updateError } = await supabase
      .from("projects")
      .update({ editor_id: editorId === "unassigned" ? null : editorId })
      .eq("id", projectId)

    if (updateError) {
      console.error("Error updating project editor:", updateError)
      return NextResponse.json(
        { error: "Failed to update project editor" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in update editor route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 