import { createServerClient } from "@/app/lib/supabase-server"

// Server-side API functions

export async function fetchDashboardData() {
  try {
    const supabase = createServerClient()

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

    // Fetch projects where user is assigned as an editor
    const { data: editorAssignments, error: editorError } = await supabase
      .from("project_editors")
      .select("project_id")
      .eq("editor_id", user.id)
      
    if (editorError) {
      console.error("Error fetching editor assignments:", editorError)
    }

    // If user is assigned to projects as an editor, fetch those project details
    let assignedProjectsList = []
    if (editorAssignments && editorAssignments.length > 0) {
      const projectIds = editorAssignments.map((ea: { project_id: string }) => ea.project_id)
      
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds)
      
      if (error) {
        console.error("Error fetching assigned project details:", error)
      } else {
        assignedProjectsList = projects || []
      }
    }

    // Combine projects
    const projects = [
      ...(ownedProjects || []),
      ...assignedProjectsList
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
    const supabase = createServerClient()

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

    // Fetch projects where user is assigned as an editor
    const { data: editorAssignments, error: editorError } = await supabase
      .from("project_editors")
      .select("project_id")
      .eq("editor_id", user.id)
      
    if (editorError) {
      console.error("Error fetching editor assignments:", editorError)
    }

    // If user is assigned to projects as an editor, fetch those project details
    let assignedProjectsList = []
    if (editorAssignments && editorAssignments.length > 0) {
      const projectIds = editorAssignments.map((ea: { project_id: string }) => ea.project_id)
      
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds)
      
      if (error) {
        console.error("Error fetching assigned project details:", error)
      } else {
        assignedProjectsList = projects || []
      }
    }

    // Combine projects
    const projects = [
      ...(ownedProjects || []),
      ...assignedProjectsList
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

interface Editor {
  editor: {
    id: string
    name: string | null
    email: string | null
  }
}

interface ActiveEditor {
  id: string
  name: string | null
  email: string | null
}

export async function fetchProjectDetails(id: string) {
  try {
    const supabase = createServerClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { project: null }
    }
    
    // Step 1: Fetch basic project data
    const { data: basicProject, error: basicError } = await supabase
      .from("projects")
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, name, email),
        editor:users!editor_id(id, name, email)
      `)
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
    
    // Step 3: Get assigned editors from project_editors table
    const { data: assignedEditors, error: assignedEditorsError } = await supabase
      .from("project_editors")
      .select(`
        id,
        editor_id,
        editor:users(id, name, email)
      `)
      .eq("project_id", id)
    
    if (assignedEditorsError) {
      console.error("Error fetching assigned editors:", assignedEditorsError)
    }
    
    // Get all available editors for access control (from youtuber_editors - general relationships)
    const { data: allEditors } = await supabase
      .from("youtuber_editors")
      .select("editor_id")
      .eq("youtuber_id", basicProject.owner_id)
      .eq("status", "active")
    
    // Check access rights
    const userIsOwner = basicProject.owner_id === user.id
    const userIsAssignedEditor = assignedEditors?.some((e: { editor_id: string }) => e.editor_id === user.id) || false
    const userIsAvailableEditor = allEditors?.some((e: { editor_id: string }) => e.editor_id === user.id) || false
    
    if (!userIsOwner && !userIsAssignedEditor && !userIsAvailableEditor) {
      return { project: null }
    }
    
    // Combine project data
    const project = {
      ...basicProject,
      owner: owner || null,
      editors: assignedEditors || []
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

export async function addProjectEditor(projectId: string, editorId: string) {
  try {
    const supabase = createServerClient()
    
    // Check if user is project owner
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .single()
      
    if (projectError || !project) {
      throw new Error("Project not found")
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== project.owner_id) {
      throw new Error("Unauthorized")
    }
    
    // Add editor to project_editors table
    const { data, error } = await supabase
      .from("project_editors")
      .insert({
        project_id: projectId,
        editor_id: editorId
      })
      .select()
      .single()
      
    if (error) {
      throw error
    }
    
    return { success: true, data }
  } catch (error) {
    console.error("Error adding project editor:", error)
    return { success: false, error }
  }
}

export async function updateProject(
  projectId: string,
  updates: {
    title?: string
    videoTitle?: string
    description?: string
    hashtags?: string[]
    youtube_channel_id?: string
    publishing_status?: 'idle' | 'publishing' | 'completed' | 'failed'
  }
) {
  try {
    const supabase = createServerClient()

    // Check if user is project owner or editor
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .single()
      
    if (projectError || !project) {
      throw new Error("Project not found")
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error("Unauthorized")
    }

    // Check if user is owner or assigned editor
    const { data: editorRelation } = await supabase
      .from("project_editors")
      .select("editor_id")
      .eq("project_id", projectId)
      .eq("editor_id", user.id)
      .single()

    if (user.id !== project.owner_id && !editorRelation) {
      throw new Error("Unauthorized")
    }

    // Update project
    const { data, error } = await supabase
      .from("projects")
      .update({
        project_title: updates.title,
        video_title: updates.videoTitle,
        description: updates.description,
        hashtags: updates.hashtags,
        youtube_channel_id: updates.youtube_channel_id,
        publishing_status: updates.publishing_status,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error updating project:", error)
    return { success: false, error }
  }
} 