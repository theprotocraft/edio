"use client"

import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { useState } from "react"

interface NotificationActionsProps {
  notificationId: string
  inviteId: string
}

export function NotificationActions({ notificationId, inviteId }: NotificationActionsProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)

  const handleAction = async (accept: boolean) => {
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
        .eq("id", inviteId)
        .select("youtuber_id")
        .single()

      if (editorError) {
        console.error("Error updating invitation:", editorError)
        throw editorError
      }

      // Get the original notification to preserve its content
      const { data: originalNotification, error: fetchError } = await supabase
        .from("notifications")
        .select("message")
        .eq("id", notificationId)
        .single()

      if (fetchError) {
        console.error("Error fetching original notification:", fetchError)
        throw fetchError
      }

      // Update notification status while preserving the original message
      const { error: notificationError } = await supabase
        .from("notifications")
        .update({
          read: true,
          message: `${originalNotification.message} (${accept ? "Accepted" : "Rejected"})`,
          metadata: {
            status: accept ? "accepted" : "rejected"
          }
        })
        .eq("id", notificationId)

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
            invitation_id: inviteId
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

      router.refresh()
    } catch (error: any) {
      console.error("Error in handleAction:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to process invitation.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 mt-2">
      <Button 
        size="sm"
        onClick={() => handleAction(true)}
        disabled={loading}
      >
        Accept
      </Button>
      <Button 
        size="sm"
        variant="outline"
        onClick={() => handleAction(false)}
        disabled={loading}
      >
        Reject
      </Button>
    </div>
  )
} 