import { createServerClient } from "@/app/supabase-server"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Video, Clock, CheckCircle, AlertCircle } from "lucide-react"

export default async function DashboardPage() {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      redirect("/login")
    }

    // Fetch user profile
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

    // Fetch recent projects
    const { data: projects } = await supabase
      .from("projects")
      .select("*, profiles!projects_creator_id_fkey(name, avatar_url)")
      .or(`creator_id.eq.${session.user.id},editor_id.eq.${session.user.id}`)
      .order("updated_at", { ascending: false })
      .limit(4)

    // Fetch notifications
    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(5)

    const isCreator = profile?.user_type === "creator"

    return (
      <DashboardLayout>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link href="/projects/new">
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
                {projects?.filter((p) => p.status === "in_progress").length || 0}
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
              <div className="text-2xl font-bold">{projects?.filter((p) => p.status === "completed").length || 0}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Successfully delivered projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <AlertCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects?.filter((p) => p.status === "review").length || 0}</div>
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
                    <Link key={project.id} href={`/projects/${project.id}`} className="block">
                      <div className="flex items-center space-x-4 rounded-md border p-4 hover:bg-gray-50 dark:hover:bg-gray-900">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">{project.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isCreator
                              ? `Editor: ${project.editor_name || "Unassigned"}`
                              : `Creator: ${project.profiles?.name || "Unknown"}`}
                          </p>
                        </div>
                        <div
                          className={`px-2 py-1 text-xs rounded-full ${
                            project.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : project.status === "review"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                          }`}
                        >
                          {project.status === "in_progress"
                            ? "In Progress"
                            : project.status === "review"
                              ? "In Review"
                              : "Completed"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No projects yet</p>
                  <Link href="/projects/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Create Project
                    </Button>
                  </Link>
                </div>
              )}
              {projects && projects.length > 0 && (
                <div className="mt-4">
                  <Link href="/projects">
                    <Button variant="outline" className="w-full">
                      View All Projects
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>Stay updated on your project activities</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications && notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex items-start space-x-4 rounded-md border p-4">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{notification.message}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  } catch (error) {
    // If there's an error with Supabase, redirect to setup page
    console.error("Dashboard error:", error)
    redirect("/setup-required")
  }
}
