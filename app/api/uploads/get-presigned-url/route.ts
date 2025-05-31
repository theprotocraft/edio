import { apiGeneratePresignedViewUrl } from "@/lib/s3-service"

export async function POST(req: Request) {
  return apiGeneratePresignedViewUrl(req)
}