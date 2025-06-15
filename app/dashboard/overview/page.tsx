import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Video, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { fetchDashboardData } from "@/lib/server-api"
import { redirect } from "next/navigation"
import { ProjectCard } from "@/components/custom/project-card"
import { createServerClient } from "@/lib/supabase-server"
import { Notifications } from "@/app/components/notifications"
import { NotificationActions } from "@/app/components/notification-actions"
import { NotificationsList } from "@/app/components/notifications-list"

interface Project {
  id: string
  project_title: string
  description?: string
  status?: string
  created_at: string
  updated_at?: string
  owner?: {
    name: string
    avatar_url?: string
  }
}

export default async function OverviewPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  try {
    const { projects, notifications, isCreator } = await fetchDashboardData()

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          {isCreator && (
            <Link href="/dashboard/projects/new">
              <Button className="rounded-2xl shadow-md transition-transform active:scale-[0.98]">
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Button>
            </Link>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {isCreator ? "Videos in production" : "Videos you're editing"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects?.filter((p) => p.status === "pending" || p.status === "in_review").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Active projects being worked on</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects?.filter((p) => p.status === "approved").length || 0}</div>
              <p className="text-xs text-muted-foreground">Successfully delivered projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects?.filter((p) => p.status === "needs_changes").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Projects awaiting feedback</p>
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
                  {projects.slice(0, 4).map((project: Project) => (
                    <ProjectCard key={project.id} project={project} isCreator={isCreator} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <p className="text-muted-foreground mb-4">
                    {isCreator ? "No projects yet" : "No projects assigned to you yet"}
                  </p>
                  {isCreator && (
                    <Link href="/dashboard/projects/new">
                      <Button className="rounded-2xl shadow-md transition-transform active:scale-[0.98]">
                        <Plus className="mr-2 h-4 w-4" /> Create Project
                      </Button>
                    </Link>
                  )}
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
          <NotificationsList notifications={notifications} />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="text-center text-muted-foreground">
          Error loading dashboard data. Please try again later.
        </div>
      </div>
    )
  }
}
