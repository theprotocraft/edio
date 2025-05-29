"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Clock, MoreHorizontal, Trash, Edit, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSupabase } from "@/hooks/useUser"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteProject, completeProject } from "@/lib/api"
import { getInitials } from "@/lib/utils"

interface ProjectHeaderProps {
  project: any
  userRole: "creator" | "editor"
}

export function ProjectHeader({ project, userRole }: ProjectHeaderProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { supabase } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  const handleDeleteProject = async () => {
    setLoading(true)

    try {
      await deleteProject(project.id)

      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully.",
      })

      router.push("/dashboard/projects")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleCompleteProject = async () => {
    setLoading(true)

    try {
      await completeProject(project.id)

      toast({
        title: "Project completed",
        description: "The project has been marked as completed.",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update project status.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setCompleteDialogOpen(false)
    }
  }

  const getStatusBadge = () => {
    switch (project.status) {
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            Approved
          </Badge>
        )
      case "in_review":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            In Review
          </Badge>
        )
      case "needs_changes":
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
            Needs Changes
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
            In Progress
          </Badge>
        )
    }
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-start md:justify-between md:space-y-0">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-bold tracking-tight">{project.project_title}</h1>
            {getStatusBadge()}
          </div>
          {project.hashtags && (
            <div className="mt-2 flex flex-wrap gap-2">
              {project.hashtags.split(/\s+/).map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center text-sm">
              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {userRole === "creator" && project.status !== "approved" && (
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(true)}
              disabled={loading}
              className="rounded-2xl"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Complete
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <a href={`/dashboard/projects/${project.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Project
                  </a>
                </Button>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-600 dark:text-red-500 dark:hover:text-red-500"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Project
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-6 flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Creator:</span>
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback>{getInitials(project.owner?.name || "C")}</AvatarFallback>
            </Avatar>
            <span>{project.owner?.name || "Unknown"}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Editors:</span>
          {project.editors && project.editors.length > 0 ? (
            <div className="flex items-center space-x-2">
              {project.editors.map((pe: any) => (
                <div key={pe.id} className="flex items-center space-x-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{getInitials(pe.editor?.name || "E")}</AvatarFallback>
                  </Avatar>
                  <span>{pe.editor?.name || "Unknown"}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark project as complete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the project as approved. You can still access all project data, but it will be moved to
              your completed projects list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompleteProject}
              disabled={loading}
              className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
            >
              {loading ? "Updating..." : "Complete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
