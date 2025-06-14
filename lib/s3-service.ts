import { createRouteClient } from "@/app/supabase-route"
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export type PresignedUrlRequest = {
  projectId: string
  fileName: string
  contentType: string
  fileType: "video" | "thumbnail" | "audio" | "document" | "other"
}

export type InitialUploadRequest = {
  fileName: string
  contentType: string
  fileSize: number
  fileType: "video" | "thumbnail" | "image" | "audio" | "document" | "other"
}

export type PresignedUrlResponse = {
  uploadUrl: string
  fileUrl: string
  error?: string
}

export type GetPresignedViewUrlRequest = {
  filePath: string
}

export type GetPresignedViewUrlResponse = {
  presignedUrl: string
  error?: string
}

/**
 * Generate a pre-signed URL for S3 uploads
 * This is a server-side function to be used in API Routes or Server Actions
 */
export async function generatePresignedUrl(request: PresignedUrlRequest): Promise<PresignedUrlResponse> {
  try {
    // Validate environment variables
    const bucketName = process.env.AWS_S3_BUCKET_NAME
    const region = process.env.AWS_REGION
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

    if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
      console.error("Missing AWS environment variables")
      return {
        uploadUrl: "",
        fileUrl: "",
        error: "Server configuration error: Missing AWS credentials",
      }
    }

    // Validate request
    const { projectId, fileName, contentType, fileType } = request

    if (!projectId || !fileName || !contentType || !fileType) {
      return {
        uploadUrl: "",
        fileUrl: "",
        error: "Missing required fields",
      }
    }

    // Authenticate user with Supabase
    const supabase = await createRouteClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        uploadUrl: "",
        fileUrl: "",
        error: "User not authenticated",
      }
    }

    const userId = user.id

    // Validate user has access to the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", projectId)
      .single()

    if (projectError || !project) {
      return {
        uploadUrl: "",
        fileUrl: "",
        error: "Project not found or access denied",
      }
    }

    // Check if user is owner or editor
    const isOwner = project.owner_id === userId

    if (!isOwner) {
      // Check if user is an editor for this project
      const { data: projectEditor, error: editorError } = await supabase
        .from("project_editors")
        .select("id")
        .eq("project_id", projectId)
        .eq("editor_id", userId)
        .single()

      if (editorError || !projectEditor) {
        return {
          uploadUrl: "",
          fileUrl: "",
          error: "Access denied: User is not authorized for this project",
        }
      }
    }

    // Format path for S3: uploads/{userId}/{projectId}/{fileType}/{fileName}
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filePath = `uploads/${userId}/${projectId}/${fileType}/${sanitizedFileName}`

    // Initialize S3 client
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    // Create command for S3 PUT operation
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      ContentType: contentType,
    })

    // Generate presigned URL
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour expiry

    // Generate the public URL for the file
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${filePath}`

    return { uploadUrl, fileUrl }
  } catch (error: any) {
    console.error("Error generating presigned URL:", error)
    return {
      uploadUrl: "",
      fileUrl: "",
      error: error.message || "Failed to generate upload URL",
    }
  }
}

/**
 * Generate a pre-signed URL for viewing S3 files
 * This is a server-side function to be used in API Routes or Server Actions
 */
export async function generatePresignedViewUrl(request: GetPresignedViewUrlRequest): Promise<GetPresignedViewUrlResponse> {
  try {
    // Validate environment variables
    const bucketName = process.env.AWS_S3_BUCKET_NAME
    const region = process.env.AWS_REGION
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

    if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
      console.error("Missing AWS environment variables")
      return {
        presignedUrl: "",
        error: "Server configuration error: Missing AWS credentials",
      }
    }

    // Validate request
    const { filePath } = request

    if (!filePath) {
      return {
        presignedUrl: "",
        error: "Missing file path",
      }
    }

    // Authenticate user with Supabase
    const supabase = await createRouteClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        presignedUrl: "",
        error: "User not authenticated",
      }
    }

    // Initialize S3 client
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    // Create command for S3 GET operation
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: filePath,
    })

    // Generate presigned URL for viewing
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour expiry

    return { presignedUrl }
  } catch (error: any) {
    console.error("Error generating presigned view URL:", error)
    return {
      presignedUrl: "",
      error: error.message || "Failed to generate view URL",
    }
  }
}

/**
 * API Route handler to generate presigned URLs
 */
export async function apiGeneratePresignedUrl(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const body = (await req.json()) as PresignedUrlRequest
    const result = await generatePresignedUrl(body)

    if (result.error) {
      // Determine appropriate status code based on error
      let statusCode = 500

      if (result.error.includes("not authenticated")) {
        statusCode = 401
      } else if (result.error.includes("access denied") || result.error.includes("not authorized")) {
        statusCode = 403
      } else if (result.error.includes("not found")) {
        statusCode = 404
      } else if (result.error.includes("Missing required fields")) {
        statusCode = 400
      }

      return new Response(JSON.stringify({ error: result.error }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Error in presigned URL API route:", error)
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

/**
 * API Route handler to generate presigned URLs for viewing
 */
export async function apiGeneratePresignedViewUrl(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const body = (await req.json()) as GetPresignedViewUrlRequest
    const result = await generatePresignedViewUrl(body)

    if (result.error) {
      let statusCode = 500

      if (result.error.includes("not authenticated")) {
        statusCode = 401
      } else if (result.error.includes("Missing file path")) {
        statusCode = 400
      }

      return new Response(JSON.stringify({ error: result.error }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Error in presigned view URL API route:", error)
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

/**
 * Generate a pre-signed URL for initial project upload (before project exists)
 * This is used when creating a new project
 */
export async function generateInitialUploadUrl(request: InitialUploadRequest): Promise<PresignedUrlResponse> {
  try {
    // Validate environment variables
    const bucketName = process.env.AWS_S3_BUCKET_NAME
    const region = process.env.AWS_REGION
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

    if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
      console.error("Missing AWS environment variables")
      return {
        uploadUrl: "",
        fileUrl: "",
        error: "Server configuration error: Missing AWS credentials",
      }
    }

    // Validate request
    const { fileName, contentType, fileType, fileSize } = request

    if (!fileName || !contentType || !fileType) {
      return {
        uploadUrl: "",
        fileUrl: "",
        error: "Missing required fields",
      }
    }

    // Maximum file size based on type
    const maxSizes: Record<string, number> = {
      video: 10 * 1024 * 1024 * 1024, // 10GB
      image: 5 * 1024 * 1024, // 5MB
      thumbnail: 2 * 1024 * 1024, // 2MB
      audio: 500 * 1024 * 1024, // 500MB
      document: 100 * 1024 * 1024, // 100MB
      other: 50 * 1024 * 1024, // 50MB
    }

    // Validate file size
    if (fileSize > maxSizes[fileType]) {
      return {
        uploadUrl: "",
        fileUrl: "",
        error: `File too large. Maximum size for ${fileType}: ${maxSizes[fileType] / (1024 * 1024)} MB`,
      }
    }

    // Authenticate user with Supabase
    const supabase = await createRouteClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        uploadUrl: "",
        fileUrl: "",
        error: "User not authenticated",
      }
    }

    const userId = user.id

    // Check if user is a content creator (role = youtuber)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single()

    if (userError || !userData) {
      return {
        uploadUrl: "",
        fileUrl: "",
        error: "User profile not found",
      }
    }

    if (userData.role !== "youtuber") {
      return {
        uploadUrl: "",
        fileUrl: "",
        error: "Only content creators can upload initial project files",
      }
    }

    // Format path for S3: initial-uploads/{userId}/{timestamp}-{fileName}
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filePath = `initial-uploads/${userId}/${timestamp}-${sanitizedFileName}`

    // Initialize S3 client
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    // Create command for S3 PUT operation
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      ContentType: contentType,
    })

    // Generate presigned URL
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour expiry

    // Generate the public URL for the file
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${filePath}`

    return { uploadUrl, fileUrl }
  } catch (error: any) {
    console.error("Error generating initial upload URL:", error)
    return {
      uploadUrl: "",
      fileUrl: "",
      error: error.message || "Failed to generate upload URL",
    }
  }
}

