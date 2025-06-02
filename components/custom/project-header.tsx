"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Clock, MoreHorizontal, Trash, CheckCircle, UserPlus, Loader2 } from "lucide-react"
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
import { deleteProject, completeProject, fetchEditors, assignEditorToProject } from "@/lib/api"
import { getInitials } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ProjectHeaderProps {
  project: any
  userRole: "creator" | "editor"
}

interface Editor {
  id: string
  name: string
  email: string
  avatar_url?: string
}

export function ProjectHeader({ project, userRole }: ProjectHeaderProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingEditors, setLoadingEditors] = useState(false)
  const [editors, setEditors] = useState<Editor[]>([])
  const [selectedEditorId, setSelectedEditorId] = useState<string>("")
  const [assigningEditor, setAssigningEditor] = useState(false)
  const { supabase } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  // Fetch available editors when dialog opens
  useEffect(() => {
    if (assignDialogOpen) {
      const getEditors = async () => {
        setLoadingEditors(true)
        try {
          const editorsData = await fetchEditors()
          setEditors(editorsData)
        } catch (error) {
          console.error("Failed to load editors:", error)
          toast({
            title: "Failed to load editors",
            description: "Could not retrieve the list of available editors.",
            variant: "destructive",
          })
        } finally {
          setLoadingEditors(false)
        }
      }

      getEditors()
    }
  }, [assignDialogOpen, toast])

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

  const handleAssignEditor = async () => {
    if (!selectedEditorId) {
      toast({
        title: "No editor selected",
        description: "Please select an editor to assign to this project.",
        variant: "destructive",
      })
      return
    }

    setAssigningEditor(true)

    try {
      const result = await assignEditorToProject(project.id, selectedEditorId)
      
      if (result.success) {
        toast({
          title: "Editor assigned",
          description: "The editor has been assigned to this project.",
        })
        setAssignDialogOpen(false)
        router.refresh()
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign editor.",
        variant: "destructive",
      })
    } finally {
      setAssigningEditor(false)
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

  // Check if there are editors assigned to the project
  const hasAssignedEditors = project.editors && project.editors.length > 0

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
            <>
              {!hasAssignedEditors && (
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-2xl">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign Editor
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Editor to Project</DialogTitle>
                      <DialogDescription>
                        Select an editor from your invited editors to assign to this project.
                      </DialogDescription>
                    </DialogHeader>
                    {loadingEditors ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2">Loading editors...</span>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Select
                          value={selectedEditorId}
                          onValueChange={setSelectedEditorId}
                          disabled={loadingEditors}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an editor" />
                          </SelectTrigger>
                          <SelectContent>
                            {editors.length > 0 ? (
                              editors.map((editor) => (
                                <SelectItem key={editor.id} value={editor.id}>
                                  <div className="flex items-center">
                                    <Avatar className="h-6 w-6 mr-2">
                                      <AvatarImage src={editor.avatar_url} alt={editor.name} />
                                      <AvatarFallback>{editor.name?.charAt(0).toUpperCase() || 'E'}</AvatarFallback>
                                    </Avatar>
                                    <span>{editor.name || editor.email}</span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="flex items-center justify-center py-2">
                                <span className="text-sm text-muted-foreground">No editors available</span>
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {editors.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            You must invite editors in the Editors tab before they can be assigned to projects.
                          </p>
                        )}
                      </div>
                    )}
                    <DialogFooter>
                      <Button
                        onClick={handleAssignEditor}
                        disabled={!selectedEditorId || assigningEditor}
                        className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
                      >
                        {assigningEditor ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning...
                          </>
                        ) : (
                          "Assign Editor"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Button
                variant="outline"
                onClick={() => setCompleteDialogOpen(true)}
                disabled={loading}
                className="rounded-2xl"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Complete
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
          {hasAssignedEditors ? (
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
          ) : userRole === "creator" ? (
            <div className="flex items-center">
              <span className="text-muted-foreground">Unassigned</span>
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
            <AlertDialogAction onClick={handleCompleteProject} disabled={loading}>
              {loading ? "Updating..." : "Complete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
