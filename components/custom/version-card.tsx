"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Play, 
  Star, 
  CheckCircle, 
  MessageSquare, 
  Trash,
  Calendar,
  User
} from "lucide-react"
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
import { updateProject, deleteVideoVersion } from "@/lib/api"

interface VersionCardProps {
  version: {
    id: string
    version_number: number
    file_url: string
    notes?: string
    created_at: string
    uploader_id: string
  }
  project: {
    id: string
    owner_id: string
    final_version_number?: number
  }
  userRole: "youtuber" | "editor"
  onPreview: () => void
  onFeedback?: () => void
  uploaderName?: string
  onProjectUpdate?: (updates: any) => void
  currentUserId?: string
}

export function VersionCard({ 
  version, 
  project, 
  userRole, 
  onPreview, 
  onFeedback,
  uploaderName,
  onProjectUpdate,
  currentUserId
}: VersionCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [finalDialogOpen, setFinalDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const isCreator = userRole === "youtuber"
  const isOwner = version.uploader_id === project.owner_id
  const isFinal = project.final_version_number === version.version_number
  const isUploader = currentUserId && version.uploader_id === currentUserId
  // YouTuber can delete any version, Editor can delete only their own uploaded versions
  const canDelete = isCreator || (!isCreator && isUploader)
  const canSetFinal = isCreator && !isFinal

  const handleSetFinal = async () => {
    setLoading(true)
    try {
      await updateProject(project.id, { finalVersionNumber: version.version_number })
      
      // Update project state immediately for faster UI response
      if (onProjectUpdate) {
        onProjectUpdate({ final_version_number: version.version_number })
      }
      
      toast({
        title: "Final version set",
        description: `Version ${version.version_number} has been marked as the final version.`,
      })
      
      // Fallback to router refresh if no callback provided
      if (!onProjectUpdate) {
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set final version.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setFinalDialogOpen(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteVideoVersion(version.id, project.id)
      
      toast({
        title: "Version deleted",
        description: "The video version has been deleted successfully.",
      })
      
      // Trigger refresh through parent component
      if (onProjectUpdate) {
        onProjectUpdate({ refresh: true })
      } else {
        // Fallback: refresh the page if no callback provided
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete version.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors shadow-sm w-full">
        <div className="flex flex-col gap-3">
          {/* Thumbnail */}
          <div className="w-full">
            <div 
              className="bg-muted rounded-md overflow-hidden cursor-pointer group relative w-full"
              style={{
                height: '120px',
                aspectRatio: '16/9'
              }}
              onClick={onPreview}
            >
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                  <Play className="w-5 h-5" />
                  <span className="text-sm font-medium">Preview</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm">Version {version.version_number}</h4>
              {isFinal && (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <Star className="w-3 h-3 mr-1" />
                  Final
                </Badge>
              )}
            </div>


            {/* Notes */}
            {version.notes && (
              <div className="mb-1 p-1.5 bg-muted/50 rounded-md">
                <h5 className="text-xs font-medium mb-0.5">Notes:</h5>
                <p className="text-xs text-muted-foreground line-clamp-1">{version.notes}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{uploaderName || (isOwner ? "Creator" : "Editor")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(version.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-1">
            {canSetFinal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFinalDialogOpen(true)}
                disabled={loading}
                className="rounded-lg text-xs px-2 py-1 h-7"
              >
                <Star className="mr-1 h-3 w-3" />
                Final
              </Button>
            )}
            
            {isCreator && onFeedback && !isFinal && (
              <Button
                variant="outline"
                size="sm"
                onClick={onFeedback}
                className="rounded-lg text-xs px-2 py-1 h-7"
              >
                <MessageSquare className="mr-1 h-3 w-3" />
                Feedback
              </Button>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 text-xs px-2 py-1 h-7"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={loading}
              >
                <Trash className="mr-1 h-3 w-3" />
                Delete
              </Button>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Set Final Confirmation Dialog */}
      <AlertDialog open={finalDialogOpen} onOpenChange={setFinalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set as Final Version?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark Version {version.version_number} as the final version? 
              This will remove the final status from any other version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSetFinal}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Setting..." : "Set as Final"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete Version {version.version_number}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}