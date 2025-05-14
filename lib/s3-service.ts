import { S3Client } from "@aws-sdk/client-s3"
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"

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

// Generate a presigned URL for file uploads
export async function generatePresignedUrl(fileName: string, contentType: string) {
  const s3Client = getS3Client()
  const key = `uploads/${Date.now()}-${fileName}`

  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    Conditions: [
      ["content-length-range", 0, 10485760], // up to 10 MB
      ["starts-with", "$Content-Type", contentType],
    ],
    Fields: {
      "Content-Type": contentType,
    },
    Expires: 600, // 10 minutes
  })

  return { url, fields, key }
}
