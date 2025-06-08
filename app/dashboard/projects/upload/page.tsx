import { Metadata } from "next"
import CreateProjectForm from "@/components/custom/create-project-form"

export const metadata: Metadata = {
  title: "Upload New Project",
  description: "Upload a new video project to collaborate with editors",
}

export default function UploadPage() {
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