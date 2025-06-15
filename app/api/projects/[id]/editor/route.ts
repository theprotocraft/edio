import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

// POST - Add editor to project
export async function POST(
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

    // Check if editor is already assigned to this project
    const { data: existingAssignment, error: checkError } = await supabase
      .from("project_editors")
      .select("id")
      .eq("project_id", projectId)
      .eq("editor_id", editorId)
      .single()

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Editor is already assigned to this project" },
        { status: 400 }
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in add editor route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Remove specific editor from project
export async function DELETE(
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

    // Get editor ID from query params
    const url = new URL(request.url)
    const editorId = url.searchParams.get('editorId')

    if (!editorId) {
      return NextResponse.json(
        { error: "Editor ID is required" },
        { status: 400 }
      )
    }

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

    // Remove specific editor assignment
    const { error: removeError } = await supabase
      .from("project_editors")
      .delete()
      .eq("project_id", projectId)
      .eq("editor_id", editorId)

    if (removeError) {
      console.error("Error removing project editor:", removeError)
      return NextResponse.json(
        { error: "Failed to remove project editor" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in remove editor route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 