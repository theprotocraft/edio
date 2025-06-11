"use client"

import { useState } from "react"
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
import { createProject } from "@/lib/api"
import DragDrop from "./drag-drop"
import { Progress } from "@/components/ui/progress"

const projectSchema = z.object({
  projectTitle: z.string().min(1, "Project title is required"),
  videoTitle: z.string().optional(),
  description: z.string().optional(),
  hashtags: z.string().optional(),
  file: z.instanceof(File, { message: "Video file is required" }),
})

type ProjectFormValues = z.infer<typeof projectSchema>

export default function CreateProjectForm() {
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectTitle: "",
      videoTitle: "",
      description: "",
      hashtags: "",
    },
  })

  const onSubmit = async (data: ProjectFormValues) => {
    setLoading(true)
    setUploadProgress(0)

    try {
      await createProject({
        projectTitle: data.projectTitle,
        videoTitle: data.videoTitle,
        description: data.description,
        hashtags: data.hashtags,
        file: data.file,
        onProgress: (progress: number) => {
          setUploadProgress(progress)
        },
      })

      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
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
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
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

            <FormField
              control={form.control}
              name="hashtags"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Hashtags (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="#videoedit #youtube" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Upload Video</FormLabel>
                  <FormControl>
                    <DragDrop
                      accept={{ 'video/*': ['.mp4', '.mov'] }}
                      maxSize={10 * 1024 * 1024 * 1024} // 10GB
                      onDrop={(acceptedFiles: File[]) => {
                        if (acceptedFiles.length > 0) {
                          onChange(acceptedFiles[0])
                        }
                      }}
                      value={value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
    </div>
  )
} 