"use client"

import { notFound } from "next/navigation"
import { ProjectHeader } from "@/components/custom/project-header"
import { ProjectTabs } from "@/components/custom/project-tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState, use } from "react"
import { createClient } from "@/app/lib/supabase-client"

interface Editor {
  id: string
  name: string | null
  email: string | null
}

interface ProjectPageProps {
  params: Promise<{
    id: string
  }>
}

function EditorSelect({ projectId, activeEditors, currentEditorId }: { projectId: string, activeEditors: Editor[], currentEditorId: string | null }) {
  const { toast } = useToast()

  const handleEditorChange = async (value: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/editor`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ editorId: value }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update editor')
      }

      toast({
        title: "Editor updated",
        description: "The project editor has been updated successfully.",
      })
    } catch (error: any) {
      console.error("Error assigning editor:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update editor",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="mt-4 p-4 border rounded-lg">
      <h3 className="text-lg font-medium mb-2">Assign Editor</h3>
      <Select
        defaultValue={currentEditorId || "unassigned"}
        onValueChange={handleEditorChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select an editor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {activeEditors.map((editor) => (
            <SelectItem key={editor.id} value={editor.id}>
              {editor.name || editor.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = use(params)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"youtuber" | "editor" | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user's role
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single()
          setUserRole(userData?.role || null)
        }

        // Get project data
        const response = await fetch(`/api/projects/${resolvedParams.id}`)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to fetch project')
        }
        const result = await response.json()
        console.log("result", result)
        setData(result)
      } catch (error: any) {
        console.error("Project page error:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: error.message || "Failed to load project",
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [resolvedParams.id, toast, supabase])

  if (error) {
    notFound()
  }

  if (!data || !userRole) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <ProjectHeader project={data} userRole={userRole} />
      <ProjectTabs
        project={data}
        uploads={data.uploads || []}
        versions={data.versions || []}
        messages={data.messages || []}
        userRole={userRole}
        userId={data.userId}
      />
      
      {userRole === "youtuber" && data.activeEditors && data.activeEditors.length > 0 && (
        <EditorSelect 
          projectId={resolvedParams.id}
          activeEditors={data.activeEditors}
          currentEditorId={data.project_editors[0].editor.id}
        />
      )}
    </div>
  )
}
