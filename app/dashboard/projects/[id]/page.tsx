"use client"

import { notFound } from "next/navigation"
import { ProjectHeader } from "@/components/custom/project-header"
import { ProjectTabs } from "@/components/custom/project-tabs"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState, use } from "react"
import { createClient } from "@/app/lib/supabase-client"

interface ProjectPageProps {
  params: Promise<{
    id: string
  }>
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
    </div>
  )
}
