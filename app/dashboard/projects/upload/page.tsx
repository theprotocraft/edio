import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase-server"
import CreateProjectForm from "@/components/custom/create-project-form"

export const metadata: Metadata = {
  title: "Upload New Project",
  description: "Upload a new video project to collaborate with editors",
}

export default async function UploadPage() {
  const supabase = createServerClient()
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
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Upload New Project</h1>
        <p className="text-muted-foreground">
          Upload a video and provide details for your editor
        </p>
      </div>
      
      <CreateProjectForm />
    </div>
  )
} 