import { createServerClient } from "@/lib/supabase-server"

// Server-side API functions

export async function fetchDashboardData() {
  try {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { user: null, projects: [], notifications: [], isCreator: false }
    }

    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()
      
    if (userError) {
      console.error("Error fetching user profile:", userError)
      return { user: null, projects: [], notifications: [], isCreator: false }
    }

    // Fetch owned projects
    const { data: ownedProjects, error: ownedError } = await supabase
      .from("projects")
      .select(`
        *,
        owner:users(id, name, email),
        editors:project_editors(
          id, 
          editor_id,
          editor:users(id, name, email)
        )
      `)
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(4)
      
    if (ownedError) {
      console.error("Error fetching owned projects:", ownedError)
    }

    // Fetch projects where user is an editor
    const { data: editedProjects, error: editedError } = await supabase
      .from("project_editors")
      .select(`
        id,
        project_id,
        editor_id,
        project:projects(
          *,
          owner:users(id, name, email),
          editors:project_editors(
            id, 
            editor_id,
            editor:users(id, name, email)
          )
        )
      `)
      .eq("editor_id", user.id)
      .eq("status", "active")
      
    if (editedError) {
      console.error("Error fetching edited projects:", editedError)
    }

    // Combine projects
    const projects = [
      ...(ownedProjects || []),
      ...(editedProjects?.map((item: { project: any }) => item.project) || [])
    ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4);

    // Fetch notifications
    const { data: notifications, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      
    if (notifError) {
      console.error("Error fetching notifications:", notifError)
    }

    const isCreator = userData?.role === "youtuber"

    return {
      user: userData,
      projects: projects || [],
      notifications: notifications || [],
      isCreator,
    }
  } catch (error) {
    console.error("Error in fetchDashboardData:", error)
    return { user: null, projects: [], notifications: [], isCreator: false }
  }
}

export async function fetchProjects() {
  try {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { user: null, projects: [], isCreator: false }
    }

    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()
      
    if (userError) {
      console.error("Error fetching user profile:", userError)
      return { user: null, projects: [], isCreator: false }
    }

    // Fetch owned projects
    const { data: ownedProjects, error: ownedError } = await supabase
      .from("projects")
      .select(`
        id,
        project_title,
        description,
        status,
        thumbnail_url,
        created_at,
        updated_at,
        owner_id,
        owner:users(id, name, email)
      `)
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })

      console.log(ownedProjects);
    if (ownedError) {
      console.error("Error fetching owned projects:", ownedError)
    }

    // Fetch projects where user is an editor
    const { data: editorProjects, error: editorError } = await supabase
      .from("project_editors")
      .select("project_id")
      .eq("editor_id", user.id)
      
    if (editorError) {
      console.error("Error fetching editor projects:", editorError)
    }

    // If user is an editor on any projects, fetch those project details
    let editedProjects = []
    if (editorProjects && editorProjects.length > 0) {
      const projectIds = editorProjects.map((ep: { project_id: string }) => ep.project_id)
      
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds)
      
      if (error) {
        console.error("Error fetching editor project details:", error)
      } else {
        editedProjects = projects || []
      }
    }

    // Combine projects
    const projects = [
      ...(ownedProjects || []),
      ...editedProjects
    ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const isCreator = userData?.role === "youtuber"

    return {
      user: userData,
      projects: projects || [],
      isCreator,
    }
  } catch (error) {
    console.error("Error in fetchProjects:", error)
    return { user: null, projects: [], isCreator: false }
  }
}

export async function fetchProjectDetails(id: string) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { project: null }
    }
    
    // Step 1: Fetch basic project data
    const { data: basicProject, error: basicError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single()
      
    if (basicError) {
      console.error("Error fetching basic project:", basicError)
      return { project: null }
    }
    
    if (!basicProject) {
      return { project: null }
    }
    
    // Step 2: Get owner data
    const { data: owner, error: ownerError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", basicProject.owner_id)
      .single()
      
    if (ownerError && ownerError.code !== 'PGRST116') {
      console.error("Error fetching owner:", ownerError)
    }
    
    // Step 3: Get editors data
    const { data: editors, error: editorsError } = await supabase
      .from("project_editors")
      .select(`
        id,
        editor_id,
        editor:users(id, name, email)
      `)
      .eq("project_id", id)
      
    if (editorsError) {
      console.log("hereiii")
      console.log(editorsError)
      console.error("Error fetching editors:", editorsError)
    }
    
    // Check access rights
    const userIsOwner = basicProject.owner_id === user.id
    const userIsEditor = editors?.some((e: { editor_id: string }) => e.editor_id === user.id) || false
    
    if (!userIsOwner && !userIsEditor) {
      return { project: null }
    }
    
    // Combine project data
    const project = {
      ...basicProject,
      owner: owner || null,
      editors: editors || []
    }
    
    // Step 4: Get uploads
    const { data: uploads, error: uploadsError } = await supabase
      .from("uploads")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      
    if (uploadsError) {
      console.error("Error fetching uploads:", uploadsError)
    }
    
    // Step 5: Get versions
    const { data: versions, error: versionsError } = await supabase
      .from("video_versions")
      .select("*")
      .eq("project_id", id)
      .order("version_number", { ascending: false })
      
    if (versionsError) {
      console.error("Error fetching versions:", versionsError)
    }
    
    // Step 6: Get messages
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(`
        *,
        sender:users(id, name, email)
      `)
      .eq("project_id", id)
      .order("created_at", { ascending: true })
      
    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
    }
    
    return {
      project,
      uploads: uploads || [],
      versions: versions || [],
      messages: messages || [],
      userRole: userIsOwner ? "creator" : "editor",
      userId: user.id
    }
  } catch (error) {
    console.error("Unexpected error in fetchProjectDetails:", error)
    return { project: null }
  }
} 