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

interface FileUploadProps {
  project: any
  uploads: any[]
  userRole: "creator" | "editor"
}

export function FileUpload({ project, uploads, userRole }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [uploading, setUploading] = useState(false)
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

    try {
      // Get pre-signed URL from your backend
      const fileName = `${project.id}/${Date.now()}-${selectedFile.name}`
      const fileType = selectedFile.type

      // Get pre-signed URL from S3 (this would be a server action or API route in production)
      // For demo purposes, we'll simulate this
      const uploadUrl = `https://example-s3-bucket.s3.amazonaws.com/${fileName}`

      // In a real implementation, you would upload to the pre-signed URL
      // await fetch(uploadUrl, {
      //   method: 'PUT',
      //   body: selectedFile,
      //   headers: {
      //     'Content-Type': fileType,
      //   },
      // });

      // Save file metadata to Supabase
      const { error } = await supabase.from("uploads").insert({
        project_id: project.id,
        file_name: selectedFile.name,
        file_type: fileType,
        file_size: selectedFile.size,
        file_url: uploadUrl,
        description: description,
        uploaded_by: userRole === "creator" ? project.creator_id : project.editor_id,
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

      // Refresh the page to show the new upload
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async () => {
    if (!fileToDelete) return

    try {
      // Delete file from Supabase
      const { error } = await supabase.from("uploads").delete().eq("id", fileToDelete)

      if (error) {
        throw error
      }

      // In a real implementation, you would also delete from S3

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
    if (fileType.startsWith("image/")) {
      return <ImageIcon className="h-6 w-6 text-blue-500" />
    } else if (fileType.startsWith("video/")) {
      return <Video className="h-6 w-6 text-purple-500" />
    } else if (fileType.startsWith("text/")) {
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
                    <span>
                      {upload.uploaded_by === project.creator_id ? "Uploaded by Creator" : "Uploaded by Editor"}
                    </span>
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