/**
 * Generate a pre-signed URL for video version uploads with custom S3 key
 * This is used for video version uploads with versioned naming
 */
export async function generateVersionUploadUrl(request: {
  key: string;
  contentType: string;
}): Promise<PresignedUrlResponse> {
  try {
    // Validate environment variables
    const bucketName = process.env.AWS_S3_BUCKET_NAME
    const region = process.env.AWS_REGION
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

    if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
      console.error("Missing AWS environment variables")
      return {
        uploadUrl: "",
        fileUrl: "",
        error: "Server configuration error: Missing AWS credentials",
      }
    }

    // Validate request
    const { key, contentType } = request

    if (!key || !contentType) {
      return {
        uploadUrl: "",
        fileUrl: "",
        error: "Missing required fields",
      }
    }

    // Initialize S3 client
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    // Create command for S3 PUT operation
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    })

    // Generate presigned URL
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour expiry

    // Generate the public URL for the file
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`

    return { uploadUrl, fileUrl }
  } catch (error: any) {
    console.error("Error generating version upload URL:", error)
    return {
      uploadUrl: "",
      fileUrl: "",
      error: error.message || "Failed to generate upload URL",
    }
  }
}

/**
 * API Route handler for initial uploads
 */
export async function apiGenerateInitialUploadUrl(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const body = (await req.json()) as InitialUploadRequest
    const result = await generateInitialUploadUrl(body)

    if (result.error) {
      // Determine appropriate status code based on error
      let statusCode = 500

      if (result.error.includes("not authenticated")) {
        statusCode = 401
      } else if (result.error.includes("access denied") || result.error.includes("not authorized")) {
        statusCode = 403
      } else if (result.error.includes("not found")) {
        statusCode = 404
      } else if (result.error.includes("Missing required fields")) {
        statusCode = 400
      } else if (result.error.includes("File too large")) {
        statusCode = 413
      }

      return new Response(JSON.stringify({ error: result.error }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Error in API route:", error)
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
