"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { getPresignedViewUrl } from "@/lib/api"

interface VersionPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: {
    id: string
    version_number: number
    file_url: string
    notes?: string
  } | null
}

export function VersionPreviewDialog({ open, onOpenChange, version }: VersionPreviewDialogProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && version) {
      setLoading(true)
      setError(null)
      setVideoUrl(null)

      getPresignedViewUrl(version.file_url)
        .then((url) => {
          setVideoUrl(url)
        })
        .catch((err) => {
          console.error("Error getting presigned URL:", err)
          setError("Failed to load video preview")
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open, version])

  if (!version) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>
            Video Preview - Version {version.version_number}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-md overflow-hidden">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm text-muted-foreground">Generating preview...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            
            {videoUrl && !loading && !error && (
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
          
          {version.notes && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Notes:</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                {version.notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}