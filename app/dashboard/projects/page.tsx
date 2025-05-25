import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search } from "lucide-react"
import { fetchProjects } from "@/lib/server-api"
import { redirect } from "next/navigation"
import { ProjectCard } from "@/components/custom/project-card"

export default async function ProjectsPage() {
  try {
    const { user, projects, isCreator } = await fetchProjects()

    return (
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <Link href="/dashboard/projects/new">
            <Button className="rounded-2xl shadow-md transition-transform active:scale-[0.98]">
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </Link>
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search projects..." className="w-full pl-8" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="needs_changes">Needs Changes</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="newest">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="deadline">Deadline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects && projects.length > 0 ? (
            projects.map((project) => (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <ProjectCard
                  project={project}
                  isCreator={isCreator}
                  className="h-full hover:shadow-lg transition-all"
                />
              </Link>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center h-60 text-center">
              <p className="text-muted-foreground mb-4">No projects found</p>
              <Link href="/dashboard/projects/new">
                <Button className="rounded-2xl shadow-md transition-transform active:scale-[0.98]">
                  <Plus className="mr-2 h-4 w-4" /> Create Your First Project
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    console.error("Projects page error:", error)
    redirect("/login")
  }
}
