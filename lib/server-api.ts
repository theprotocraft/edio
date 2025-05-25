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
        owner:users!projects_owner_id_fkey(id, name, email),
        editors:project_editors(editor_id, editor:users(id, name, email))
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
        project:projects(
          *,
          owner:users!projects_owner_id_fkey(id, name, email),
          editors:project_editors(editor_id, editor:users(id, name, email))
        )
      `)
      .eq("editor_id", user.id)
      
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
        *,
        owner:users!projects_owner_id_fkey(id, name, email),
        editors:project_editors(editor_id, editor:users(id, name, email))
      `)
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      
    if (ownedError) {
      console.error("Error fetching owned projects:", ownedError)
    }

    // Fetch projects where user is an editor
    const { data: editedProjects, error: editedError } = await supabase
      .from("project_editors")
      .select(`
        project:projects(
          *,
          owner:users!projects_owner_id_fkey(id, name, email),
          editors:project_editors(editor_id, editor:users(id, name, email))
        )
      `)
      .eq("editor_id", user.id)
      
    if (editedError) {
      console.error("Error fetching edited projects:", editedError)
    }

    // Combine projects
    const projects = [
      ...(ownedProjects || []),
      ...(editedProjects?.map((item: { project: any }) => item.project) || [])
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

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { project: null }
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, name, email),
        editors:project_editors(editor_id, editor:users(id, name, email))
      `)
      .eq("id", id)
      .single()
      
    if (projectError) {
      console.error("Error fetching project details:", projectError)
      return { project: null }
    }

    if (!project) {
      return { project: null }
    }

    // Check if user has access to this project
    const userIsOwner = project.owner_id === user.id
    const userIsEditor = project.editors.some((editor: any) => editor.editor_id === user.id)

    if (!userIsOwner && !userIsEditor) {
      return { project: null }
    }

    // Fetch project uploads
    const { data: uploads, error: uploadsError } = await supabase
      .from("uploads")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      
    if (uploadsError) {
      console.error("Error fetching uploads:", uploadsError)
    }

    // Fetch video versions
    const { data: versions, error: versionsError } = await supabase
      .from("video_versions")
      .select("*")
      .eq("project_id", id)
      .order("version_number", { ascending: false })
      
    if (versionsError) {
      console.error("Error fetching versions:", versionsError)
    }

    // Fetch chat messages
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
      userId: user.id,
    }
  } catch (error) {
    console.error("Error in fetchProjectDetails:", error)
    return { project: null }
  }
} 