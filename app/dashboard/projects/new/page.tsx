import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase-server"
import CreateProjectForm from "@/components/custom/create-project-form"

export default async function NewProjectPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }
  
  // Check if user is a YouTuber
  const { data: userData, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
    
  if (error || !userData || userData.role !== "youtuber") {
    // Only YouTubers can create projects
    redirect("/dashboard")
  }
  
  return (
    <div className="container max-w-4xl py-6">
      <h1 className="mb-6 text-3xl font-bold">Create New Project</h1>
      <CreateProjectForm />
    </div>
  )
}
