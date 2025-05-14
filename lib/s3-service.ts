import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export type PresignedUrlRequest = {
  projectId: string
  fileName: string
  contentType: string
  fileType: "video" | "thumbnail" | "audio" | "document" | "other"
}

export type PresignedUrlResponse = {
  uploadUrl: string
  fileUrl: string
  error?: string
}

// Create and configure S3 client
export function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
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

    // Initialize S3 client
    const s3Client = getS3Client()

    // Format path for S3: uploads/{projectId}/{fileType}/{fileName}
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filePath = `uploads/${projectId}/${fileType}/${sanitizedFileName}`

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
