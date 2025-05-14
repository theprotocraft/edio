import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Create a Supabase client
const getSupabase = () => createClientComponentClient<Database>()

// Project-related API functions
export async function getProjects() {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Get projects owned by the user
    const { data: ownedProjects, error: ownedError } = await supabase
      .from("projects")
      .select("*, users!projects_owner_id_fkey(first_name, last_name, avatar_url)")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })

    if (ownedError) throw ownedError

    // Get projects where the user is an editor
    const { data: editableProjects, error: editableError } = await supabase
      .from("project_editors")
      .select("project_id, projects(*, users!projects_owner_id_fkey(first_name, last_name, avatar_url))")
      .eq("editor_id", user.id)

    if (editableError) throw editableError

    // Combine and format the results
    const formattedEditableProjects = editableProjects
      .filter((item) => item.projects) // Filter out any null projects
      .map((item) => ({
        ...item.projects,
      }))

    const allProjects = [...ownedProjects, ...formattedEditableProjects]

    // Remove duplicates (in case user is both owner and editor)
    const uniqueProjects = Array.from(new Map(allProjects.map((project) => [project.id, project])).values())

    return { success: true, data: uniqueProjects }
  } catch (error) {
    console.error("Error fetching projects:", error)
    return { success: false, error }
  }
}

export async function getProject(id: string) {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Check if user is the owner
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, users!projects_owner_id_fkey(first_name, last_name, avatar_url)")
      .eq("id", id)
      .single()

    if (projectError) {
      // If not found as owner, check if user is an editor
      const { data: editorAccess, error: editorError } = await supabase
        .from("project_editors")
        .select("project_id, projects(*, users!projects_owner_id_fkey(first_name, last_name, avatar_url))")
        .eq("project_id", id)
        .eq("editor_id", user.id)
        .single()

      if (editorError) {
        throw new Error("Project not found or you do not have access")
      }

      return { success: true, data: editorAccess.projects }
    }

    return { success: true, data: project }
  } catch (error) {
    console.error("Error fetching project:", error)
    return { success: false, error }
  }
}

export async function createProject(projectData: any) {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Create the project
    const { data, error } = await supabase
      .from("projects")
      .insert({
        ...projectData,
        owner_id: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error creating project:", error)
    return { success: false, error }
  }
}

export async function updateProject(id: string, projectData: any) {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Check if user is the owner
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", id)
      .single()

    if (projectError) throw projectError

    if (project.owner_id !== user.id) {
      throw new Error("Only the project owner can update the project")
    }

    // Update the project
    const { data, error } = await supabase.from("projects").update(projectData).eq("id", id).select().single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error updating project:", error)
    return { success: false, error }
  }
}

export async function deleteProject(id: string) {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Check if user is the owner
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", id)
      .single()

    if (projectError) throw projectError

    if (project.owner_id !== user.id) {
      throw new Error("Only the project owner can delete the project")
    }

    // Delete the project
    const { error } = await supabase.from("projects").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error deleting project:", error)
    return { success: false, error }
  }
}

// Upload-related API functions
export async function getProjectUploads(projectId: string) {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Verify user has access to this project
    const hasAccess = await verifyProjectAccess(supabase, projectId, user.id)

    if (!hasAccess) {
      throw new Error("You do not have access to this project")
    }

    // Get uploads for the project
    const { data, error } = await supabase
      .from("uploads")
      .select("*, users!uploads_uploaded_by_fkey(first_name, last_name, avatar_url)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching project uploads:", error)
    return { success: false, error }
  }
}

export async function updateUploadStatus(uploadId: string, status: string) {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Update the upload status
    const { data, error } = await supabase.from("uploads").update({ status }).eq("id", uploadId).select().single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error updating upload status:", error)
    return { success: false, error }
  }
}

// Video version-related API functions
export async function getVideoVersions(projectId: string) {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Verify user has access to this project
    const hasAccess = await verifyProjectAccess(supabase, projectId, user.id)

    if (!hasAccess) {
      throw new Error("You do not have access to this project")
    }

    // Get video versions for the project
    const { data, error } = await supabase
      .from("video_versions")
      .select("*, users!video_versions_created_by_fkey(first_name, last_name, avatar_url)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching video versions:", error)
    return { success: false, error }
  }
}

export async function createVideoVersion(versionData: any) {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Verify user has access to this project
    const hasAccess = await verifyProjectAccess(supabase, versionData.project_id, user.id)

    if (!hasAccess) {
      throw new Error("You do not have access to this project")
    }

    // Create the video version
    const { data, error } = await supabase
      .from("video_versions")
      .insert({
        ...versionData,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error creating video version:", error)
    return { success: false, error }
  }
}

// Message-related API functions
export async function getProjectMessages(projectId: string) {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Verify user has access to this project
    const hasAccess = await verifyProjectAccess(supabase, projectId, user.id)

    if (!hasAccess) {
      throw new Error("You do not have access to this project")
    }

    // Get messages for the project
    const { data, error } = await supabase
      .from("messages")
      .select("*, users!messages_user_id_fkey(first_name, last_name, avatar_url)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching project messages:", error)
    return { success: false, error }
  }
}

export async function sendMessage(projectId: string, content: string) {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Verify user has access to this project
    const hasAccess = await verifyProjectAccess(supabase, projectId, user.id)

    if (!hasAccess) {
      throw new Error("You do not have access to this project")
    }

    // Send the message
    const { data, error } = await supabase
      .from("messages")
      .insert({
        project_id: projectId,
        user_id: user.id,
        content,
      })
      .select("*, users!messages_user_id_fkey(first_name, last_name, avatar_url)")
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error sending message:", error)
    return { success: false, error }
  }
}

// Helper function to verify project access
async function verifyProjectAccess(supabase: any, projectId: string, userId: string) {
  try {
    // Check if user is the owner
    const { data: ownedProject } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("owner_id", userId)
      .single()

    if (ownedProject) {
      return true
    }

    // Check if user is an editor
    const { data: editorAccess } = await supabase
      .from("project_editors")
      .select("project_id")
      .eq("project_id", projectId)
      .eq("editor_id", userId)
      .single()

    return !!editorAccess
  } catch (error) {
    return false
  }
}

// Notification-related API functions
export async function getNotifications() {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Get notifications for the user
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return { success: false, error }
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = getSupabase()

  try {
    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("User not authenticated")
    }

    // Update the notification
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id) // Ensure the notification belongs to the user
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return { success: false, error }
  }
}
