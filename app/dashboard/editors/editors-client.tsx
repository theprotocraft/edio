"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { PlusCircle, UserPlus, CheckCircle, XCircle, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { User } from "@supabase/supabase-js"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const inviteSchema = z.object({
  editor_email: z.string().email("Please enter a valid email address"),
  project_id: z.string().uuid("Invalid project ID"),
})

type InviteFormValues = z.infer<typeof inviteSchema>

interface Editor {
  id: string
  status: "pending" | "active" | "rejected"
  created_at: string
  project_id: string
  editor?: {
    id: string
    email: string
    name: string
  }
}

interface Project {
  id: string
  project_title: string
}

interface TransformedEditor {
  id: string
  status: "pending" | "active" | "rejected"
  created_at: string
  editor?: {
    id: string
    email: string
    user_metadata: {
      full_name?: string | null
    }
  }
  project_name: string | null
}

interface EditorsClientProps {
  user: User
}

export function EditorsClient({ user }: EditorsClientProps) {
  const [editors, setEditors] = useState<TransformedEditor[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      editor_email: "",
      project_id: "",
    },
  })

  useEffect(() => {
    fetchEditors()
  }, [user])

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, project_title")
      .eq("owner_id", user.id)

    if (error) throw error

    setProjects(data)
  }

  const fetchEditors = async () => {
    try {
      // First get the project IDs owned by the user
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id")
        .eq("owner_id", user.id)

      if (projectsError) throw projectsError

      // Then get the editors for those projects
      const { data, error } = await supabase
        .from("project_editors")
        .select(`
          id,
          status,
          created_at,
          editor_id,
          project_id,
          editor:editor_id!inner (
            id,
            email,
            name
          )
        `)
        .in("project_id", projects?.map(p => p.id) || [])
        .eq("status", "active")

      // Get project details for each project ID
      const { data: projectDetails, error: projectDetailsError } = await supabase
        .from("projects")
        .select("id, project_title")
        .in("id", projects?.map(p => p.id) || [])

      if (projectDetailsError) {
        console.error("Error fetching project details:", projectDetailsError)
        throw projectDetailsError
      }

      // Create a map of project IDs to titles for easy lookup
      const projectMap = new Map(
        projectDetails?.map(project => [project.id, project.project_title]) || []
      )
      if (error) {
        console.error("Error fetching editors:", error)
        throw error
      }

      // Transform the data
      const transformedData = (data as unknown as Editor[]).map(editor => ({
        id: editor.id,
        status: editor.status,
        created_at: editor.created_at,
        editor: editor.editor ? {
          id: editor.editor.id,
          email: editor.editor.email,
          user_metadata: {
            full_name: editor.editor.name,
          } // Add empty metadata since we're not fetching it
        } : undefined,
        project_name: projectMap.get(editor.project_id) || null
      }))

      setEditors(transformedData)
    } catch (error: any) {
      console.error("Error in fetchEditors:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch editors.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: z.infer<typeof inviteSchema>) => {
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", data.editor_email)
        .single()

      if (userError) throw userError
      if (!existingUser) throw new Error("User not found")

      const projectId = data.project_id

      const { data: existingInvite } = await supabase
        .from("project_editors")
        .select("*")
        .eq("project_id", projectId)
        .eq("editor_id", existingUser.id)
        .single()

      if (existingInvite) {
        toast({
          title: "Already Invited",
          description: "This editor has already been invited to your project.",
          variant: "destructive",
        })
        return
      }

      const { data: editorData, error: editorError } = await supabase
        .from("project_editors")
        .insert({
          project_id: projectId,
          editor_id: existingUser.id,
          status: "pending",
        })
        .select()
        .single()

      if (editorError) {
        console.error("Error adding editor:", editorError)
        throw editorError
      }

      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: existingUser.id,
        type: "editor_invite",
        content: `${user.email} invited you to be an editor`,
        metadata: { 
          project_id: projectId,
          invitation_id: editorData.id,
          editor_id: existingUser.id
        },
        invitation_status: "pending",
      })

      if (notificationError) {
        console.error("Error creating notification:", notificationError)
        throw notificationError
      }

      // const { error: functionError } = await supabase.functions.invoke("resend-email-ps", {
      //   body: { to: data.editor_email, subject: "You have been invited to collaborate on a project", body: "You have been invited to collaborate on a project" },
      // })

      // if (functionError) {
      //   console.error("Error sending email:", functionError)
      //   throw functionError
      // }

      toast({
        title: "Invitation sent",
        description: "The editor has been invited successfully.",
      })

      setInviteDialogOpen(false)
      form.reset()
      fetchEditors()
    } catch (error: any) {
      console.error("Error in onSubmit:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
      case "active":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading editors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Editors</h1>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl shadow-md transition-transform active:scale-[0.98]">
              <PlusCircle className="mr-2 h-4 w-4" />
              Invite Editor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Editor</DialogTitle>
              <DialogDescription>
                Invite an editor to collaborate on your projects. They will receive an email notification.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="editor_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="editor@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects?.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.project_title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {editors.map((editor) => (
          <Card key={editor.id} className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{editor.editor?.user_metadata?.full_name || editor.editor?.email}</span>
                {getStatusBadge(editor.status)}
              </CardTitle>
              <CardDescription>
                {editor.editor?.email}
                {editor.project_name && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    • Project: <span className="font-bold ml-1">{editor.project_name}</span>
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {editor.status === "pending" ? (
                  "Waiting for editor to accept invitation"
                ) : editor.status === "active" ? (
                  "Editor is active and can collaborate on projects"
                ) : (
                  "Editor has rejected the invitation"
                )}
              </p>
            </CardContent>
          </Card>
        ))}

        {editors.length === 0 && (
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No editors yet</p>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Invite editors to collaborate on your projects
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 