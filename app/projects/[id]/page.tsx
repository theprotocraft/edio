import { createServerClient } from "@/lib/supabase-client"
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
  const { id } = params
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch project details
  const { data: project } = await supabase
    .from("projects")
    .select(`
      *,
      creator:profiles!projects_creator_id_fkey(id, name, avatar_url, email),
      editor:profiles!projects_editor_id_fkey(id, name, avatar_url, email)
    `)
    .eq("id", id)
    .single()

  if (!project) {
    notFound()
  }

  // Check if user has access to this project
  const userIsCreator = project.creator_id === session.user.id
  const userIsEditor = project.editor_id === session.user.id

  if (!userIsCreator && !userIsEditor) {
    redirect("/dashboard")
  }

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  // Fetch project uploads
  const { data: uploads } = await supabase
    .from("uploads")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

  // Fetch video versions
  const { data: versions } = await supabase
    .from("video_versions")
    .select("*")
    .eq("project_id", id)
    .order("version_number", { ascending: false })

  // Fetch chat messages
  const { data: messages } = await supabase
    .from("chat_messages")
    .select(`
      *,
      sender:profiles(id, name, avatar_url)
    `)
    .eq("project_id", id)
    .order("created_at", { ascending: true })

  return (
    <DashboardLayout>
      <ProjectHeader project={project} userRole={userIsCreator ? "creator" : "editor"} />
      <ProjectTabs
        project={project}
        uploads={uploads || []}
        versions={versions || []}
        messages={messages || []}
        userRole={userIsCreator ? "creator" : "editor"}
        userId={session.user.id}
      />
    </DashboardLayout>
  )
}
