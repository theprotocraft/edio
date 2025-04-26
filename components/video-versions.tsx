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
import { useSupabase } from "@/lib/supabase-provider"
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

interface VideoVersionsProps {
  project: any
  versions: any[]
  userRole: "creator" | "editor"
}

export function VideoVersions({ project, versions, userRole }: VideoVersionsProps) {
  const [title, setTitle] = useState("")
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
  const { supabase } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !videoUrl) {
      toast({
        title: "Missing information",
        description: "Please provide a title and video URL.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Get the next version number
      const nextVersionNumber = versions.length > 0 ? Math.max(...versions.map((v) => v.version_number)) + 1 : 1

      // Save version to Supabase
      const { error } = await supabase.from("video_versions").insert({
        project_id: project.id,
        title,
        video_url: videoUrl,
        notes,
        version_number: nextVersionNumber,
        status: "pending",
        created_by: userRole === "creator" ? project.creator_id : project.editor_id,
      })

      if (error) {
        throw error
      }

      // Update project status to "review" if editor submitted a version
      if (userRole === "editor") {
        await supabase.from("projects").update({ status: "review" }).eq("id", project.id)
      }

      toast({
        title: "Version added",
        description: "Your video version has been added successfully.",
      })

      // Reset form
      setTitle("")
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
      // Delete version from Supabase
      const { error } = await supabase.from("video_versions").delete().eq("id", versionToDelete)

      if (error) {
        throw error
      }

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
      // Update version status
      const { error: versionError } = await supabase
        .from("video_versions")
        .update({ status: "approved" })
        .eq("id", versionToApprove)

      if (versionError) {
        throw versionError
      }

      // Update project status
      const { error: projectError } = await supabase
        .from("projects")
        .update({ status: "completed" })
        .eq("id", project.id)

      if (projectError) {
        throw projectError
      }

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
      // Add feedback as a chat message
      const { error } = await supabase.from("chat_messages").insert({
        project_id: project.id,
        sender_id: userRole === "creator" ? project.creator_id : project.editor_id,
        message: `Feedback on version ${selectedVersion.version_number} (${selectedVersion.title}): ${feedback}`,
        message_type: "feedback",
      })

      if (error) {
        throw error
      }

      // Update version status to "feedback"
      await supabase.from("video_versions").update({ status: "feedback" }).eq("id", selectedVersion.id)

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            Approved
          </span>
        )
      case "feedback":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            Feedback Provided
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
            Pending Review
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {userRole === "editor" && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleAddVersion} className="space-y-4">
              <h3 className="text-lg font-medium mb-4">Add New Version</h3>
              <div className="space-y-2">
                <Label htmlFor="title">Version Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., First Draft, Final Cut"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  placeholder="https://example.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">Paste a link to your video (YouTube, Vimeo, or direct file URL)</p>
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
              <Button type="submit" disabled={loading}>
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
            <div key={version.id} className="rounded-lg border p-4 hover:bg-gray-50 dark:hover:bg-gray-900">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">
                      Version {version.version_number}: {version.title}
                    </h4>
                    {getStatusBadge(version.status)}
                  </div>

                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md mb-4 overflow-hidden">
                    {version.video_url && (
                      <iframe
                        src={
                          version.video_url.includes("youtube.com")
                            ? version.video_url.replace("watch?v=", "embed/")
                            : version.video_url.includes("vimeo.com")
                              ? version.video_url.replace("vimeo.com", "player.vimeo.com/video")
                              : version.video_url
                        }
                        className="w-full h-full"
                        allowFullScreen
                        title={version.title}
                      />
                    )}
                  </div>

                  {version.notes && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium mb-1">Notes:</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{version.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{version.created_by === project.creator_id ? "Added by Creator" : "Added by Editor"}</span>
                    <span>{new Date(version.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2">
                  {userRole === "creator" && version.status === "pending" && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setVersionToApprove(version.id)
                          setApproveDialogOpen(true)
                        }}
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
                      >
                        <MessageSquare className="mr-2 h-4 w-4" /> Feedback
                      </Button>
                    </>
                  )}

                  {((userRole === "creator" && version.created_by === project.creator_id) ||
                    (userRole === "editor" && version.created_by === project.editor_id)) && (
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
          <Video className="h-10 w-10 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No video versions yet</h3>
          {userRole === "editor" ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Add your first video version to get feedback
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Waiting for the editor to upload the first version
            </p>
          )}
          {userRole === "editor" && (
            <Button onClick={() => document.getElementById("title")?.focus()}>
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
            <AlertDialogAction onClick={handleApproveVersion}>Approve</AlertDialogAction>
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
            <Button onClick={handleSubmitFeedback} disabled={!feedback}>
              Send Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
