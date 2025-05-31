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
    const { project, uploads, versions, messages, userRole, userId } = await fetchProjectDetails(id)

    if (!project) {
      notFound()
    }

    return (
      <div>
        <ProjectHeader project={project} userRole={userRole as "creator" | "editor"} />
        <ProjectTabs
          project={project}
          uploads={uploads || []}
          versions={versions || []}
          messages={messages || []}
          userRole={userRole as "creator" | "editor"}
          userId={userId}
        />
      </div>
    )
  } catch (error) {
    console.error("Project page error:", error)
    notFound()
  }
}
