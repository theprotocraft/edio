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
}

export function VersionCard({ 
  version, 
  project, 
  userRole, 
  onPreview, 
  onFeedback,
  uploaderName,
  onProjectUpdate
}: VersionCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [finalDialogOpen, setFinalDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const isCreator = userRole === "youtuber"
  const isOwner = version.uploader_id === project.owner_id
  const isFinal = project.final_version_number === version.version_number
  const canDelete = (isCreator && isOwner) || (!isCreator && !isOwner)
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
      await deleteVideoVersion(version.id)
      
      toast({
        title: "Version deleted",
        description: "The video version has been deleted successfully.",
      })
      
      router.refresh()
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
      <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="font-medium">Version {version.version_number}</h4>
              {isFinal && (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <Star className="w-3 h-3 mr-1" />
                  Final
                </Badge>
              )}
            </div>

            {/* Thumbnail/Preview */}
            <div 
              className="aspect-video bg-muted rounded-md mb-4 overflow-hidden cursor-pointer group relative"
              onClick={onPreview}
            >
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
                <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                  <Play className="w-12 h-12" />
                  <span className="text-sm font-medium">Click to Preview</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {version.notes && (
              <div className="mb-4 p-3 bg-muted/50 rounded-md">
                <h5 className="text-sm font-medium mb-1">Version Notes:</h5>
                <p className="text-sm text-muted-foreground">{version.notes}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{uploaderName || (isOwner ? "Creator" : "Editor")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(version.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-row md:flex-col gap-2">
            {canSetFinal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFinalDialogOpen(true)}
                disabled={loading}
                className="rounded-lg"
              >
                <Star className="mr-2 h-4 w-4" />
                Set as Final
              </Button>
            )}
            
            {isCreator && onFeedback && !isFinal && (
              <Button
                variant="outline"
                size="sm"
                onClick={onFeedback}
                className="rounded-lg"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Feedback
              </Button>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={loading}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
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