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
  project_owner_id: string
  editor_email: string
  status: "pending" | "active" | "rejected"
  created_at: string
  project_owner: {
    email: string
    full_name: string | null
  }
}

interface PendingInvitationsProps {
  user: User
}

export function PendingInvitations({ user }: PendingInvitationsProps) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchInvitations()
  }, [user])

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("project_editors")
        .select(`
          *,
          project:project_id (
            project_title,
            owner:owner_id (
              email,
              name
            )
          ),
          editor:editor_id (
            email,
            name
          )
        `)
        .eq("project.owner.email", user.email)
        .eq("status", "pending")

      if (error) {
        console.error("Error fetching invitations:", error)
        throw error
      }

      // Transform the data to include full_name
      const transformedData = data?.map(invitation => ({
        ...invitation,
        project_owner: {
          ...invitation.owner
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
      // Update project_editors table
      const { error: editorError } = await supabase
        .from("project_editors")
        .update({
          status: accept ? "active" : "rejected",
          editor_id: accept ? user.id : null,
        })
        .eq("id", invitationId)

      if (editorError) {
        console.error("Error updating invitation:", editorError)
        throw editorError
      }

      // Create notification for project owner
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: invitations.find(inv => inv.id === invitationId)?.project_owner_id,
        type: "editor_response",
        content: `${user.email} has ${accept ? "accepted" : "rejected"} your editor invitation`,
        metadata: { editor_id: user.id },
        invitation_status: accept ? "accepted" : "rejected",
      })

      if (notificationError) {
        console.error("Error creating notification:", notificationError)
        throw notificationError
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
          console.log(invitation),
          <Card key={invitation.id} className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Editor Invitation</span>
                <Badge variant="secondary">Pending</Badge>
              </CardTitle>
              <CardDescription>
                To: {invitation.editor.name || invitation.editor.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <p className="text-sm text-muted-foreground">
                  You have been invited to collaborate as an editor on {invitation.project_owner.full_name || invitation.project_owner.email}'s project.
                </p>
                {/* <div className="flex space-x-4">
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
                </div> */}
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