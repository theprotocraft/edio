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
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(4)
      
    if (ownedError) {
      console.error("Error fetching owned projects:", ownedError)
    }

    // Fetch projects where user is an editor
    const { data: editorRelations, error: editorError } = await supabase
      .from("youtuber_editors")
      .select("youtuber_id")
      .eq("editor_id", user.id)
      .eq("status", "active")
      
    if (editorError) {
      console.error("Error fetching editor relations:", editorError)
    }

    // If user is an editor, fetch those project details
    let editedProjectsList = []
    if (editorRelations && editorRelations.length > 0) {
      const youtuberIds = editorRelations.map((er: { youtuber_id: string }) => er.youtuber_id)
      
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .in("owner_id", youtuberIds)
      
      if (error) {
        console.error("Error fetching editor project details:", error)
      } else {
        editedProjectsList = projects || []
      }
    }

    // Combine projects
    const projects = [
      ...(ownedProjects || []),
      ...editedProjectsList
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
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })

    if (ownedError) {
      console.error("Error fetching owned projects:", ownedError)
    }

    // Fetch projects where user is an editor
    const { data: editorRelations2, error: editorError2 } = await supabase
      .from("youtuber_editors")
      .select("youtuber_id")
      .eq("editor_id", user.id)
      .eq("status", "active")
      
    if (editorError2) {
      console.error("Error fetching editor relations:", editorError2)
    }

    // If user is an editor, fetch those project details
    let editedProjectsList = []
    if (editorRelations2 && editorRelations2.length > 0) {
      const youtuberIds = editorRelations2.map((er: { youtuber_id: string }) => er.youtuber_id)
      
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .in("owner_id", youtuberIds)
      
      if (error) {
        console.error("Error fetching editor project details:", error)
      } else {
        editedProjectsList = projects || []
      }
    }

    // Combine projects
    const projects = [
      ...(ownedProjects || []),
      ...editedProjectsList
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
      .from("youtuber_editors")
      .select(`
        id,
        editor_id,
        editor:users(id, name, email)
      `)
      .eq("youtuber_id", basicProject.owner_id)
      
    if (editorsError) {
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
      .select(`
        *,
        uploader:users(id, name, avatar_url)
      `)
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      
    if (uploadsError) {
      console.error("Error fetching uploads:", uploadsError)
    }
    
    // Step 5: Get video versions
    const { data: versions, error: versionsError } = await supabase
      .from("video_versions")
      .select(`
        *,
        uploader:users(id, name, avatar_url)
      `)
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
        sender:users(id, name, avatar_url)
      `)
      .eq("project_id", id)
      .order("created_at", { ascending: true })
      
    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
    }
    
    // Determine user role for this project
    const userRole = userIsOwner ? "creator" : "editor"
    
    return {
      project,
      uploads: uploads || [],
      versions: versions || [],
      messages: messages || [],
      userRole,
      userId: user.id
    }
  } catch (error) {
    console.error("Error in fetchProjectDetails:", error)
    return { project: null }
  }
} 