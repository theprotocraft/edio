"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSupabase } from "@/lib/supabase-provider"

interface EditProjectPageProps {
  params: {
    id: string
  }
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = params
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const { supabase, user } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchProject = async () => {
      if (!user) return

      try {
        // First fetch the project
        const { data: project, error } = await supabase
          .from("projects")
          .select(`
            *,
            owner_id
          `)
          .eq("id", id)
          .single()

        if (error) {
          throw error
        }

        if (!project) {
          router.push("/projects")
          return
        }

        // Then check if user is an editor
        const { data: editorData, error: editorError } = await supabase
          .from("project_editors")
          .select("editor_id")
          .eq("project_id", id)
          .eq("editor_id", user.id)

        // Check if user has access to this project
        const userIsOwner = project.owner_id === user.id
        const userIsEditor = editorData && editorData.length > 0

        if (!userIsOwner && !userIsEditor) {
          router.push("/projects")
          return
        }

        setTitle(project.project_title || "")
        setDescription(project.description || "")
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load project.",
          variant: "destructive",
        })
        router.push("/projects")
      } finally {
        setInitialLoading(false)
      }
    }

    fetchProject()
  }, [id, supabase, user, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to update a project.",
        variant: "destructive",
      })
      return
    }

    if (!title.trim()) {
      toast({
        title: "Validation error",
        description: "Project title is required.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          project_title: title,
          description,
        })
        .eq("id", id)

      if (error) {
        throw error
      }

      toast({
        title: "Project updated",
        description: "Your project has been updated successfully.",
      })

      // Navigate back to the project page
      router.push(`/projects/${id}`)
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
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading project...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <h1 className="text-3xl font-bold">Edit Project</h1>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Update the details for your project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  placeholder="Enter project title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your project, requirements, and goals"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => router.push(`/projects/${id}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  )
}
