import { NextResponse } from "next/server"
import { createServerClient } from "@/app/lib/supabase-server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = resolvedParams.id
    const supabase = await createServerClient()

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        editor:users!projects_editor_id_fkey (
          id,
          name,
          email
        ),
        owner:users!projects_owner_id_fkey (
          id,
          name,
          email
        ),
        project_editors (
          editor:users (
            id,
            name,
            email
          )
        )
      `)
      .eq("id", projectId)
      .single()

    if (projectError) {
      console.error("Error fetching project:", projectError)
      return NextResponse.json(
        { error: "Failed to fetch project" },
        { status: 500 }
      )
    }

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Transform the data to match the expected format
    const transformedProject = {
      ...project,
      client: project.client,
      editor: project.editor,
      activeEditors: project.project_editors.map((pe: any) => pe.editor)
    }

    return NextResponse.json(transformedProject)
  } catch (error) {
    console.error("Error in project route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 