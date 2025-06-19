"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, X } from "lucide-react"
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
    message: string
    metadata: any
    read: boolean
    created_at: string
  }
  onActionComplete: () => void
}

export function NotificationItem({ notification, onActionComplete }: NotificationItemProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [action, setAction] = useState<"accept" | "reject" | null>(null)
  const [mounted, setMounted] = useState(false)
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDismissNotification = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notification.id)

      if (error) {
        console.error("Error dismissing notification:", error)
        throw error
      }

      toast({
        title: "Notification dismissed",
        description: "The notification has been removed.",
      })

      onActionComplete()
    } catch (error: any) {
      console.error("Error in handleDismissNotification:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to dismiss notification.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditorInvite = async (accept: boolean) => {
    setLoading(true)
    try {
      // Get the current user's email for the notification
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error("Not authenticated")

      // Update youtuber_editors table
      const { data: editorData, error: editorError } = await supabase
        .from("youtuber_editors")
        .update({
          status: accept ? "active" : "rejected",
        })
        .eq("id", notification.metadata.invitation_id)
        .select("youtuber_id")
        .maybeSingle()

      if (editorError) {
        console.error("Error updating invitation:", editorError)
        throw editorError
      }

      if (!editorData) {
        throw new Error("Invitation not found or already processed")
      }

      // Update the original invitation notification for the editor
      const { error: updateNotificationError } = await supabase
        .from("notifications")
        .update({
          read: true,
          message: `You have ${accept ? "accepted" : "rejected"} the editor invitation`,
          metadata: {
            status: accept ? "accepted" : "rejected",
            invitation_id: notification.metadata.invitation_id
          }
        })
        .eq("user_id", user.id)  // Editor's notification
        .eq("type", "editor_invite")
        .eq("metadata->>invitation_id", notification.metadata.invitation_id)

      if (updateNotificationError) {
        console.error("Error updating notification:", updateNotificationError)
        throw updateNotificationError
      }

      // Create notification for the YouTuber
      const { error: youtuberNotificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: editorData.youtuber_id,
          type: "editor_response",
          message: `${user.email} has ${accept ? "accepted" : "rejected"} your editor invitation`,
          metadata: {
            editor_id: user.id,
            status: accept ? "accepted" : "rejected",
            invitation_id: notification.metadata.invitation_id
          },
          read: false
        })

      if (youtuberNotificationError) {
        console.error("Error creating YouTuber notification:", youtuberNotificationError)
        throw youtuberNotificationError
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
    if (notification.type === "editor_invite") {
      switch (notification.metadata?.status) {
        case "accepted":
          return <Badge variant="default" className="ml-2">Accepted</Badge>
        case "rejected":
          return <Badge variant="destructive" className="ml-2">Rejected</Badge>
        case "pending":
          return <Badge variant="secondary" className="ml-2">Pending</Badge>
        default:
          return <Badge variant="secondary" className="ml-2">New</Badge>
      }
    }
    if (!notification.read) {
      return <Badge variant="secondary" className="ml-2">New</Badge>
    }
    return null
  }

  const getActionButtons = () => {
    // Only show accept/reject buttons for pending editor invites
    if (notification.type === "editor_invite" && 
        (!notification.metadata?.status || notification.metadata?.status === "pending")) {
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
      <div className="flex flex-col items-start p-4 border-b last:border-b-0">
        <div className="flex items-start justify-between w-full">
          <div className="flex-1">
            <p className="text-sm font-medium">{notification.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {mounted ? new Date(notification.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissNotification}
              disabled={loading}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
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