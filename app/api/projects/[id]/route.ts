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

    // Get uploads
    const { data: uploads, error: uploadsError } = await supabase
      .from("uploads")
      .select(`
        *,
        uploader:users(id, name, avatar_url)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (uploadsError) {
      console.error("Error fetching uploads:", uploadsError)
    }

    // Transform the data to match the expected format
    const transformedProject = {
      ...project,
      client: project.client,
      editor: project.editor,
      activeEditors: project.project_editors.map((pe: any) => pe.editor),
      youtube_channel_id: project.youtube_channel_id,
      uploads: uploads || []
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const {
      title,
      videoTitle,
      description,
      hashtags,
      youtube_channel_id,
      thumbnail
    } = await request.json()

    // Prepare update data
    const updateData: any = {
      project_title: title,
      video_title: videoTitle,
      description,
      youtube_channel_id
    }

    // Add thumbnail fields if provided
    if (thumbnail) {
      updateData.thumbnail_url = thumbnail.url
      updateData.thumbnail_name = thumbnail.name
      updateData.thumbnail_size = thumbnail.size
    }

    // Update project
    const { data: project, error: updateError } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating project:", updateError)
      return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error in PATCH /api/projects/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 