import { apiGenerateInitialUploadUrl } from "@/lib/s3-service"

export async function POST(req: Request) {
  return apiGenerateInitialUploadUrl(req)
} 