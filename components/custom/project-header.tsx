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
import { Clock, MoreHorizontal, Trash, CheckCircle, UserPlus, Loader2, Youtube, X } from "lucide-react"
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
import { deleteProject, completeProject, fetchEditors } from "@/lib/api"
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
import { Label } from "@/components/ui/label"

interface ProjectHeaderProps {
  project: any
  userRole: "youtuber" | "editor"
}

interface ProjectEditor {
  editor: {
    id: string
    name?: string
    email?: string
  } | null
}

interface Editor {
  id: string
  name: string
  email: string
  avatar_url?: string
}

interface YouTubeChannel {
  id: string
  title: string
  thumbnailUrl: string
}

interface VideoVersion {
  id: string
  version_number: number
  file_url: string
  created_at: string
  notes?: string
  uploader?: {
    name: string
  }
}

export function ProjectHeader({ project, userRole }: ProjectHeaderProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingEditors, setLoadingEditors] = useState(false)
  const [editors, setEditors] = useState<Editor[]>([])
  const [selectedEditorId, setSelectedEditorId] = useState<string>("")
  const [assigningEditor, setAssigningEditor] = useState(false)
  const [channels, setChannels] = useState<YouTubeChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [videoVersions, setVideoVersions] = useState<VideoVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<string>("")
  const [selectedPrivacyStatus, setSelectedPrivacyStatus] = useState<string>("private")
  const [localProjectEditors, setLocalProjectEditors] = useState<ProjectEditor[]>(project.project_editors || [])
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

  // Fetch YouTube channels on component mount
  useEffect(() => {
    const fetchChannels = async () => {
      setLoadingChannels(true)
      try {
        const response = await fetch('/api/youtube/channels')
        if (!response.ok) {
          throw new Error('Failed to fetch YouTube channels')
        }
        const data = await response.json()
        console.log('YouTube channels:', data.channels)
        setChannels(data.channels)
      } catch (error) {
        console.error('Error fetching YouTube channels:', error)
        toast({
          title: "Error",
          description: "Failed to load YouTube channels",
          variant: "destructive",
        })
      } finally {
        setLoadingChannels(false)
      }
    }

    fetchChannels()
  }, [toast])

  // Fetch video versions when publish dialog opens
  useEffect(() => {
    if (publishDialogOpen) {
      const fetchVersions = async () => {
        setLoadingVersions(true)
        try {
          const response = await fetch(`/api/projects/${project.id}/versions`)
          if (!response.ok) {
            throw new Error('Failed to fetch video versions')
          }
          const data = await response.json()
          setVideoVersions(data.versions || [])
          
          // Auto-select the latest version
          if (data.versions && data.versions.length > 0) {
            setSelectedVersionId(data.versions[0].id)
          }
        } catch (error) {
          console.error('Error fetching video versions:', error)
          toast({
            title: "Error",
            description: "Failed to load video versions",
            variant: "destructive",
          })
        } finally {
          setLoadingVersions(false)
        }
      }

      fetchVersions()
    }
  }, [publishDialogOpen, project.id, toast])

  // Update local state when project data changes
  useEffect(() => {
    setLocalProjectEditors(project.project_editors || [])
  }, [project.project_editors])

  // Add debug logging for project data
  useEffect(() => {
    console.log('Project data:', project)
    console.log('YouTube channel ID:', project.youtube_channel_id)
    console.log('User role:', userRole)
    console.log('Owner role:', project.owner?.role)
    console.log('Available channels:', channels)
  }, [project, userRole, channels])

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
      const response = await fetch(`/api/projects/${project.id}/editor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ editorId: selectedEditorId }),
      })

      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Editor assigned",
          description: "The editor has been assigned to this project.",
        })
        setAssignDialogOpen(false)
        setSelectedEditorId("")
        
        // Add the new editor to local state immediately
        const newEditor = editors.find(e => e.id === selectedEditorId)
        if (newEditor) {
          setLocalProjectEditors(prev => [
            ...prev,
            { editor: { id: newEditor.id, name: newEditor.name, email: newEditor.email } }
          ])
        }
        
        router.refresh()
      } else {
        throw new Error(result.error || "Failed to assign editor")
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

  const handleRemoveEditor = async (editorId: string | undefined) => {
    if (!editorId) return

    try {
      const response = await fetch(`/api/projects/${project.id}/editor?editorId=${editorId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Editor removed",
          description: "The editor has been removed from this project.",
        })
        
        // Remove the editor from local state immediately
        setLocalProjectEditors(prev => 
          prev.filter(pe => pe.editor?.id !== editorId)
        )
        
        router.refresh()
      } else {
        throw new Error(result.error || "Failed to remove editor")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove editor.",
        variant: "destructive",
      })
    }
  }

  const handlePublishToYouTube = async () => {
    if (!project.youtube_channel_id) {
      toast({
        title: "No channel selected",
        description: "Please select a YouTube channel before publishing.",
        variant: "destructive",
      })
      return
    }

    if (!selectedVersionId) {
      toast({
        title: "No version selected",
        description: "Please select a video version to publish.",
        variant: "destructive",
      })
      return
    }

    setPublishing(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          versionId: selectedVersionId,
          privacyStatus: selectedPrivacyStatus,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to publish video')
      }

      toast({
        title: "Video published",
        description: "Your video has been published to YouTube successfully.",
      })

      setPublishDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish video",
        variant: "destructive",
      })
    } finally {
      setPublishing(false)
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
  const assignedEditors = localProjectEditors?.filter(pe => pe.editor !== null) || []
  const hasAssignedEditors = assignedEditors.length > 0

  const privacyOptions = [
    { value: "private", label: "Private", description: "Only you can view" },
    { value: "unlisted", label: "Unlisted", description: "Anyone with the link can view" },
    { value: "public", label: "Public", description: "Anyone can search for and view" },
  ]

  return (
    <div className="mb-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-start md:justify-between md:space-y-0">
        <div>
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold tracking-tight">{project.project_title}</h1>
            {getStatusBadge()}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center text-sm">
              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {userRole === "youtuber" && project.status !== "approved" && (
            <>
              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-2xl">
                    <UserPlus className="mr-2 h-4 w-4" />
                    {hasAssignedEditors ? 'Add Editor' : 'Assign Editor'}
                  </Button>
                </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{hasAssignedEditors ? 'Add Editor to Project' : 'Assign Editor to Project'}</DialogTitle>
                      <DialogDescription>
                        Select an editor from your invited editors to {hasAssignedEditors ? 'add to' : 'assign to'} this project.
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
                              editors
                                .filter(editor => !assignedEditors.some(ae => ae.editor?.id === editor.id))
                                .map((editor) => (
                                  <SelectItem key={editor.id} value={editor.id}>
                                    <div className="flex items-center">
                                      <Avatar className="h-6 w-6 mr-2">
                                        <AvatarImage src={editor.avatar_url || ""} alt={editor.name} />
                                        <AvatarFallback>{getInitials(editor.name)}</AvatarFallback>
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
                          hasAssignedEditors ? "Add Editor" : "Assign Editor"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
          <span className="text-sm font-medium">{hasAssignedEditors && assignedEditors.length > 1 ? 'Editors:' : 'Editor:'}</span>
          {hasAssignedEditors ? (
            <div className="flex items-center space-x-2 flex-wrap">
              {assignedEditors.map((projectEditor, index) => (
                <div key={projectEditor.editor?.id || index} className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs">{getInitials(projectEditor.editor?.name || "E")}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{projectEditor.editor?.name || projectEditor.editor?.email || "Unknown"}</span>
                  {userRole === "youtuber" && project.status !== "approved" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-red-500 hover:text-white"
                      onClick={() => handleRemoveEditor(projectEditor.editor?.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : userRole === "youtuber" ? (
            <div className="flex items-center">
              <span className="text-muted-foreground">Unassigned</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </div>

        {userRole === "youtuber" && project.status === "approved" && (
          <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={!project.youtube_channel_id}
                className="bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-md transition-transform active:scale-[0.98]"
              >
                <Youtube className="mr-2 h-4 w-4" />
                Publish to YouTube
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Publish to YouTube</DialogTitle>
                <DialogDescription>
                  Select the video version and privacy settings for your YouTube upload.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Video Version Selection */}
                <div className="space-y-2">
                  <Label htmlFor="version-select">Video Version</Label>
                  {loadingVersions ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm">Loading versions...</span>
                    </div>
                  ) : (
                    <Select
                      value={selectedVersionId}
                      onValueChange={setSelectedVersionId}
                      disabled={loadingVersions}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {selectedVersionId ? (
                            (() => {
                              const selectedVersion = videoVersions.find(v => v.id === selectedVersionId)
                              return selectedVersion ? (
                                <div className="flex flex-col items-start text-left">
                                  <span>Version {selectedVersion.version_number}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(selectedVersion.created_at).toLocaleDateString()} 
                                    {selectedVersion.uploader?.name && ` • by ${selectedVersion.uploader.name}`}
                                    {selectedVersion.notes && ` • ${selectedVersion.notes}`}
                                  </span>
                                </div>
                              ) : "Select a video version"
                            })()
                          ) : "Select a video version"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {videoVersions.map((version) => (
                          <SelectItem key={version.id} value={version.id}>
                            <div className="flex flex-col">
                              <span>Version {version.version_number}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(version.created_at).toLocaleDateString()} 
                                {version.uploader?.name && ` • by ${version.uploader.name}`}
                                {version.notes && ` • ${version.notes}`}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Privacy Settings */}
                <div className="space-y-2">
                  <Label htmlFor="privacy-select">Privacy Setting</Label>
                  <Select
                    value={selectedPrivacyStatus}
                    onValueChange={setSelectedPrivacyStatus}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {selectedPrivacyStatus ? (
                          (() => {
                            const selectedOption = privacyOptions.find(option => option.value === selectedPrivacyStatus)
                            return selectedOption ? (
                              <div className="flex flex-col items-start text-left">
                                <span>{selectedOption.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {selectedOption.description}
                                </span>
                              </div>
                            ) : "Select privacy setting"
                          })()
                        ) : "Select privacy setting"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {privacyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPublishDialogOpen(false)}
                  disabled={publishing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePublishToYouTube}
                  disabled={publishing || !selectedVersionId || loadingVersions}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Youtube className="mr-2 h-4 w-4" />
                      Confirm & Publish
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
