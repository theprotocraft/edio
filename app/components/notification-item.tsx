"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface NotificationItemProps {
  notification: {
    id: string
    type: string
    content: string
    metadata: any
    read: boolean
    invitation_status?: string
    created_at: string
  }
  onActionComplete: () => void
}

export function NotificationItem({ notification, onActionComplete }: NotificationItemProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [action, setAction] = useState<"accept" | "reject" | null>(null)
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()

  const handleEditorInvite = async (accept: boolean) => {
    setLoading(true)
    try {
      // Update project_editors table
      const { error: editorError } = await supabase
        .from("project_editors")
        .update({
          status: accept ? "active" : "rejected",
          editor_id: accept ? notification.metadata.editor_id : null,
        })
        .eq("id", notification.metadata.invitation_id)

      if (editorError) {
        console.error("Error updating invitation:", editorError)
        throw editorError
      }

      // Update notification status
      const { error: notificationError } = await supabase
        .from("notifications")
        .update({
          invitation_status: accept ? "accepted" : "rejected",
          read: true
        })
        .eq("id", notification.id)

      if (notificationError) {
        console.error("Error updating notification:", notificationError)
        throw notificationError
      }

      toast({
        title: "Success",
        description: `You have ${accept ? "accepted" : "rejected"} the invitation.`,
      })

      onActionComplete()
      router.refresh()
    } catch (error: any) {
      console.error("Error in handleEditorInvite:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to process invitation.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
    }
  }

  const getStatusBadge = () => {
    if (notification.invitation_status === "accepted") {
      return <Badge variant="default" className="ml-2">Accepted</Badge>
    }
    if (notification.invitation_status === "rejected") {
      return <Badge variant="destructive" className="ml-2">Rejected</Badge>
    }
    if (!notification.read) {
      return <Badge variant="secondary" className="ml-2">New</Badge>
    }
    return null
  }

  const getActionButtons = () => {
    console.log(notification)
    if (notification.type === "editor_invite" && notification.invitation_status==="pending") {
      return (
        <div className="flex space-x-2 mt-2">
          <Button
            size="sm"
            onClick={() => {
              setAction("accept")
              setShowConfirmDialog(true)
            }}
            className="flex-1"
            disabled={loading}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              setAction("reject")
              setShowConfirmDialog(true)
            }}
            className="flex-1"
            disabled={loading}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </div>
      )
    }
    return null
  }

  return (
    <>
      <div className="flex flex-col items-start p-4">
        <div className="flex items-start justify-between w-full">
          <div className="flex-1">
            <p className="text-sm font-medium">{notification.content}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(notification.created_at).toLocaleString()}
            </p>
          </div>
          {getStatusBadge()}
        </div>
        {getActionButtons()}
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "accept" ? "Accept Invitation" : "Reject Invitation"}
            </DialogTitle>
            <DialogDescription>
              {action === "accept"
                ? "Are you sure you want to accept this editor invitation? You will be able to collaborate on the project."
                : "Are you sure you want to reject this editor invitation? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={action === "accept" ? "default" : "destructive"}
              onClick={() => handleEditorInvite(action === "accept")}
              disabled={loading}
            >
              {loading ? "Processing..." : action === "accept" ? "Accept" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 