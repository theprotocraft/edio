import { createServerClient } from "@/app/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Clock } from "lucide-react"

export default async function ProjectsPage() {
  try {
    const supabase = createServerClient()

    // Get user with getUser() for security
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      redirect("/login")
    }

    const userId = userData.user.id

    // Fetch user profile
    let user = null
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

      if (error) {
        console.error("User fetch error:", error)
      } else {
        user = data
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    }

    // Fetch projects - fix .or() logic by running separate queries
    let projects = []
    try {
      // First, get projects where user is owner
      const { data: ownerProjects, error: ownerError } = await supabase
        .from("projects")
        .select(`
          *,
          owner:users!projects_owner_id_fkey(id, name, email)
        `)
        .eq("owner_id", userId)
        .order("updated_at", { ascending: false })

      if (ownerError) {
        console.error("Owner projects fetch error:", ownerError)
      }

      // Then, get projects where user is editor
      const { data: editorData, error: editorError } = await supabase
        .from("project_editors")
        .select(`
          project_id,
          project:projects(
            *,
            owner:users!projects_owner_id_fkey(id, name, email)
          )
        `)
        .eq("editor_id", userId)
        .order("project(updated_at)", { ascending: false })

      if (editorError) {
        console.error("Editor projects fetch error:", editorError)
      }

      // Combine and deduplicate results
      const editorProjects = editorData?.map((item) => item.project) || []
      const allProjects = [...(ownerProjects || []), ...(editorProjects || [])]

      // Remove duplicates by project ID
      projects = Array.from(new Map(allProjects.map((project) => [project.id, project])).values()).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
    } catch (error) {
      console.error("Error fetching projects:", error)
    }

    const isCreator = user?.role === "youtuber"

    return (
      <DashboardLayout>
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Projects</h1>
            <Link href="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Button>
            </Link>
          </div>

          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
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
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{project.project_title}</CardTitle>
                        <div
                          className={`px-2 py-1 text-xs rounded-full ${
                            project.status === "approved"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : project.status === "needs_changes"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                          }`}
                        >
                          {project.status === "pending"
                            ? "In Progress"
                            : project.status === "in_review"
                              ? "In Review"
                              : project.status === "needs_changes"
                                ? "Needs Changes"
                                : "Approved"}
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {project.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-2">
                        {isCreator ? (
                          <div className="flex items-center text-sm">
                            <span className="font-medium mr-2">Editor:</span>
                            <span>
                              {project.editors && project.editors[0]?.editor?.name
                                ? project.editors[0].editor.name
                                : "Unassigned"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center text-sm">
                            <span className="font-medium mr-2">Creator:</span>
                            <span>{project.owner?.name || "Unknown"}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center h-60 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No projects found</p>
                <Link href="/projects/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Create Your First Project
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    )
  } catch (error) {
    console.error("Projects page error:", error)
    redirect("/login")
  }
}
