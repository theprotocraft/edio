"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSupabase } from "@/hooks/useUser"
import { updateProject, uploadFile, getPresignedViewUrl } from "@/lib/api"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { ImageIcon, Upload } from "lucide-react"
import { formatFileSize } from "@/lib/utils"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ProjectDetailsProps {
  project: any
  userRole: "youtuber" | "editor"
  uploads?: any[]
}

interface YouTubeChannel {
  id: string
  channel_name: string
  channel_thumbnail: string
}

const projectDetailsSchema = z.object({
  videoTitle: z.string().optional(),
  description: z.string().optional(),
  hashtags: z.string().optional(),
  youtubeChannel: z.string().optional(),
})

type ProjectDetailsFormValues = z.infer<typeof projectDetailsSchema>

export function ProjectDetails({ project, userRole, uploads = [] }: ProjectDetailsProps) {
  const [loading, setLoading] = useState(false)
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [channels, setChannels] = useState<YouTubeChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useSupabase()

  // Find thumbnail from uploads (if any)
  const thumbnailUpload = uploads.find(upload => upload.file_type === "thumbnail");

  // Get presigned URL for thumbnail
  useEffect(() => {
    if (thumbnailUpload?.file_url) {
      const getUrl = async () => {
        try {
          const presignedUrl = await getPresignedViewUrl(thumbnailUpload.file_url);
          setThumbnailUrl(presignedUrl);
        } catch (error) {
          console.error("Failed to get presigned URL for thumbnail:", error);
          // Set a placeholder or error image
          setThumbnailUrl(null);
        }
      };
      
      getUrl();
    }
  }, [thumbnailUpload]);

  // Fetch YouTube channels on component mount
  useEffect(() => {
    const fetchChannels = async () => {
      setLoadingChannels(true)
      try {
        const response = await fetch('/api/youtube/channels')
        if (!response.ok) {
          throw new Error('Failed to fetch YouTube channels')
        }
        const data = await response.json()
        setChannels(data.channels)
      } catch (error) {
        console.error('Error fetching YouTube channels:', error)
        toast({
          title: "Error",
          description: "Failed to load YouTube channels",
          variant: "destructive",
        })
      } finally {
        setLoadingChannels(false)
      }
    }

    if (userRole === "youtuber") {
      fetchChannels()
    }
  }, [userRole, toast])

  const form = useForm<ProjectDetailsFormValues>({
    resolver: zodResolver(projectDetailsSchema),
    defaultValues: {
      videoTitle: project.video_title || "",
      description: project.description || "",
      hashtags: project.hashtags || "",
      youtubeChannel: project.youtube_channel_id || "",
    },
  })

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedThumbnail(e.target.files[0])
    }
  }

  const handleThumbnailUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedThumbnail) {
      toast({
        title: "No thumbnail selected",
        description: "Please select an image to upload as thumbnail.",
        variant: "destructive",
      })
      return
    }

    // Check if file is an image
    if (!selectedThumbnail.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.).",
        variant: "destructive",
      })
      return
    }

    setUploadingThumbnail(true)
    setUploadProgress(0)

    try {
      await uploadFile({
        file: selectedThumbnail,
        projectId: project.id,
        onProgress: (progress) => setUploadProgress(progress),
      })

      toast({
        title: "Thumbnail uploaded",
        description: "Your thumbnail has been uploaded successfully.",
      })

      // Reset form
      setSelectedThumbnail(null)
      setUploadProgress(0)

      // Refresh the page to show the new upload
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload thumbnail.",
        variant: "destructive",
      })
      setUploadProgress(0)
    } finally {
      setUploadingThumbnail(false)
    }
  }

  const onSubmit = async (data: ProjectDetailsFormValues) => {
    if (!user) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to update project details.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      await updateProject(project.id, {
        title: project.project_title,
        videoTitle: data.videoTitle,
        description: data.description,
        hashtags: data.hashtags,
        youtube_channel_id: data.youtubeChannel,
      })

      toast({
        title: "Project updated",
        description: "Your project details have been updated successfully.",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update project details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Video Details</CardTitle>
              <CardDescription>Edit your YouTube video details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="videoTitle"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Video Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter video title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Video Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter your YouTube video description" rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {userRole === "youtuber" && (
                <FormField
                  control={form.control}
                  name="youtubeChannel"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>YouTube Channel</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loadingChannels}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select YouTube channel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {channels.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id}>
                              <div className="flex items-center">
                                <img
                                  src={channel.channel_thumbnail}
                                  alt={channel.channel_name}
                                  className="w-6 h-6 rounded-full mr-2"
                                />
                                <span>{channel.channel_name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Thumbnail Upload Section */}
              <div className="space-y-4 border p-4 rounded-lg">
                <h3 className="font-medium text-base">Update Thumbnail</h3>
                
                {thumbnailUpload ? (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Current Thumbnail</p>
                    <div className="flex items-start space-x-4">
                      {thumbnailUrl ? (
                        <div className="relative h-36 w-64 overflow-hidden rounded-md border">
                          <Image 
                            src={thumbnailUrl} 
                            alt="Current thumbnail"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-36 w-64 border rounded-md bg-muted/30">
                          <div className="text-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Loading thumbnail...</p>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{thumbnailUpload.file_name}</p>
                        <p className="text-xs text-muted-foreground">Uploaded: {new Date(thumbnailUpload.created_at).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">Size: {formatFileSize(thumbnailUpload.file_size)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Replace Thumbnail</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input 
                            id="thumbnail" 
                            type="file" 
                            accept="image/*"
                            onChange={handleThumbnailChange} 
                            className="flex-1" 
                          />
                          <Button
                            type="button"
                            onClick={handleThumbnailUpload}
                            disabled={!selectedThumbnail || uploadingThumbnail}
                            className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
                          >
                            {uploadingThumbnail ? (
                              "Uploading..."
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" /> Replace
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="flex items-center justify-center h-36 w-full border-2 border-dashed rounded-md bg-muted/30 mb-4">
                      <div className="text-center">
                        <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No thumbnail uploaded yet</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="thumbnail">Upload Thumbnail</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          id="thumbnail" 
                          type="file" 
                          accept="image/*"
                          onChange={handleThumbnailChange} 
                          className="flex-1" 
                        />
                        <Button
                          type="button"
                          onClick={handleThumbnailUpload}
                          disabled={!selectedThumbnail || uploadingThumbnail}
                          className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
                        >
                          {uploadingThumbnail ? (
                            "Uploading..."
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" /> Upload
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {uploadingThumbnail && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Uploading thumbnail...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {selectedThumbnail && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedThumbnail.name} ({formatFileSize(selectedThumbnail.size)})
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Recommended size: 1280×720 pixels (16:9 ratio) • Maximum size: 2MB • Formats: JPG, PNG
                </p>
              </div>

              <FormField
                control={form.control}
                name="hashtags"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Hashtags (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter hashtags separated by spaces" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Example: #youtube #video #tutorial
                    </p>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}