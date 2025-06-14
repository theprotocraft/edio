import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = resolvedParams.id
    const supabase = createServerClient()

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

    // Get messages with sender information
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(`
        *,
        sender:users(id, name, email, avatar_url)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
    }

    // Get video versions
    const { data: versions, error: versionsError } = await supabase
      .from("video_versions")
      .select(`
        *,
        uploader:users(id, name, email)
      `)
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })

    if (versionsError) {
      console.error("Error fetching versions:", versionsError)
    }

    // Get current user for userId
    const { data: { user } } = await supabase.auth.getUser()

    // Transform the data to match the expected format
    const transformedProject = {
      ...project,
      client: project.client,
      editor: project.editor,
      activeEditors: project.project_editors.map((pe: any) => pe.editor),
      youtube_channel_id: project.youtube_channel_id,
      uploads: uploads || [],
      messages: messages || [],
      versions: versions || [],
      userId: user?.id
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
    const supabase = createServerClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get request body
    const updates = await request.json()

    // Check if user is project owner or editor
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", params.id)
      .single()
      
    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Check if user is owner or editor
    const { data: editorRelation } = await supabase
      .from("project_editors")
      .select("editor_id")
      .eq("project_id", params.id)
      .eq("editor_id", user.id)
      .single()

    if (user.id !== project.owner_id && !editorRelation) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Update project
    const { data, error } = await supabase
      .from("projects")
      .update({
        project_title: updates.title,
        video_title: updates.videoTitle,
        description: updates.description,
        youtube_channel_id: updates.youtube_channel_id,
        publishing_status: updates.publishing_status,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating project:", error)
      return NextResponse.json(
        { error: "Failed to update project" },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PATCH route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 