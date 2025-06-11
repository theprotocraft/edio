"use client"

import { useState, useEffect } from "react"
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
          editor_id: accept ? notification.metadata.editor_id : null,
        })
        .eq("id", notification.metadata.invitation_id)
        .select("youtuber_id")
        .single()

      if (editorError) {
        console.error("Error updating invitation:", editorError)
        throw editorError
      }

      // Update notification status
      const { error: notificationError } = await supabase
        .from("notifications")
        .update({
          metadata: {
            ...notification.metadata,
            status: accept ? "accepted" : "rejected"
          },
          message: `You have ${accept ? "accepted" : "rejected"} the editor invitation`,
          read: true
        })
        .eq("id", notification.id)

      if (notificationError) {
        console.error("Error updating notification:", notificationError)
        throw notificationError
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
      <div className="flex flex-col items-start p-4">
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