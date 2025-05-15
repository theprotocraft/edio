import { apiGeneratePresignedUrl } from "@/lib/s3-service"

export async function POST(req: Request) {
  return apiGeneratePresignedUrl(req)
}
