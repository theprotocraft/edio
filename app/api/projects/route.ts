import { NextResponse } from "next/server"
import { createRouteClient } from "@/app/supabase-route"

export async function GET(request: Request) {
  try {
    const supabase = await createRouteClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to determine role
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
      
    if (profileError || !userData) {
      return NextResponse.json({ error: "User profile not found" }, { status: 400 })
    }
    
    const isCreator = userData.role === "youtuber"
    
    // Fetch projects based on user role
    let projectsQuery = supabase
      .from("projects")
      .select(`
        id,
        project_title,
        description,
        status,
        created_at,
        updated_at,
        owner_id,
        users!projects_owner_id_fkey(name, avatar_url)
      `)
      .order("updated_at", { ascending: false })
    
    // If user is an editor, only show projects they're assigned to
    if (!isCreator) {
      const { data: editorProjects } = await supabase
        .from("project_editors")
        .select("project_id")
        .eq("editor_id", user.id)
        .eq("status", "accepted")
      
      const projectIds = editorProjects?.map(ep => ep.project_id) || []
      
      if (projectIds.length === 0) {
        return NextResponse.json({ 
          user, 
          projects: [], 
          isCreator 
        })
      }
      
      projectsQuery = projectsQuery.in("id", projectIds)
    } else {
      // If user is a creator, show only their projects
      projectsQuery = projectsQuery.eq("owner_id", user.id)
    }
    
    const { data: projects, error: projectsError } = await projectsQuery
    
    if (projectsError) {
      console.error("Error fetching projects:", projectsError)
      return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
    }
    
    // Transform projects to match expected format
    const transformedProjects = projects?.map(project => ({
      id: project.id,
      title: project.project_title,
      description: project.description,
      status: project.status,
      created_at: project.created_at,
      updated_at: project.updated_at,
      owner: project.users
    })) || []
    
    return NextResponse.json({ 
      user, 
      projects: transformedProjects, 
      isCreator 
    })
  } catch (error) {
    console.error("Error in projects GET API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createRouteClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to verify role
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
      
    if (profileError || !userData) {
      return NextResponse.json({ error: "User profile not found" }, { status: 400 })
    }
    
    if (userData.role !== "youtuber") {
      return NextResponse.json({ error: "Only content creators can create projects" }, { status: 403 })
    }
    
    // Get request body
    const {
      projectTitle,
      videoTitle,
      description,
      hashtags,
      fileUrl,
      fileName,
      fileSize,
      selectedEditors
    } = await request.json()
    
    // Validate required fields
    if (!projectTitle) {
      return NextResponse.json({ error: "Project title is required" }, { status: 400 })
    }
    
    if (!fileUrl || !fileName || !fileSize) {
      return NextResponse.json({ error: "File information is required" }, { status: 400 })
    }
    
    // Create project record
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        project_title: projectTitle,
        video_title: videoTitle || null,
        description: description || null,
        // hashtags: hashtags || null,
        owner_id: user.id,
        status: "pending",
        editor_id: editorId || null
      })
      .select()
      .single()
      
    if (projectError || !project) {
      console.error("Error creating project:", projectError)
      return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
    }

    // If an editor was assigned, create the project_editors record
    if (editorId) {
      const { error: editorError } = await supabase.rpc('add_project_editor', {
        p_project_id: project.id,
        p_editor_id: editorId
      })

      if (editorError) {
        console.error("Error assigning editor:", editorError)
        // Don't fail the request, just log the error
      }
    }
    
    // Create upload record
    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .insert({
        project_id: project.id,
        user_id: user.id,
        file_url: fileUrl,
        file_type: "video",
        file_name: fileName,
        file_size: fileSize
      })
      .select()
      .single()
      
    if (uploadError || !upload) {
      console.error("Error creating upload record:", uploadError)
      // Project was created but upload record failed
      // We could roll back the project here, but let's keep it simple for now
      return NextResponse.json({ 
        projectId: project.id,
        warning: "Project created but upload record may be incomplete" 
      })
    }
    
    // Create initial video version record (version 1)
    const { error: versionError } = await supabase
      .from("video_versions")
      .insert({
        project_id: project.id,
        uploader_id: user.id,
        version_number: 1, // Initial version is always 1
        file_url: fileUrl,
        notes: "Initial upload"
      })
    
    if (versionError) {
      console.error("Error creating version record:", versionError)
      return NextResponse.json({ 
        projectId: project.id,
        warning: "Project created but version record may be incomplete"
      })
    }
    
    // Assign selected editors to the project
    if (selectedEditors && selectedEditors.length > 0) {
      // First, verify that all selected editors have an active relationship with this YouTuber
      const { data: validEditors, error: validationError } = await supabase
        .from("youtuber_editors")
        .select("editor_id")
        .eq("youtuber_id", user.id)
        .eq("status", "active")
        .in("editor_id", selectedEditors)
      
      if (validationError) {
        console.error("Error validating editors:", validationError)
        return NextResponse.json({ 
          projectId: project.id,
          warning: "Project created but editor assignments may be incomplete"
        })
      }
      
      const validEditorIds = validEditors?.map(ve => ve.editor_id) || []
      
      if (validEditorIds.length > 0) {
        // Insert editor assignments into project_editors table
        const editorAssignments = validEditorIds.map(editorId => ({
          project_id: project.id,
          editor_id: editorId
        }))
        
        const { error: assignmentError } = await supabase
          .from("project_editors")
          .insert(editorAssignments)
        
        if (assignmentError) {
          console.error("Error saving editor assignments:", assignmentError)
          return NextResponse.json({ 
            projectId: project.id,
            warning: "Project created but editor assignments may be incomplete"
          })
        }
      }
    }
    
    return NextResponse.json({ projectId: project.id })
  } catch (error: any) {
    console.error("Error in POST /api/projects:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
} 