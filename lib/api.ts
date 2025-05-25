import { createClient } from "@/lib/supabase-client"
import type { PresignedUrlRequest, PresignedUrlResponse } from "@/lib/s3-service"

// Client-side API functions

export async function fetchProject(id: string) {
  const supabase = createClient()

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

export async function createProject({ title, description }: { title: string; description: string }) {
  const supabase = createClient()

  // Get user profile to determine if creator or editor
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
    .single()

  if (userError) {
    throw new Error("Failed to fetch user data")
  }

  if (!userData) {
    throw new Error("User profile not found")
  }

  // Create the project
  const { data, error } = await supabase
    .from("projects")
    .insert({
      project_title: title,
      description,
      owner_id: userData.role === "youtuber" ? (await supabase.auth.getUser()).data.user?.id : null,
      status: "pending",
    })
    .select()

  if (error) {
    throw error
  }

  // If user is an editor, add them as a project editor
  if (userData.role === "editor" && data && data[0]) {
    const { error: editorError } = await supabase.from("project_editors").insert({
      project_id: data[0].id,
      editor_id: (await supabase.auth.getUser()).data.user?.id,
    })

    if (editorError) {
      console.error("Failed to add editor to project:", editorError)
    }
  }

  return data[0].id
}

export async function updateProject(id: string, { title, description }: { title: string; description: string }) {
  const supabase = createClient()

  const { error } = await supabase
    .from("projects")
    .update({
      project_title: title,
      description,
    })
    .eq("id", id)

  if (error) {
    throw error
  }
}

export async function deleteProject(id: string) {
  const supabase = createClient()

  const { error } = await supabase.from("projects").delete().eq("id", id)

  if (error) {
    throw error
  }
}

export async function completeProject(id: string) {
  const supabase = createClient()

  const { error } = await supabase.from("projects").update({ status: "approved" }).eq("id", id)

  if (error) {
    throw error
  }
}

export async function uploadFile({
  file,
  projectId,
  onProgress,
}: {
  file: File
  projectId: string
  onProgress: (progress: number) => void
}) {
  const supabase = createClient()

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

export async function deleteFile(fileId: string) {
  const supabase = createClient()

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

export async function addVideoVersion({
  projectId,
  videoUrl,
  notes,
}: {
  projectId: string
  videoUrl: string
  notes: string
}) {
  const supabase = createClient()

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

export async function deleteVideoVersion(versionId: string) {
  const supabase = createClient()

  // Delete version from Supabase
  const { error } = await supabase.from("video_versions").delete().eq("id", versionId)

  if (error) {
    throw error
  }
}

export async function approveVersion(projectId: string) {
  const supabase = createClient()

  // Update project status
  const { error } = await supabase.from("projects").update({ status: "approved" }).eq("id", projectId)

  if (error) {
    throw error
  }
}

export async function sendFeedback({
  projectId,
  versionId,
  feedback,
}: {
  projectId: string
  versionId: string
  feedback: string
}) {
  const supabase = createClient()

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

export async function sendMessage({
  projectId,
  content,
}: {
  projectId: string
  content: string
}) {
  const supabase = createClient()

  const { error } = await supabase.from("messages").insert({
    project_id: projectId,
    sender_id: (await supabase.auth.getUser()).data.user?.id,
    content,
    type: "text",
  })

  if (error) {
    throw error
  }
}
