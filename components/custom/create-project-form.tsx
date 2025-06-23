"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createProject, fetchEditors, uploadVideoVersion } from "@/lib/api"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/app/lib/supabase-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Upload, Video, FileVideo } from "lucide-react"

const projectSchema = z.object({
  projectTitle: z.string().min(1, "Project title is required"),
  videoTitle: z.string().optional(),
  description: z.string().optional(),
  selectedEditors: z.array(z.string()).optional(),
})

type ProjectFormValues = z.infer<typeof projectSchema>

interface Editor {
  id: string
  email: string
  name: string
}

export default function CreateProjectForm() {
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editors, setEditors] = useState<Editor[]>([])
  const [loadingEditors, setLoadingEditors] = useState(true)
  const [selectedEditors, setSelectedEditors] = useState<string[]>([])
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [videoUploadProgress, setVideoUploadProgress] = useState(0)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectTitle: "",
      videoTitle: "",
      description: "",
      selectedEditors: [],
    },
  })

  useEffect(() => {
    const loadEditors = async () => {
      try {
        const editorsData = await fetchEditors()
        setEditors(editorsData)
      } catch (error) {
        console.error('Failed to fetch editors:', error)
      } finally {
        setLoadingEditors(false)
      }
    }
    loadEditors()
  }, [])

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
      if (validateVideoFile(file)) {
        setSelectedVideo(file)
      }
    }
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (validateVideoFile(file)) {
        setSelectedVideo(file)
      }
    }
  }

  const validateVideoFile = (file: File): boolean => {
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

  const removeVideoFile = () => {
    setSelectedVideo(null)
    setVideoUploadProgress(0)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const onSubmit = async (data: ProjectFormValues) => {
    setLoading(true)
    setUploadProgress(0)

    try {
      // First create the project
      const project = await createProject({
        projectTitle: data.projectTitle,
        videoTitle: data.videoTitle,
        description: data.description,
        selectedEditors: selectedEditors,
        onProgress: (progress: number) => {
          setUploadProgress(progress)
        },
      })

      // If there's a video selected, upload it as the first version
      if (selectedVideo && project.projectId) {
        setIsUploadingVideo(true)
        setVideoUploadProgress(0)
        
        await uploadVideoVersion({
          projectId: project.projectId,
          file: selectedVideo,
          notes: "Initial video upload",
          onProgress: (progress: number) => {
            setVideoUploadProgress(progress)
          },
        })
      }

      toast({
        title: "Project created",
        description: selectedVideo 
          ? "Your new project has been created and video uploaded successfully."
          : "Your new project has been created successfully.",
      })

      // Navigate to projects page
      router.push("/dashboard/projects")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create project.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setIsUploadingVideo(false)
    }
  }

  return (
    <Card className="shadow-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Fill in the details for your new video project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="projectTitle"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Project Title (Internal)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project title for internal tracking" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="videoTitle"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Video Title (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter final YouTube video title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter video description" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Video Upload Section */}
            <div className="space-y-2">
              <FormLabel>Upload Video (Optional)</FormLabel>
              
              {/* File Upload Area */}
              {!selectedVideo && (
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
                      onChange={handleVideoChange}
                      className="hidden"
                      id="video-upload"
                      disabled={loading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      disabled={loading}
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
              {selectedVideo && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileVideo className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{selectedVideo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedVideo.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeVideoFile}
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Upload Progress */}
              {isUploadingVideo && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading video...</span>
                    <span>{Math.round(videoUploadProgress)}%</span>
                  </div>
                  <Progress value={videoUploadProgress} className="w-full" />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                You can upload a video now or add it later from the project page.
              </p>
            </div>

            {!loadingEditors && editors.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Select Editors (Optional)</FormLabel>
                
                {/* Display selected editors */}
                {selectedEditors.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/20">
                    {selectedEditors.map((editorId) => {
                      const editor = editors.find(e => e.id === editorId)
                      return (
                        <div key={editorId} className="flex items-center gap-1 bg-white dark:bg-gray-800 border rounded-full px-3 py-1 shadow-sm">
                          <span className="text-sm font-medium">{editor?.name || editor?.email || 'Unknown'}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-red-500 hover:text-white rounded-full"
                            onClick={() => {
                              const newSelected = selectedEditors.filter(id => id !== editorId)
                              setSelectedEditors(newSelected)
                              form.setValue('selectedEditors', newSelected)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* Editor selection dropdown */}
                <Select
                  value="" // Always keep it empty to show placeholder
                  onValueChange={(value) => {
                    if (value && value !== "none" && !selectedEditors.includes(value)) {
                      const newSelected = [...selectedEditors, value]
                      setSelectedEditors(newSelected)
                      form.setValue('selectedEditors', newSelected)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add an editor" />
                  </SelectTrigger>
                  <SelectContent>
                    {editors
                      .filter(editor => !selectedEditors.includes(editor.id))
                      .length > 0 ? (
                      editors
                        .filter(editor => !selectedEditors.includes(editor.id))
                        .map((editor) => (
                          <SelectItem key={editor.id} value={editor.id}>
                            {editor.name || editor.email}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="px-2 py-1 text-sm text-muted-foreground">
                        All editors have been selected
                      </div>
                    )}
                  </SelectContent>
                </Select>
                
                {selectedEditors.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No editors selected. You can assign editors later from the project page.
                  </p>
                )}
              </div>
            )}

            {!loadingEditors && editors.length === 0 && (
              <div className="space-y-2">
                <FormLabel>Editors</FormLabel>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    No editors available for assignment.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    To assign editors to projects, first invite them from the{" "}
                    <a href="/dashboard/editors" className="text-primary underline">
                      Editors page
                    </a>{" "}
                    and wait for them to accept your invitation.
                  </p>
                </div>
              </div>
            )}

            {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading video...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
            >
              {loading ? "Creating Project..." : "Create Project"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
} 