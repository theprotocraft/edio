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
      editors:youtuber_editors(editor_id)
    `)
    .eq("id", id)
    .single()

  if (error) {
    throw error
  }

  return project
}

export async function createProject({
  projectTitle,
  videoTitle,
  description,
  file,
  selectedEditors = [],
  onProgress,
}: {
  projectTitle: string;
  videoTitle?: string;
  description?: string;
  file: File;
  selectedEditors?: string[];
  onProgress?: (progress: number) => void;
}) {
  try {
    // Step 1: Get a presigned URL for the video upload
    const presignResponse = await fetch("/api/uploads/initial", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        fileType: "video",
      }),
    })

    if (!presignResponse.ok) {
      const errorData = await presignResponse.json()
      throw new Error(errorData.error || "Failed to get upload URL")
    }

    const { uploadUrl, fileUrl } = await presignResponse.json()

    // Step 2: Upload the file to S3 with progress tracking
    await uploadFileWithProgress(uploadUrl, file, onProgress)

    // Step 3: Create the project record
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectTitle,
        videoTitle,
        description,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        selectedEditors,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create project")
    }

    const result = await response.json()
    return result
  } catch (error: any) {
    console.error("Error creating project:", error)
    throw new Error(error.message || "Failed to create project")
  }
}

// Helper function to upload file with progress tracking
async function uploadFileWithProgress(
  presignedUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          onProgress(percentComplete)
        }
      })
    }

    // Handle success
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    // Handle errors
    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed due to network error"))
    })

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"))
    })

    // Open and send the request
    xhr.open("PUT", presignedUrl)
    xhr.setRequestHeader("Content-Type", file.type)
    xhr.send(file)
  })
}

export async function updateProject(
  projectId: string,
  updates: {
    title?: string
    videoTitle?: string
    description?: string
    youtube_channel_id?: string
    publishing_status?: 'idle' | 'publishing' | 'completed' | 'failed'
    finalVersionNumber?: number
  }
) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update project')
  }

  return response.json()
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

  // Save file metadata to Supabase and return the created record
  const { data: uploadData, error } = await supabase.from("uploads").insert({
    project_id: projectId,
    user_id: (await supabase.auth.getUser()).data.user?.id,
    file_url: fileUrl,
    file_type: fileType,
    file_name: file.name,
    file_size: file.size,
  }).select().single()

  if (error) {
    throw error
  }

  return uploadData
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

export async function uploadVideoVersion({
  projectId,
  file,
  notes,
  onProgress,
}: {
  projectId: string
  file: File
  notes: string
  onProgress?: (progress: number) => void
}): Promise<string> {
  try {
    // Step 1: Get a presigned URL for the video upload
    const presignResponse = await fetch("/api/projects/" + projectId + "/versions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        notes,
      }),
    })

    if (!presignResponse.ok) {
      const errorData = await presignResponse.json()
      throw new Error(errorData.error || "Failed to get upload URL")
    }

    const { uploadUrl, versionId } = await presignResponse.json()

    // Step 2: Upload the file to S3 with progress tracking
    await uploadFileWithProgress(uploadUrl, file, onProgress)

    return versionId
  } catch (error: any) {
    console.error("Error uploading video version:", error)
    throw new Error(error.message || "Failed to upload video version")
  }
}

export async function deleteVideoVersion(versionId: string, projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/versions/${versionId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to delete video version")
  }

  return await response.json()
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

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error("User not authenticated")
  }

  const { data, error } = await supabase.from("messages").insert({
    project_id: projectId,
    sender_id: userData.user.id,
    content,
    type: "text",
  }).select()

  if (error) {
    console.error("Error inserting message:", error)
    throw error
  }

  console.log("Message inserted into database:", data)
  return data
}

export async function getPresignedViewUrl(fileUrl: string) {
  try {
    console.log("Getting presigned URL for:", fileUrl);
    
    // Validate that fileUrl is a valid URL string
    if (!fileUrl || typeof fileUrl !== 'string') {
      console.warn('Invalid file URL provided, returning original URL');
      return fileUrl;
    }
    
    // Check if this looks like an S3 URL that needs a presigned URL
    if (!fileUrl.includes('.s3.') && !fileUrl.includes('amazonaws.com')) {
      console.log('URL does not appear to be an S3 URL, returning as-is');
      return fileUrl;
    }
    
    // Extract the file path from the full S3 URL
    const url = new URL(fileUrl);
    const filePath = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    
    console.log("Extracted file path:", filePath);
    
    // Call the API to get a presigned URL for viewing
    const response = await fetch("/api/uploads/get-presigned-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filePath }),
    });

    console.log("API response status:", response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error("API error response:", errorData);
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to get view URL`);
    }

    const { presignedUrl } = await response.json();
    console.log("Generated presigned URL:", presignedUrl);
    return presignedUrl;
  } catch (error: any) {
    console.error("Error getting presigned view URL:", error);
    console.log("Falling back to original URL for:", fileUrl);
    // Return the original URL as fallback (may not work for private buckets, but prevents UI errors)
    return fileUrl;
  }
}

export async function fetchEditors() {
  const supabase = createClient()

  try {
    // First get the current user's ID
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error fetching current user:", userError)
      return []
    }

    // Get editors who are actively associated with this creator through youtuber_editors
    const { data: editorRelations, error: relationsError } = await supabase
      .from("youtuber_editors")
      .select("editor_id")
      .eq("youtuber_id", user.id)
      .eq("status", "active")  // Only get active editors

    if (relationsError) {
      console.error("Error fetching editor relations:", relationsError)
      return []
    }

    // Extract editor IDs
    const editorIds = editorRelations.map(relation => relation.editor_id)

    if (editorIds.length === 0) {
      return []
    }

    // Fetch the editor details
    const { data: editors, error: editorsError } = await supabase
      .from("users")
      .select("*")
      .in("id", editorIds)

    if (editorsError) {
      console.error("Error fetching editors:", editorsError)
      return []
    }

    return editors || []
  } catch (error) {
    console.error("Error in fetchEditors:", error)
    return []
  }
}

export async function assignEditorToProject(projectId: string, editorId: string) {
  const supabase = createClient()

  try {
    // Get current user (YouTuber)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, message: "User not authenticated" }
    }

    // Verify the user owns this project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .single()

    if (projectError || !project || project.owner_id !== user.id) {
      return { success: false, message: "Project not found or access denied" }
    }

    // Check if editor has active relationship with this YouTuber
    const { data: editorRelation, error: relationError } = await supabase
      .from("youtuber_editors")
      .select("id")
      .eq("youtuber_id", user.id)
      .eq("editor_id", editorId)
      .eq("status", "active")
      .maybeSingle()

    if (relationError) {
      throw relationError
    }

    if (!editorRelation) {
      return { success: false, message: "Editor must be invited and accept invitation before assignment" }
    }

    // Check if editor is already assigned to the project
    const { data: existingAssignment, error: checkError } = await supabase
      .from("project_editors")
      .select("id")
      .eq("project_id", projectId)
      .eq("editor_id", editorId)
      .maybeSingle()

    if (checkError) {
      throw checkError
    }

    if (existingAssignment) {
      return { success: true, message: "Editor is already assigned to this project" }
    }

    // Assign the editor to the project
    const { error: insertError } = await supabase
      .from("project_editors")
      .insert({
        project_id: projectId,
        editor_id: editorId
      })

    if (insertError) {
      throw insertError
    }

    return { success: true, message: "Editor assigned successfully" }
  } catch (error: any) {
    console.error("Error assigning editor to project:", error)
    return { success: false, message: error.message || "Failed to assign editor" }
  }
}
