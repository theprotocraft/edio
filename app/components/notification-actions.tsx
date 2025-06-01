"use client"

import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

interface NotificationActionsProps {
  notificationId: string
  inviteId: string
}

export function NotificationActions({ notificationId, inviteId }: NotificationActionsProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleAction = async (accept: boolean) => {
    try {
      // Update project_editors table
      const { error: editorError } = await supabase
        .from("project_editors")
        .update({
          status: accept ? "active" : "rejected",
        })
        .eq("id", inviteId)

      if (editorError) throw editorError

      // Update notification status
      const { error: notificationError } = await supabase
        .from("notifications")
        .update({
          invitation_status: accept ? "accepted" : "rejected",
          read: true
        })
        .eq("id", notificationId)

      if (notificationError) throw notificationError

      router.refresh()
    } catch (error) {
      console.error("Error processing invitation:", error)
    }
  }

  return (
    <div className="flex gap-2 mt-2">
      <Button 
        size="sm"
        onClick={() => handleAction(true)}
      >
        Accept
      </Button>
      <Button 
        size="sm"
        variant="outline"
        onClick={() => handleAction(false)}
      >
        Reject
      </Button>
    </div>
  )
} 