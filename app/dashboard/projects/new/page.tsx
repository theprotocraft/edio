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
    <div className="flex flex-col space-y-6 w-full max-w-none">
      <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
      <CreateProjectForm />
    </div>
  )
}
