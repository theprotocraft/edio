import { notFound } from "next/navigation"
import { fetchProjectDetails } from "@/lib/server-api"
import { ProjectHeader } from "@/components/custom/project-header"
import { ProjectTabs } from "@/components/custom/project-tabs"

interface ProjectPageProps {
  params: {
    id: string
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  try {
    const { id } = await params
    const result = await fetchProjectDetails(id)
    
    if (!result.project) {
      notFound()
    }

    return (
      <div>
        <ProjectHeader project={result.project} userRole={result.userRole as "creator" | "editor"} />
        <ProjectTabs
          project={result.project}
          uploads={result.uploads || []}
          versions={result.versions || []}
          messages={result.messages || []}
          userRole={result.userRole as "creator" | "editor"}
          userId={result.userId}
        />
      </div>
    )
  } catch (error) {
    console.error("Project page error:", error)
    notFound()
  }
}
