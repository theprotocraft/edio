"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { ConnectYouTubeDialog } from "@/components/connect-youtube-dialog"

interface SettingsClientProps {
  userData: {
    name: string | null
    email: string | null
    role: "youtuber" | "editor"
    avatar_url: string | null
  } | null
  youtubeChannels: Array<{
    id: string
    channel_name: string
    channel_thumbnail: string | null
    created_at: string
  }>
}

export function SettingsClient({ userData, youtubeChannels }: SettingsClientProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false)
  const { toast } = useToast()

  const handleDisconnectChannel = async (channelId: string) => {
    try {
      const response = await fetch(`/api/youtube/channels/${channelId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect channel')
      }

      toast({
        title: "Channel disconnected",
        description: "YouTube channel has been disconnected successfully.",
      })

      // Refresh the page to update the list
      window.location.reload()
    } catch (error) {
      console.error('Error disconnecting channel:', error)
      toast({
        title: "Error",
        description: "Failed to disconnect YouTube channel",
        variant: "destructive",
      })
    }
  }

  if (!userData) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your profile information</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={userData.avatar_url || ""} alt={userData.name || "User"} />
                <AvatarFallback>
                  {userData.name?.charAt(0).toUpperCase() || userData.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{userData.name || "No name set"}</h3>
                <p className="text-sm text-muted-foreground">{userData.email}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  Role: {userData.role === "youtuber" ? "Content Creator" : "Video Editor"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* YouTube Channels - Only show for YouTubers */}
        {userData.role === "youtuber" && (
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>YouTube Channels</CardTitle>
                <CardDescription>Manage your connected YouTube channels</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsConnectDialogOpen(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Add Channel
              </Button>
            </CardHeader>
            <CardContent>
              {youtubeChannels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No YouTube channels connected yet. Click "Add Channel" to connect your first channel.
                </div>
              ) : (
                <div className="space-y-4">
                  {youtubeChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={channel.channel_thumbnail || ""} alt={channel.channel_name} />
                          <AvatarFallback>
                            {channel.channel_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{channel.channel_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Connected on {new Date(channel.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnectChannel(channel.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <EditProfileDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        currentName={userData?.name || ""}
      />

      <ConnectYouTubeDialog
        open={isConnectDialogOpen}
        onOpenChange={setIsConnectDialogOpen}
      />
    </div>
  )
} 