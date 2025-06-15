"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Users, Clock, Calendar } from "lucide-react"
import { User } from "@supabase/supabase-js"

interface Youtuber {
  id: string
  name: string
  email: string
  joined?: string
}

interface AffiliatedYoutuber {
  id: string
  relationshipId: string
  youtuber: Youtuber
  status: string
  connectedSince: string
}

interface PendingInvitation {
  id: string
  type: "youtuber_editor" | "editor_invite"
  youtuber: Youtuber
  invitedAt: string
}

interface YoutubersSectionProps {
  user: User
}

export function YoutubersSection({ user }: YoutubersSectionProps) {
  const [affiliatedYoutubers, setAffiliatedYoutubers] = useState<AffiliatedYoutuber[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchYoutubersData()
  }, [user])

  const fetchYoutubersData = async () => {
    try {
      const response = await fetch('/api/editor/youtubers')
      if (!response.ok) {
        throw new Error(`Failed to fetch youtubers data: ${response.status}`)
      }
      const data = await response.json()
      setAffiliatedYoutubers(data.affiliatedYoutubers || [])
      setPendingInvitations(data.pendingInvitations || [])
    } catch (error) {
      console.error("Error fetching youtubers data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch youtubers data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInvitation = async (invitationId: string, action: "accept" | "reject", invitationType: string) => {
    setProcessingInvitation(invitationId)

    try {
      const response = await fetch('/api/editor/youtubers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          action,
          invitationType
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to process invitation')
      }

      toast({
        title: "Success",
        description: `Invitation ${action}ed successfully.`,
      })

      // Refresh the data
      await fetchYoutubersData()
    } catch (error) {
      console.error("Error processing invitation:", error)
      toast({
        title: "Error",
        description: "Failed to process invitation.",
        variant: "destructive",
      })
    } finally {
      setProcessingInvitation(null)
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading youtubers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Youtubers</h2>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {affiliatedYoutubers.length} Affiliated
        </Badge>
      </div>

      <Tabs defaultValue="affiliated" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="affiliated">
            Affiliated Youtubers ({affiliatedYoutubers.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Invitations ({pendingInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="affiliated" className="space-y-4">
          {affiliatedYoutubers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No affiliated youtubers</h3>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  You haven't been accepted by any youtubers yet. Check your pending invitations or wait for youtubers to invite you.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {affiliatedYoutubers.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                    <Avatar className="h-12 w-12 mr-4">
                      <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${item.youtuber.name || item.youtuber.email}`} />
                      <AvatarFallback>
                        {getInitials(item.youtuber.name, item.youtuber.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {item.youtuber.name || item.youtuber.email}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{item.youtuber.email}</span>
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Connected since {formatDate(item.connectedSince)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingInvitations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No pending invitations</h3>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  You don't have any pending invitations from youtubers at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingInvitations.map((invitation) => (
                <Card key={`${invitation.type}-${invitation.id}`} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                    <Avatar className="h-12 w-12 mr-4">
                      <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${invitation.youtuber.name || invitation.youtuber.email}`} />
                      <AvatarFallback>
                        {getInitials(invitation.youtuber.name, invitation.youtuber.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {invitation.youtuber.name || invitation.youtuber.email}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{invitation.youtuber.email}</span>
                        <Badge variant="secondary">
                          Pending
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Invited {formatDate(invitation.invitedAt)}</span>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleInvitation(invitation.id, "accept", invitation.type)}
                        className="flex-1"
                        disabled={processingInvitation === invitation.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleInvitation(invitation.id, "reject", invitation.type)}
                        variant="destructive"
                        className="flex-1"
                        disabled={processingInvitation === invitation.id}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}