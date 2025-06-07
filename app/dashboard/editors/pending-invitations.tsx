"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { User } from "@supabase/supabase-js"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle } from "lucide-react"

interface PendingInvitation {
  id: string
  youtuber_id: string
  editor_id: string
  status: "pending" | "active" | "rejected"
  created_at: string
  project_owner: {
    email: string
    name: string | null
  }
  youtuber: {
    email: string
    name: string | null
  }
}

interface PendingInvitationsProps {
  user: User
}

export function PendingInvitations({ user }: PendingInvitationsProps) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<"editor" | "youtuber" | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchInvitations()
  }, [user])

  const fetchInvitations = async () => {
    try {
      // First check if the user is an editor or youtuber
      const { data: roleData, error: roleError } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle()

      if (roleError) {
        console.error("Error checking user role:", roleError)
        throw roleError
      }

      setUserRole(roleData?.role as "editor" | "youtuber" | null)

      let query = supabase
        .from("youtuber_editors")
        .select(`
          *,
          youtuber:youtuber_id (
            email,
            name
          ),
          editor:editor_id (
            email,
            name
          )
        `)
        .eq("status", "pending")

      // If user is an editor, get invitations sent to them
      if (roleData?.role === "editor") {
        query = query.eq("editor_id", user.id)
      }
      // If user is a youtuber, get invitations they sent
      else if (roleData?.role === "youtuber") {
        query = query.eq("youtuber_id", user.id)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching invitations:", error)
        throw error
      }

      // Transform the data
      const transformedData = data?.map(invitation => ({
        ...invitation,
        project_owner: {
          email: invitation.youtuber.email,
          name: invitation.youtuber.name
        },
        youtuber: {
          email: invitation.youtuber.email,
          name: invitation.youtuber.name
        }
      })) || []

      setInvitations(transformedData)
    } catch (error: any) {
      console.error("Error in fetchInvitations:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch invitations.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInvitation = async (invitationId: string, accept: boolean) => {
    setLoading(true)

    try {
      // Update youtuber_editors table
      const { error: editorError } = await supabase
        .from("youtuber_editors")
        .update({
          status: accept ? "active" : "rejected",
        })
        .eq("id", invitationId)
        .eq("editor_id", user.id)

      if (editorError) {
        console.error("Error updating invitation:", editorError)
        throw editorError
      }

      // Get the invitation details for notification
      const { data: invitation, error: fetchError } = await supabase
        .from("youtuber_editors")
        .select("youtuber_id, editor:editor_id(email)")
        .eq("id", invitationId)
        .single()

      if (fetchError) {
        console.error("Error fetching invitation details:", fetchError)
        throw fetchError
      }

      // Update the original invitation notification for the editor
      const { error: updateNotificationError } = await supabase
        .from("notifications")
        .update({
          read: true,
          content: `You have ${accept ? "accepted" : "rejected"} the editor invitation`,
          metadata: {
            status: accept ? "accepted" : "rejected",
            invitation_id: invitationId
          }
        })
        .eq("user_id", user.id)  // Editor's notification
        .eq("type", "editor_invite")
        .eq("metadata->invitation_id", invitationId)

      if (updateNotificationError) {
        console.error("Error updating invitation notification:", updateNotificationError)
        throw updateNotificationError
      }

      // Create new notification for YouTuber about the response
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: invitation.youtuber_id,
          type: "editor_response",
          content: `${user.email} has ${accept ? "accepted" : "rejected"} your editor invitation`,
          metadata: { 
            editor_id: user.id,
            status: accept ? "accepted" : "rejected",
            invitation_id: invitationId
          },
          read: false
        })

      if (notificationError) {
        console.error("Error creating notification:", notificationError)
        throw notificationError
      }

      // Also update any existing response notifications for this invitation
      const { error: updateResponseError } = await supabase
        .from("notifications")
        .update({
          read: true,
          content: `${user.email} has ${accept ? "accepted" : "rejected"} your editor invitation`,
          metadata: {
            editor_id: user.id,
            status: accept ? "accepted" : "rejected",
            invitation_id: invitationId
          }
        })
        .eq("user_id", invitation.youtuber_id)
        .eq("type", "editor_response")
        .eq("metadata->invitation_id", invitationId)

      if (updateResponseError) {
        console.error("Error updating response notification:", updateResponseError)
        throw updateResponseError
      }

      toast({
        title: "Success",
        description: `You have ${accept ? "accepted" : "rejected"} the invitation.`,
      })

      fetchInvitations()
    } catch (error: any) {
      console.error("Error in handleInvitation:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to process invitation.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "active":
        return <Badge variant="default">Active</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return null
    }
  }

  const getStatusMessage = (status: string) => {
    if (userRole === "editor") {
      switch (status) {
        case "pending":
          return "Waiting for your response"
        case "active":
          return "You are actively collaborating"
        case "rejected":
          return "You have rejected this invitation"
        default:
          return ""
      }
    } else if (userRole === "youtuber") {
      switch (status) {
        case "pending":
          return "Waiting for editor to respond"
        case "active":
          return "Editor has accepted your invitation"
        case "rejected":
          return "Editor has rejected your invitation"
        default:
          return ""
      }
    }
    return ""
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading invitations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Pending Invitations</h1>

      <div className="grid gap-4">
        {invitations.map((invitation) => (
          <Card key={invitation.id} className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Editor Invitation</span>
                {getStatusBadge(invitation.status)}
              </CardTitle>
              <CardDescription>
                {userRole === "editor" ? "From: " : "To: "} {userRole === "editor" ? invitation.project_owner.name || invitation.project_owner.email : invitation.youtuber.name || invitation.youtuber.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <p className="text-sm text-muted-foreground">
                  {getStatusMessage(invitation.status)}
                </p>
                {invitation.status === "pending" && userRole === "editor" && (
                  <div className="flex space-x-4">
                    <Button
                      onClick={() => handleInvitation(invitation.id, true)}
                      className="flex-1"
                      disabled={loading}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleInvitation(invitation.id, false)}
                      variant="destructive"
                      className="flex-1"
                      disabled={loading}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {invitations.length === 0 && (
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-lg font-medium">No pending invitations</p>
              <p className="text-sm text-muted-foreground text-center mt-2">
                You don't have any pending editor invitations at the moment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 