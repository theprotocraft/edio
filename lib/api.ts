import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"
import type { PresignedUrlRequest, PresignedUrlResponse } from "@/lib/s3-service"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Upload a file to S3 via presigned URL
export async function uploadFile({
  file,
  projectId,
  onProgress,
}: {
  file: File
  projectId: string
  onProgress: (progress: number) => void
}) {
  const supabase = createClientComponentClient<Database>()

  // Get file type
  const getFileType = (mimeType: string): "video" | "thumbnail" | "audio" | "document" | "other" => {
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("image/")) return "thumbnail"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType === "application/pdf" || mimeType.includes("document")) return "document"
    return "other"
  }

  // Get pre-signed URL from your API
  const fileType = getFileType(file.type)
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`

  const presignedUrlRequest: PresignedUrlRequest = {
    projectId,
    fileName,
    contentType: file.type,
    fileType,
  }

  const response = await fetch("/api/uploads/presigned-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(presignedUrlRequest),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to get upload URL")
  }

  const { uploadUrl, fileUrl }: PresignedUrlResponse = await response.json()

  // Upload to the presigned URL with progress tracking
  await uploadFileWithProgress(uploadUrl, file, onProgress)

  // Save file metadata to Supabase
  const { error } = await supabase.from("uploads").insert({
    project_id: projectId,
    user_id: (await supabase.auth.getUser()).data.user?.id,
    file_url: fileUrl,
    file_type: fileType,
    file_name: file.name,
    file_size: file.size,
  })

  if (error) {
    throw error
  }
}

async function uploadFileWithProgress(url: string, file: File, onProgress: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100)
        onProgress(percentComplete)
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed due to network error"))
    })

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"))
    })

    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", file.type)
    xhr.send(file)
  })
}

// Delete a file from S3
export async function deleteFile(fileId: string) {
  const supabase = createClientComponentClient<Database>()

  // Get the file URL to delete from S3
  const { data: fileData, error: fetchError } = await supabase
    .from("uploads")
    .select("file_url")
    .eq("id", fileId)
    .single()

  if (fetchError) {
    throw fetchError
  }

  // Delete file metadata from Supabase
  const { error } = await supabase.from("uploads").delete().eq("id", fileId)

  if (error) {
    throw error
  }

  // In a production environment, you would also delete from S3
  // This would typically be done via a server action or API route
  // that calls the S3 DeleteObject API
}

// Mark a project as complete
export async function completeProject(projectId: string) {
  const supabase = createClientComponentClient<Database>()

  // Update project status
  const { error } = await supabase.from("projects").update({ status: "approved" }).eq("id", projectId)

  if (error) {
    throw error
  }
}

// Add a new video version
export async function addVideoVersion({
  projectId,
  videoUrl,
  notes,
}: {
  projectId: string
  videoUrl: string
  notes: string
}) {
  const supabase = createClientComponentClient<Database>()

  // Get the next version number
  const { data: versions } = await supabase
    .from("video_versions")
    .select("version_number")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(1)

  const nextVersionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 1

  // Get user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
    .single()

  // Save version to Supabase
  const { error } = await supabase.from("video_versions").insert({
    project_id: projectId,
    uploader_id: (await supabase.auth.getUser()).data.user?.id,
    version_number: nextVersionNumber,
    file_url: videoUrl,
    notes,
  })

  if (error) {
    throw error
  }

  // Update project status to "in_review" if editor submitted a version
  if (userData?.role === "editor") {
    await supabase.from("projects").update({ status: "in_review" }).eq("id", projectId)
  }
}

// Delete a video version
export async function deleteVideoVersion(versionId: string) {
  const supabase = createClientComponentClient<Database>()

  // Delete version from Supabase
  const { error } = await supabase.from("video_versions").delete().eq("id", versionId)

  if (error) {
    throw error
  }
}

// Approve a video version
export async function approveVersion(projectId: string) {
  const supabase = createClientComponentClient<Database>()

  // Update project status
  const { error } = await supabase.from("projects").update({ status: "approved" }).eq("id", projectId)

  if (error) {
    throw error
  }
}

// Send feedback on a video version
export async function sendFeedback({
  projectId,
  versionId,
  feedback,
}: {
  projectId: string
  versionId: string
  feedback: string
}) {
  const supabase = createClientComponentClient<Database>()

  // Get version number
  const { data: version } = await supabase.from("video_versions").select("version_number").eq("id", versionId).single()

  // Add feedback as a chat message
  const { error } = await supabase.from("messages").insert({
    project_id: projectId,
    sender_id: (await supabase.auth.getUser()).data.user?.id,
    content: `Feedback on version ${version?.version_number}: ${feedback}`,
    type: "feedback",
  })

  if (error) {
    throw error
  }

  // Update project status to "needs_changes"
  await supabase.from("projects").update({ status: "needs_changes" }).eq("id", projectId)
}

// Fetch dashboard data
export async function fetchDashboardData() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    return { user: null, projects: [], notifications: [], isCreator: false }
  }

  // Fetch user profile
  const { data: user } = await supabase.from("users").select("*").eq("id", sessionData.session.user.id).single()

  // Fetch recent projects - owner projects
  const { data: ownedProjects } = await supabase
    .from("projects")
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, name, email),
      editors:project_editors(editor_id, editor:users(id, name, email))
    `)
    .eq("owner_id", sessionData.session.user.id)
    .order("updated_at", { ascending: false })
    .limit(4)

  // Fetch projects where user is an editor
  const { data: editorProjects } = await supabase
    .from("project_editors")
    .select(`
      project_id,
      project:projects(
        *,
        owner:users!projects_owner_id_fkey(id, name, email),
        editors:project_editors(editor_id, editor:users(id, name, email))
      )
    `)
    .eq("editor_id", sessionData.session.user.id)
    .order("project.updated_at", { ascending: false })
    .limit(4)

  // Combine projects
  const editorProjectsFormatted = editorProjects ? editorProjects.map((item) => item.project).filter(Boolean) : []
  const projects = [...(ownedProjects || []), ...editorProjectsFormatted]

  // Fetch notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", sessionData.session.user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  const isCreator = user?.role === "youtuber"

  return {
    user,
    projects: projects || [],
    notifications: notifications || [],
    isCreator,
  }
}

