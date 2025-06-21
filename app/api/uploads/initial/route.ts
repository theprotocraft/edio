import { apiGeneratePresignedUrl, type PresignedUrlRequest } from "@/lib/s3-service"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Transform initial upload request to PresignedUrlRequest format
    const presignedUrlRequest: PresignedUrlRequest = {
      fileName: body.fileName,
      contentType: body.contentType,
      fileType: body.fileType,
      fileSize: body.fileSize,
      requireYoutuberRole: true
    }

    // Create a new request with the transformed body
    const mockRequest = new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(presignedUrlRequest)
    })

    return apiGeneratePresignedUrl(mockRequest)
  } catch (error: any) {
    console.error("Error in initial upload API route:", error)
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
} 