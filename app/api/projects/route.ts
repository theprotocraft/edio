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
    
    let allProjects = []
    
    if (isCreator) {
      // If user is a creator, show only their projects
      const { data: ownedProjects, error: ownedError } = await supabase
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
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
      
      if (ownedError) {
        console.error("Error fetching owned projects:", ownedError)
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
      }
      
      allProjects = ownedProjects || []
    } else {
      // If user is an editor, show projects they're assigned to
      const { data: editorAssignments, error: assignmentError } = await supabase
        .from("project_editors")
        .select("project_id")
        .eq("editor_id", user.id)
      
      if (assignmentError) {
        console.error("Error fetching editor assignments:", assignmentError)
        return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
      }
      
      const projectIds = editorAssignments?.map(ea => ea.project_id) || []
      
      if (projectIds.length === 0) {
        return NextResponse.json({ 
          user, 
          projects: [], 
          isCreator 
        })
      }
      
      const { data: assignedProjects, error: projectsError } = await supabase
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
        .in("id", projectIds)
        .order("updated_at", { ascending: false })
      
      if (projectsError) {
        console.error("Error fetching assigned projects:", projectsError)
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
      }
      
      allProjects = assignedProjects || []
    }
    
    // Transform projects to match expected format
    const transformedProjects = allProjects.map(project => ({
      id: project.id,
      title: project.project_title,
      description: project.description,
      status: project.status,
      created_at: project.created_at,
      updated_at: project.updated_at,
      owner: project.users
    }))
    
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
      selectedEditors
    } = await request.json()
    
    // Validate required fields
    if (!projectTitle) {
      return NextResponse.json({ error: "Project title is required" }, { status: 400 })
    }
    
    // Create project record
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        project_title: projectTitle,
        video_title: videoTitle || null,
        description: description || null,
        owner_id: user.id,
        status: "pending"
      })
      .select()
      .single()
      
    if (projectError || !project) {
      console.error("Error creating project:", projectError)
      return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
    }

    // Project is created without initial video - videos can be added later
    
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