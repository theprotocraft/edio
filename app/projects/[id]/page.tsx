import { createServerClient } from "@/app/supabase-server"
import { redirect, notFound } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import ProjectHeader from "@/components/project-header"
import ProjectTabs from "@/components/project-tabs"

interface ProjectPageProps {
  params: {
    id: string
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  try {
    const { id } = params
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      redirect("/login")
    }

    // Fetch project details
    let project = null
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          owner:users!projects_owner_id_fkey(id, name, email),
          editors:project_editors(editor_id, editor:users(id, name, email))
        `)
        .eq("id", id)
        .single()

      if (error) {
        console.error("Project fetch error:", error)
        notFound()
      } else {
        project = data
      }
    } catch (error) {
      console.error("Error fetching project:", error)
      notFound()
    }

    if (!project) {
      notFound()
    }

    // Check if user has access to this project
    const userIsOwner = project.owner_id === session.user.id
    const userIsEditor = project.editors.some((editor) => editor.editor_id === session.user.id)

    if (!userIsOwner && !userIsEditor) {
      redirect("/dashboard")
    }

    // Fetch user profile
    let user = null
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", session.user.id).single()

      if (error) {
        console.error("User fetch error:", error)
      } else {
        user = data
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    }

    // Fetch project uploads
    let uploads = []
    try {
      const { data, error } = await supabase
        .from("uploads")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Uploads fetch error:", error)
      } else {
        uploads = data || []
      }
    } catch (error) {
      console.error("Error fetching uploads:", error)
    }

    // Fetch video versions
    let versions = []
    try {
      const { data, error } = await supabase
        .from("video_versions")
        .select("*")
        .eq("project_id", id)
        .order("version_number", { ascending: false })

      if (error) {
        console.error("Versions fetch error:", error)
      } else {
        versions = data || []
      }
    } catch (error) {
      console.error("Error fetching versions:", error)
    }

    // Fetch chat messages
    let messages = []
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:users(id, name, email)
        `)
        .eq("project_id", id)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Messages fetch error:", error)
      } else {
        messages = data || []
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    }

    return (
      <DashboardLayout>
        <ProjectHeader project={project} userRole={userIsOwner ? "creator" : "editor"} />
        <ProjectTabs
          project={project}
          uploads={uploads || []}
          versions={versions || []}
          messages={messages || []}
          userRole={userIsOwner ? "creator" : "editor"}
          userId={session.user.id}
        />
      </DashboardLayout>
    )
  } catch (error) {
    console.error("Project page error:", error)
    notFound()
  }
}
