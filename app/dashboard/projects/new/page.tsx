"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSupabase } from "@/hooks/useUser"
import { createProject } from "@/lib/api"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const projectSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  videoTitle: z.string().min(1, "Video title is required"),
  description: z.string().min(1, "Video description is required"),
})

type ProjectFormValues = z.infer<typeof projectSchema>

export default function NewProjectPage() {
  const [loading, setLoading] = useState(false)
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

  const onSubmit = async (data: ProjectFormValues) => {
    if (!user) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to create a project.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const projectId = await createProject({
        title: data.title,
        videoTitle: data.videoTitle,
        description: data.description,
      })

      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
      })

      // Navigate to the project page
      router.push(`/dashboard/projects/${projectId}`)
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
    <div className="flex flex-col space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>

      <Card className="shadow-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Fill in the details for your new video project</CardDescription>
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
            <CardFooter>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
              >
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