// Fetch projects
export async function fetchProjects() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    return { user: null, projects: [], isCreator: false }
  }

  // Fetch user profile
  const { data: user } = await supabase.from("users").select("*").eq("id", sessionData.session.user.id).single()

  // Fetch owned projects
  const { data: ownedProjects } = await supabase
    .from("projects")
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, name, email),
      editors:project_editors(editor_id, editor:users(id, name, email))
    `)
    .eq("owner_id", sessionData.session.user.id)
    .order("updated_at", { ascending: false })

  // Fetch projects where user is an editor
  const { data: editorProjects } = await supabase
    .from("project_editors")
    .select(`
      project_id,
      project:projects(
        *,
        owner:users!projects_owner_id_fkey(id, name, email),
        editors:project_editors(editor_id, editor:users(id, name, email))
      )
    `)
    .eq("editor_id", sessionData.session.user.id)
    .order("project.updated_at", { ascending: false })

  // Combine projects
  const editorProjectsFormatted = editorProjects ? editorProjects.map((item) => item.project).filter(Boolean) : []
  const projects = [...(ownedProjects || []), ...editorProjectsFormatted]

  const isCreator = user?.role === "youtuber"

  return {
    user,
    projects: projects || [],
    isCreator,
  }
}

// Fetch project details
export async function fetchProjectDetails(id: string) {
  const supabase = createServerComponentClient<Database>({ cookies })

  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    return { project: null }
  }

  // Fetch project details
  const { data: project } = await supabase
    .from("projects")
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, name, email),
      editors:project_editors(editor_id, editor:users(id, name, email))
    `)
    .eq("id", id)
    .single()

  if (!project) {
    return { project: null }
  }

  // Check if user has access to this project
  const userIsOwner = project.owner_id === sessionData.session.user.id
  const userIsEditor = project.editors.some((editor: any) => editor.editor_id === sessionData.session.user.id)

  if (!userIsOwner && !userIsEditor) {
    return { project: null }
  }

  // Fetch project uploads
  const { data: uploads } = await supabase
    .from("uploads")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

  // Fetch video versions
  const { data: versions } = await supabase
    .from("video_versions")
    .select("*")
    .eq("project_id", id)
    .order("version_number", { ascending: false })

  // Fetch chat messages
  const { data: messages } = await supabase
    .from("messages")
    .select(`
      *,
      sender:users(id, name, email)
    `)
    .eq("project_id", id)
    .order("created_at", { ascending: true })

  return {
    project,
    uploads: uploads || [],
    versions: versions || [],
    messages: messages || [],
    userRole: userIsOwner ? "creator" : "editor",
    userId: sessionData.session.user.id,
  }
}

// Fetch a single project
export async function fetchProject(id: string) {
  const supabase = createClientComponentClient<Database>()

  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id),
      editors:project_editors(editor_id)
    `)
    .eq("id", id)
    .single()

  if (error) {
    throw error
  }

  return project
}
