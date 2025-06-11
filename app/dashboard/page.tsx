import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Video, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { fetchDashboardData } from "@/lib/server-api"
import { DashboardNotifications } from "@/app/components/dashboard-notifications"

export default async function DashboardPage() {
  try {
    const { user: userData, projects, notifications, isCreator } = await fetchDashboardData()
    
    if (!userData) {
      redirect("/login")
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link href="/dashboard/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Video className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects?.length || 0}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isCreator ? "Videos in production" : "Videos you're editing"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects?.filter((p) => p.status === "pending" || p.status === "in_review").length || 0}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active projects being worked on</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects?.filter((p) => p.status === "approved").length || 0}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Successfully delivered projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <AlertCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects?.filter((p) => p.status === "needs_changes").length || 0}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Projects awaiting feedback</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mt-6 md:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your most recently updated projects</CardDescription>
            </CardHeader>
            <CardContent>
              {projects && projects.length > 0 ? (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block">
                      <div className="flex items-center space-x-4 rounded-md border p-4 hover:bg-gray-50 dark:hover:bg-gray-900">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">{project.project_title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isCreator
                              ? `Editor: ${
                                  project.editors && project.editors[0]?.editor?.name
                                    ? project.editors[0].editor.name
                                    : "Unassigned"
                                }`
                              : `Creator: ${project.owner?.name || "Unknown"}`}
                          </p>
                        </div>
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
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No projects yet</p>
                  <Link href="/dashboard/projects/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Create Project
                    </Button>
                  </Link>
                </div>
              )}
              {projects && projects.length > 0 && (
                <div className="mt-4">
                  <Link href="/dashboard/projects">
                    <Button variant="outline" className="w-full">
                      View All Projects
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
          <DashboardNotifications notifications={notifications} />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Dashboard error:", error)
    redirect("/login")
  }
}
