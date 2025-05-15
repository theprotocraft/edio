"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSupabase } from "@/lib/supabase-provider"

export default function NewProjectPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const { supabase, user } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to create a project.",
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
      // Get user profile to determine if creator or editor
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

      if (userError) {
        throw new Error("Failed to fetch user data")
      }

      if (!userData) {
        throw new Error("User profile not found")
      }

      // Create the project
      const { data, error } = await supabase
        .from("projects")
        .insert({
          project_title: title,
          description,
          owner_id: userData.role === "youtuber" ? user.id : null,
          status: "pending",
        })
        .select()

      if (error) {
        throw error
      }

      // If user is an editor, add them as a project editor
      if (userData.role === "editor" && data && data[0]) {
        const { error: editorError } = await supabase.from("project_editors").insert({
          project_id: data[0].id,
          editor_id: user.id,
        })

        if (editorError) {
          console.error("Failed to add editor to project:", editorError)
        }
      }

      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
      })

      // Navigate to the project page
      router.push(`/projects/${data[0].id}`)
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
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <h1 className="text-3xl font-bold">Create New Project</h1>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Fill in the details for your new video project</CardDescription>
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
            <CardFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  )
}
