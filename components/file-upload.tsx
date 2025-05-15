"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSupabase } from "@/lib/supabase-provider"
import { Upload, File, FileText, Video, ImageIcon, Download, Trash } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { PresignedUrlRequest, PresignedUrlResponse } from "@/lib/s3-service"
import { Progress } from "@/components/ui/progress"

interface FileUploadProps {
  project: any
  uploads: any[]
  userRole: "youtuber" | "editor"
}

export function FileUpload({ project, uploads, userRole }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  const { supabase } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const getFileType = (mimeType: string): "video" | "thumbnail" | "audio" | "document" | "other" => {
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("image/")) return "thumbnail"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType === "application/pdf" || mimeType.includes("document")) return "document"
    return "other"
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Get pre-signed URL from your API
      const fileType = getFileType(selectedFile.type)
      const fileName = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`

      const presignedUrlRequest: PresignedUrlRequest = {
        projectId: project.id,
        fileName,
        contentType: selectedFile.type,
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
      await uploadFileWithProgress(uploadUrl, selectedFile)

      // Save file metadata to Supabase
      const { error } = await supabase.from("uploads").insert({
        project_id: project.id,
        user_id: supabase.auth.getUser().then(({ data }) => data.user?.id),
        file_url: fileUrl,
        file_type: fileType,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
      })

      if (error) {
        throw error
      }

      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      })

      // Reset form
      setSelectedFile(null)
      setDescription("")
      setUploadProgress(0)

      // Refresh the page to show the new upload
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file.",
        variant: "destructive",
      })
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const uploadFileWithProgress = async (url: string, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(percentComplete)
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed due to network error"))
      })

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"))
      })

      xhr.open("PUT", url)
      xhr.setRequestHeader("Content-Type", file.type)
      xhr.send(file)
    })
  }

  const handleDeleteFile = async () => {
    if (!fileToDelete) return

    try {
      // Get the file URL to delete from S3
      const { data: fileData, error: fetchError } = await supabase
        .from("uploads")
        .select("file_url")
        .eq("id", fileToDelete)
        .single()

      if (fetchError) {
        throw fetchError
      }

      // Delete file metadata from Supabase
      const { error } = await supabase.from("uploads").delete().eq("id", fileToDelete)

      if (error) {
        throw error
      }

      // In a production environment, you would also delete from S3
      // This would typically be done via a server action or API route
      // that calls the S3 DeleteObject API

      toast({
        title: "File deleted",
        description: "The file has been deleted successfully.",
      })

      // Refresh the page
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file.",
        variant: "destructive",
      })
    } finally {
      setFileToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === "thumbnail") {
      return <ImageIcon className="h-6 w-6 text-blue-500" />
    } else if (fileType === "video") {
      return <Video className="h-6 w-6 text-purple-500" />
    } else if (fileType === "document") {
      return <FileText className="h-6 w-6 text-green-500" />
    } else {
      return <File className="h-6 w-6 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return bytes + " B"
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB"
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    } else {
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB"
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Upload File</Label>
                <div className="flex items-center gap-2">
                  <Input id="file" type="file" onChange={handleFileChange} className="flex-1" />
                  <Button type="submit" disabled={!selectedFile || uploading}>
                    {uploading ? (
                      "Uploading..."
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" /> Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Add a description for this file"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              {selectedFile && (
                <div className="text-sm text-gray-500">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Upload Guidelines</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Maximum file size: 2GB</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Supported video formats: MP4, MOV, AVI, MKV</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Supported image formats: JPG, PNG, GIF</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Supported document formats: PDF, DOCX, TXT</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Add descriptive names and descriptions to help organize your files</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-xl font-medium mt-8 mb-4">Uploaded Files</h3>

      {uploads && uploads.length > 0 ? (
        <div className="space-y-4">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <div className="flex items-center space-x-4">
                {getFileIcon(upload.file_type)}
                <div>
                  <h4 className="font-medium">{upload.file_name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{upload.description || "No description"}</p>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(upload.file_size)}</span>
                    <span>{new Date(upload.created_at).toLocaleDateString()}</span>
                    <span>{upload.user_id === project.owner_id ? "Uploaded by Creator" : "Uploaded by Editor"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" asChild>
                  <a href={upload.file_url} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download</span>
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFileToDelete(upload.id)
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash className="h-4 w-4 text-red-500" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <File className="h-10 w-10 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No files uploaded yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">Upload files to share with your team</p>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFile}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
