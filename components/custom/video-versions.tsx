"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Video } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { VersionCard } from "@/components/custom/version-card"
import { VersionPreviewDialog } from "@/components/custom/version-preview-dialog"
import { VersionUpload } from "@/components/custom/version-upload"
import { sendFeedback } from "@/lib/api"
import { useRouter } from "next/navigation"

interface VideoVersionsProps {
  project: any
  versions: any[]
  userRole: "creator" | "editor"
}

interface Version {
  id: string
  version_number: number
  file_url: string
  notes?: string
  created_at: string
  uploader_id: string
  uploader?: {
    name?: string
  }
}

export function VideoVersions({ project, versions, userRole }: VideoVersionsProps) {
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handlePreview = (version: Version) => {
    setSelectedVersion(version)
    setPreviewDialogOpen(true)
  }

  const handleFeedback = (version: Version) => {
    setSelectedVersion(version)
    setFeedbackDialogOpen(true)
  }

  const handleSubmitFeedback = async () => {
    if (!selectedVersion || !feedback.trim()) return

    setSubmittingFeedback(true)
    try {
      await sendFeedback({
        projectId: project.id,
        versionId: selectedVersion.id,
        feedback: feedback.trim(),
      })

      toast({
        title: "Feedback sent",
        description: "Your feedback has been sent successfully.",
      })

      setFeedback("")
      setFeedbackDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send feedback.",
        variant: "destructive",
      })
    } finally {
      setSubmittingFeedback(false)
    }
  }

  // Sort versions by version number, descending (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.version_number - a.version_number)

  return (
    <div className="space-y-6">
      {/* Upload New Version */}
      <VersionUpload 
        projectId={project.id} 
        userRole={userRole}
        disabled={project.status === "approved"}
      />

      {/* Versions List */}
      <div className="space-y-4">
        <h3 className="text-xl font-medium">Video Versions</h3>
        
        {sortedVersions.length > 0 ? (
          <div className="space-y-4">
            {sortedVersions.map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                project={project}
                userRole={userRole}
                onPreview={() => handlePreview(version)}
                onFeedback={userRole === "creator" ? () => handleFeedback(version) : undefined}
                uploaderName={version.uploader?.name}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <Video className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No video versions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {userRole === "creator" 
                ? "Your editor will upload the first version here." 
                : "Upload your first video version to get started."
              }
            </p>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <VersionPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        version={selectedVersion}
      />

      {/* Feedback Dialog */}
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
              disabled={!feedback.trim() || submittingFeedback}
            >
              {submittingFeedback ? "Sending..." : "Send Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
