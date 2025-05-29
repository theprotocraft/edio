"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSupabase } from "@/hooks/useUser"
import { fetchProject, updateProject } from "@/lib/api"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

interface EditProjectPageProps {
  params: {
    id: string
  }
}

const projectSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  videoTitle: z.string().min(1, "Video title is required"),
  description: z.string().min(1, "Video description is required"),
})

type ProjectFormValues = z.infer<typeof projectSchema>

export default function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = params
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const { supabase, user } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      videoTitle: "",
      description: "",
    },
  })

  useEffect(() => {
    const loadProject = async () => {
      if (!user) return

      try {
        const project = await fetchProject(id)

        if (!project) {
          router.push("/dashboard/projects")
          return
        }

        form.reset({
          title: project.project_title || "",
          videoTitle: project.video_title || "",
          description: project.description || "",
        })
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load project.",
          variant: "destructive",
        })
        router.push("/dashboard/projects")
      } finally {
        setInitialLoading(false)
      }
    }

    loadProject()
  }, [id, user, router, toast, form])

  const onSubmit = async (data: ProjectFormValues) => {
    if (!user) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to update a project.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      await updateProject(id, {
        title: data.title,
        videoTitle: data.videoTitle,
        description: data.description,
      })

      toast({
        title: "Project updated",
        description: "Your project has been updated successfully.",
      })

      // Navigate back to the project page
      router.push(`/dashboard/projects/${id}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update project.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Edit Project</h1>

      <Card className="shadow-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Update the details for your project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
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
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => router.push(`/dashboard/projects/${id}`)}>
                Cancel
              </Button>
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
