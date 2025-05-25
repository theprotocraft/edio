import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import { ProjectCard } from "@/components/custom/project-card"
import { fetchProjects } from "@/lib/server-api"

export default async function ProjectsPage() {
  try {
    const { user: userData, projects, isCreator } = await fetchProjects()
    
    if (!userData) {
      redirect("/login")
    }

    // Split projects by status
    const inProgress = projects?.filter(p => p.status === "pending" || p.status === "in_review") || []
    const needsChanges = projects?.filter(p => p.status === "needs_changes") || []
    const completed = projects?.filter(p => p.status === "approved") || []

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Projects</h1>
          <Link href="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({projects?.length || 0})</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress ({inProgress.length})</TabsTrigger>
            <TabsTrigger value="needs-changes">Needs Changes ({needsChanges.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            {projects && projects.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} isCreator={isCreator} />
                ))}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <h3 className="text-lg font-medium mb-2">No projects found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {isCreator
                    ? "Create a new project to get started."
                    : "You don't have any projects assigned to you yet."}
                </p>
                {isCreator && (
                  <Link href="/projects/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Create Project
                    </Button>
                  </Link>
                )}
              </Card>
            )}
          </TabsContent>
          <TabsContent value="in-progress" className="space-y-4">
            {inProgress.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((project) => (
                  <ProjectCard key={project.id} project={project} isCreator={isCreator} />
                ))}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <h3 className="text-lg font-medium">No in-progress projects</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  All of your projects have been completed or need changes.
                </p>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="needs-changes" className="space-y-4">
            {needsChanges.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {needsChanges.map((project) => (
                  <ProjectCard key={project.id} project={project} isCreator={isCreator} />
                ))}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <h3 className="text-lg font-medium">No projects need changes</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  None of your projects currently need changes.
                </p>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-4">
            {completed.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completed.map((project) => (
                  <ProjectCard key={project.id} project={project} isCreator={isCreator} />
                ))}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <h3 className="text-lg font-medium">No completed projects</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have any completed projects yet.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    )
  } catch (error) {
    console.error("Projects page error:", error)
    redirect("/login")
  }
} 