import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Upload a file to S3 via presigned URL
export async function uploadFile(file: File, projectId: string) {
  try {
    const response = await fetch("/api/uploads/presigned-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        projectId,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to get presigned URL")
    }

    const { url, fields, key } = await response.json()

    const formData = new FormData()
    Object.entries(fields).forEach(([field, value]) => {
      formData.append(field, value as string)
    })
    formData.append("file", file)

    const uploadResponse = await fetch(url, {
      method: "POST",
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file")
    }

    return { key, success: true }
  } catch (error) {
    console.error("Error uploading file:", error)
    return { success: false, error }
  }
}

// Delete a file from S3
export async function deleteFile(key: string) {
  try {
    const response = await fetch(`/api/uploads/${encodeURIComponent(key)}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete file")
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting file:", error)
    return { success: false, error }
  }
}

// Mark a project as complete
export async function completeProject(projectId: string) {
  const supabase = createClientComponentClient<Database>()

  try {
    const { error } = await supabase.from("projects").update({ status: "completed" }).eq("id", projectId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error completing project:", error)
    return { success: false, error }
  }
}

// Add a new video version
export async function addVideoVersion(
  projectId: string,
  data: { title: string; s3_key: string; description?: string },
) {
  const supabase = createClientComponentClient<Database>()

  try {
    const { error } = await supabase.from("video_versions").insert({
      project_id: projectId,
      title: data.title,
      s3_key: data.s3_key,
      description: data.description || null,
      status: "pending",
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error adding video version:", error)
    return { success: false, error }
  }
}

// Delete a video version
export async function deleteVideoVersion(versionId: string) {
  const supabase = createClientComponentClient<Database>()

  try {
    const { error } = await supabase.from("video_versions").delete().eq("id", versionId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error deleting video version:", error)
    return { success: false, error }
  }
}

// Approve a video version
export async function approveVersion(versionId: string) {
  const supabase = createClientComponentClient<Database>()

  try {
    const { error } = await supabase.from("video_versions").update({ status: "approved" }).eq("id", versionId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error approving version:", error)
    return { success: false, error }
  }
}

// Send feedback on a video version
export async function sendFeedback(versionId: string, feedback: string) {
  const supabase = createClientComponentClient<Database>()

  try {
    const { error } = await supabase.from("messages").insert({
      video_version_id: versionId,
      content: feedback,
      type: "feedback",
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error sending feedback:", error)
    return { success: false, error }
  }
}

// Fetch dashboard data
export async function fetchDashboardData() {
  const supabase = createClientComponentClient<Database>()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("User not authenticated")

    // Get projects owned by the user
    const { data: ownedProjects, error: ownedError } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)

    if (ownedError) throw ownedError

    // Get projects where user is an editor
    const { data: editableProjects, error: editableError } = await supabase
      .from("project_editors")
      .select("project_id, projects(*)")
      .eq("editor_id", user.id)

    if (editableError) throw editableError

    // Combine and deduplicate projects
    const editableProjectsData = editableProjects.map((item) => item.projects)
    const allProjects = [...ownedProjects, ...editableProjectsData]
    const uniqueProjects = Array.from(new Map(allProjects.map((item) => [item.id, item])).values())

    return {
      success: true,
      data: {
        projects: uniqueProjects,
        recentActivity: [], // You can implement this based on your needs
      },
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return { success: false, error }
  }
}

// Fetch all projects for a user
export async function fetchProjects() {
  const supabase = createClientComponentClient<Database>()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("User not authenticated")

    // Get projects owned by the user
    const { data: ownedProjects, error: ownedError } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)

    if (ownedError) throw ownedError

    // Get projects where user is an editor
    const { data: editableProjects, error: editableError } = await supabase
      .from("project_editors")
      .select("project_id, projects(*)")
      .eq("editor_id", user.id)

    if (editableError) throw editableError

    // Combine and deduplicate projects
    const editableProjectsData = editableProjects.map((item) => item.projects)
    const allProjects = [...ownedProjects, ...editableProjectsData]
    const uniqueProjects = Array.from(new Map(allProjects.map((item) => [item.id, item])).values())

    return { success: true, data: uniqueProjects }
  } catch (error) {
    console.error("Error fetching projects:", error)
    return { success: false, error }
  }
}

// Fetch project details including versions and messages
export async function fetchProjectDetails(projectId: string) {
  const supabase = createClientComponentClient<Database>()

  try {
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single()

    if (projectError) throw projectError

    // Get video versions
    const { data: versions, error: versionsError } = await supabase
      .from("video_versions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (versionsError) throw versionsError

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })

    if (messagesError) throw messagesError

    return {
      success: true,
      data: {
        project,
        versions,
        messages,
      },
    }
  } catch (error) {
    console.error("Error fetching project details:", error)
    return { success: false, error }
  }
}

// Fetch a single project
export async function fetchProject(projectId: string) {
  const supabase = createClientComponentClient<Database>()

  try {
    const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching project:", error)
    return { success: false, error }
  }
}
