import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Create a Supabase client
const createClient = () => createClientComponentClient<Database>()

// Upload a file to S3 via presigned URL
export async function uploadFile(file: File, projectId: string) {
  try {
    const supabase = createClient()

    // Get presigned URL
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

    // Create form data for S3 upload
    const formData = new FormData()
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value as string)
    })
    formData.append("file", file)

    // Upload to S3
    const uploadResponse = await fetch(url, {
      method: "POST",
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file to S3")
    }

    // Record the upload in the database
    const { error } = await supabase.from("uploads").insert({
      project_id: projectId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      s3_key: key,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
    })

    if (error) throw error

    return { success: true, key }
  } catch (error) {
    console.error("Error uploading file:", error)
    return { success: false, error }
  }
}

// Delete a file from S3
export async function deleteFile(fileId: string) {
  try {
    const supabase = createClient()

    // Get the file details
    const { data: file, error: fetchError } = await supabase.from("uploads").select("*").eq("id", fileId).single()

    if (fetchError) throw fetchError

    // Delete from S3 via API
    const response = await fetch(`/api/uploads/${file.s3_key}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete file from S3")
    }

    // Delete from database
    const { error } = await supabase.from("uploads").delete().eq("id", fileId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error deleting file:", error)
    return { success: false, error }
  }
}

// Mark a project as complete
export async function completeProject(projectId: string) {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from("projects")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", projectId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error completing project:", error)
    return { success: false, error }
  }
}

// Add a new video version
export async function addVideoVersion(projectId: string, versionData: any) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("video_versions")
      .insert({
        project_id: projectId,
        version_number: versionData.versionNumber,
        s3_key: versionData.s3Key,
        notes: versionData.notes,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error adding video version:", error)
    return { success: false, error }
  }
}

// Delete a video version
export async function deleteVideoVersion(versionId: string) {
  try {
    const supabase = createClient()

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
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from("video_versions")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", versionId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error approving version:", error)
    return { success: false, error }
  }
}

// Send feedback on a video version
export async function sendFeedback(versionId: string, feedback: string) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("messages")
      .insert({
        video_version_id: versionId,
        content: feedback,
        sent_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error sending feedback:", error)
    return { success: false, error }
  }
}

// Fetch dashboard data
export async function fetchDashboardData() {
  try {
    const supabase = createClient()
    const user = (await supabase.auth.getUser()).data.user

    if (!user) throw new Error("User not authenticated")

    // Get recent projects
    const { data: recentProjects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .or(`owner_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(5)

    if (projectsError) throw projectsError

    // Get recent notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (notificationsError) throw notificationsError

    // Get projects where user is an editor
    const { data: editableProjects, error: editableError } = await supabase
      .from("project_editors")
      .select("project_id")
      .eq("editor_id", user.id)

    if (editableError) throw editableError

    // Get the actual projects
    let editorProjects = []
    if (editableProjects && editableProjects.length > 0) {
      const projectIds = editableProjects.map((p) => p.project_id)
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds)
        .order("updated_at", { ascending: false })
        .limit(5)

      if (error) throw error
      editorProjects = data
    }

    // Combine and deduplicate projects
    const allProjects = [...recentProjects, ...editorProjects]
    const uniqueProjects = Array.from(new Map(allProjects.map((item) => [item.id, item])).values())

    return {
      success: true,
      data: {
        projects: uniqueProjects,
        notifications,
      },
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return { success: false, error }
  }
}

// Fetch projects
export async function fetchProjects() {
  try {
    const supabase = createClient()
    const user = (await supabase.auth.getUser()).data.user

    if (!user) throw new Error("User not authenticated")

    // Get owned projects
    const { data: ownedProjects, error: ownedError } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })

    if (ownedError) throw ownedError

    // Get projects where user is an editor
    const { data: editableProjects, error: editableError } = await supabase
      .from("project_editors")
      .select("project_id")
      .eq("editor_id", user.id)

    if (editableError) throw editableError

    // Get the actual projects
    let editorProjects = []
    if (editableProjects && editableProjects.length > 0) {
      const projectIds = editableProjects.map((p) => p.project_id)
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds)
        .order("updated_at", { ascending: false })

      if (error) throw error
      editorProjects = data
    }

    // Combine and deduplicate projects
    const allProjects = [...ownedProjects, ...editorProjects]
    const uniqueProjects = Array.from(new Map(allProjects.map((item) => [item.id, item])).values())

    return {
      success: true,
      data: uniqueProjects,
    }
  } catch (error) {
    console.error("Error fetching projects:", error)
    return { success: false, error }
  }
}

// Fetch project details
export async function fetchProjectDetails(projectId: string) {
  try {
    const supabase = createClient()

    // Get project
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

    // Get uploads
    const { data: uploads, error: uploadsError } = await supabase
      .from("uploads")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (uploadsError) throw uploadsError

    // Get editors
    const { data: editors, error: editorsError } = await supabase
      .from("project_editors")
      .select("editor_id")
      .eq("project_id", projectId)

    if (editorsError) throw editorsError

    // Get editor user details
    let editorUsers = []
    if (editors && editors.length > 0) {
      const editorIds = editors.map((e) => e.editor_id)
      const { data, error } = await supabase.from("users").select("id, full_name, avatar_url").in("id", editorIds)

      if (error) throw error
      editorUsers = data
    }

    // Get owner details
    const { data: owner, error: ownerError } = await supabase
      .from("users")
      .select("id, full_name, avatar_url")
      .eq("id", project.owner_id)
      .single()

    if (ownerError) throw ownerError

    return {
      success: true,
      data: {
        project,
        versions,
        uploads,
        editors: editorUsers,
        owner,
      },
    }
  } catch (error) {
    console.error("Error fetching project details:", error)
    return { success: false, error }
  }
}

// Fetch a single project
export async function fetchProject(projectId: string) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single()

    if (error) throw error

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("Error fetching project:", error)
    return { success: false, error }
  }
}
