import { NextResponse } from "next/server"
import { createServerClient } from "@/app/lib/supabase-server"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = resolvedParams.id
    const supabase = createServerClient()

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

    if (editorId === "unassigned") {
      // Remove all editor assignments for this project
      const { error: removeError } = await supabase
        .from("project_editors")
        .delete()
        .eq("project_id", projectId)

      if (removeError) {
        console.error("Error removing project editors:", removeError)
        return NextResponse.json(
          { error: "Failed to remove project editors" },
          { status: 500 }
        )
      }
    } else {
      // First, verify the editor has an active relationship with this YouTuber
      const { data: editorRelation, error: relationError } = await supabase
        .from("youtuber_editors")
        .select("editor_id")
        .eq("youtuber_id", user.id)
        .eq("editor_id", editorId)
        .eq("status", "active")
        .single()

      if (relationError || !editorRelation) {
        return NextResponse.json(
          { error: "Editor not found or not authorized" },
          { status: 400 }
        )
      }

      // Remove existing assignments and add the new one
      const { error: removeError } = await supabase
        .from("project_editors")
        .delete()
        .eq("project_id", projectId)

      if (removeError) {
        console.error("Error removing existing project editors:", removeError)
        return NextResponse.json(
          { error: "Failed to update project editor" },
          { status: 500 }
        )
      }

      // Add new assignment
      const { error: addError } = await supabase
        .from("project_editors")
        .insert({
          project_id: projectId,
          editor_id: editorId
        })

      if (addError) {
        console.error("Error adding project editor:", addError)
        return NextResponse.json(
          { error: "Failed to assign project editor" },
          { status: 500 }
        )
      }
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