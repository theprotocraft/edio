"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Plus, Video, CheckCircle, MessageSquare, Trash } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { addVideoVersion, deleteVideoVersion, approveVersion, sendFeedback } from "@/lib/api"

interface VideoVersionsProps {
  project: any
  versions: any[]
  userRole: "creator" | "editor"
}

export function VideoVersions({ project, versions, userRole }: VideoVersionsProps) {
  const [videoUrl, setVideoUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [versionToApprove, setVersionToApprove] = useState<string | null>(null)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<any>(null)
  const [feedback, setFeedback] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!videoUrl) {
      toast({
        title: "Missing information",
        description: "Please provide a video URL.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      await addVideoVersion({
        projectId: project.id,
        videoUrl,
        notes,
      })

      toast({
        title: "Version added",
        description: "Your video version has been added successfully.",
      })

      // Reset form
      setVideoUrl("")
      setNotes("")

      // Refresh the page
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add version.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVersion = async () => {
    if (!versionToDelete) return

    try {
      await deleteVideoVersion(versionToDelete)

      toast({
        title: "Version deleted",
        description: "The video version has been deleted successfully.",
      })

      // Refresh the page
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete version.",
        variant: "destructive",
      })
    } finally {
      setVersionToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  const handleApproveVersion = async () => {
    if (!versionToApprove) return

    try {
      await approveVersion(project.id)

      toast({
        title: "Version approved",
        description: "The video version has been approved and the project marked as completed.",
      })

      // Refresh the page
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Approval failed",
        description: error.message || "Failed to approve version.",
        variant: "destructive",
      })
    } finally {
      setVersionToApprove(null)
      setApproveDialogOpen(false)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!selectedVersion || !feedback) return

    try {
      await sendFeedback({
        projectId: project.id,
        versionId: selectedVersion.id,
        feedback,
      })

      toast({
        title: "Feedback sent",
        description: "Your feedback has been sent successfully.",
      })

      // Reset form and close dialog
      setFeedback("")
      setFeedbackDialogOpen(false)

      // Refresh the page
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send feedback.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {userRole === "editor" && (
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <form onSubmit={handleAddVersion} className="space-y-4">
              <h3 className="text-lg font-medium mb-4">Add New Version</h3>
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  placeholder="https://example.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Paste a link to your video (YouTube, Vimeo, or direct file URL)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this version"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
              >
                {loading ? "Adding..." : "Add Version"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <h3 className="text-xl font-medium mt-8 mb-4">Video Versions</h3>

      {versions && versions.length > 0 ? (
        <div className="space-y-4">
          {versions.map((version) => (
            <div key={version.id} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">Version {version.version_number}</h4>
                  </div>

                  <div className="aspect-video bg-muted rounded-md mb-4 overflow-hidden">
                    {version.file_url && (
                      <iframe
                        src={
                          version.file_url.includes("youtube.com")
                            ? version.file_url.replace("watch?v=", "embed/")
                            : version.file_url.includes("vimeo.com")
                              ? version.file_url.replace("vimeo.com", "player.vimeo.com/video")
                              : version.file_url
                        }
                        className="w-full h-full"
                        allowFullScreen
                        title={`Version ${version.version_number}`}
                      />
                    )}
                  </div>

                  {version.notes && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium mb-1">Notes:</h5>
                      <p className="text-sm text-muted-foreground">{version.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>{version.uploader_id === project.owner_id ? "Added by Creator" : "Added by Editor"}</span>
                    <span>{new Date(version.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2">
                  {userRole === "creator" && project.status === "in_review" && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setVersionToApprove(version.id)
                          setApproveDialogOpen(true)
                        }}
                        className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVersion(version)
                          setFeedbackDialogOpen(true)
                        }}
                        className="rounded-2xl"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" /> Feedback
                      </Button>
                    </>
                  )}

                  {((userRole === "creator" && version.uploader_id === project.owner_id) ||
                    (userRole === "editor" && version.uploader_id !== project.owner_id)) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => {
                        setVersionToDelete(version.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Video className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No video versions yet</h3>
          {userRole === "editor" && (
            <Button
              onClick={() => document.getElementById("videoUrl")?.focus()}
              className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
            >
              <Plus className="mr-2 h-4 w-4" /> Add First Version
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this video version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this version?</AlertDialogTitle>
            <AlertDialogDescription>
              Approving this version will mark the project as completed. You can still access all project data, but it
              will be moved to your completed projects list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveVersion}
              className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Feedback</DialogTitle>
            <DialogDescription>
              Your feedback will be sent to the editor and added to the project chat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="What changes would you like to see?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedback}
              className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
            >
              Send Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
