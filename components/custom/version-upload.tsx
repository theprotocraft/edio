"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileVideo, X } from "lucide-react"
import { uploadVideoVersion } from "@/lib/api"

interface VersionUploadProps {
  projectId: string
  userRole: "youtuber" | "editor"
  disabled?: boolean
  onUploadSuccess?: () => void
}

export function VersionUpload({ projectId, userRole, disabled = false, onUploadSuccess }: VersionUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState("")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const maxFileSize = 10 * 1024 * 1024 * 1024 // 10GB

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
      }
    }
  }

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file.",
        variant: "destructive",
      })
      return false
    }

    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10GB.",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a video file to upload.",
        variant: "destructive",
      })
      return
    }

    if (!notes.trim()) {
      toast({
        title: "Notes required",
        description: "Please add notes explaining what changed in this version.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      await uploadVideoVersion({
        projectId,
        file: selectedFile,
        notes: notes.trim(),
        onProgress: setProgress,
      })

      toast({
        title: "Upload successful",
        description: "Your new video version has been uploaded successfully.",
      })

      // Reset form
      setSelectedFile(null)
      setNotes("")
      setProgress(0)

      // Notify parent component to refresh versions
      onUploadSuccess?.()
      
      // Fallback: refresh the page if no callback provided
      if (!onUploadSuccess) {
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video version.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setProgress(0)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (disabled) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload New Version
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        {!selectedFile && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileVideo className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Drop your video file here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="video-upload"
                disabled={uploading}
              />
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={uploading}
                className="mt-2"
              >
                <label htmlFor="video-upload" className="cursor-pointer">
                  Browse Files
                </label>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Max file size: 10GB • Supported formats: MP4, MOV, AVI, etc.
            </p>
          </div>
        )}

        {/* Selected File */}
        {selectedFile && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileVideo className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              disabled={uploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Version Notes */}
        <div className="space-y-2">
          <label htmlFor="version-notes" className="text-sm font-medium">
            Version Notes <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="version-notes"
            placeholder="Describe what changed in this version..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={uploading}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Explain what you changed, fixed, or improved in this version.
          </p>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !notes.trim() || uploading}
          className="w-full"
        >
          {uploading ? "Uploading..." : "Upload New Version"}
        </Button>
      </CardContent>
    </Card>
  )
}