"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSupabase } from "@/hooks/useUser"
import { createProject, fetchEditors } from "@/lib/api"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const projectSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  videoTitle: z.string().min(1, "Video title is required"),
  description: z.string().min(1, "Video description is required"),
  editorId: z.string().optional(),
})

type ProjectFormValues = z.infer<typeof projectSchema>

interface Editor {
  id: string
  name: string
  email: string
  avatar_url?: string
}

export default function NewProjectPage() {
  const [loading, setLoading] = useState(false)
  const [editors, setEditors] = useState<Editor[]>([])
  const [loadingEditors, setLoadingEditors] = useState(false)
  const { supabase, user } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  // Fetch available editors
  useEffect(() => {
    const getEditors = async () => {
      setLoadingEditors(true)
      try {
        const editorsData = await fetchEditors()
        setEditors(editorsData)
      } catch (error) {
        console.error("Failed to load editors:", error)
        toast({
          title: "Failed to load editors",
          description: "Could not retrieve the list of available editors.",
          variant: "destructive",
        })
      } finally {
        setLoadingEditors(false)
      }
    }

    getEditors()
  }, [toast])

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      videoTitle: "",
      description: "",
      editorId: "",
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
        editorId: data.editorId === "none" || !data.editorId ? undefined : data.editorId, // Handle "none" value
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
              <FormField
                control={form.control}
                name="editorId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Assign Editor</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={loadingEditors}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an editor (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {loadingEditors ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading editors...</span>
                          </div>
                        ) : editors.length > 0 ? (
                          editors.map((editor) => (
                            <SelectItem key={editor.id} value={editor.id}>
                              <div className="flex items-center">
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarImage src={editor.avatar_url} alt={editor.name} />
                                  <AvatarFallback>{editor.name?.charAt(0).toUpperCase() || 'E'}</AvatarFallback>
                                </Avatar>
                                <span>{editor.name || editor.email}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="flex items-center justify-center py-2">
                            <span className="text-sm text-muted-foreground">No editors invited yet</span>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      You can assign an editor now or later from the project page. <span className="text-muted-foreground/80">Editors must be invited in the Editors tab first.</span>
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
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
