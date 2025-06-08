"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EditProfileDialog } from "@/app/components/edit-profile-dialog"
import { ConnectYouTubeDialog } from "@/app/components/connect-youtube-dialog"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

interface SettingsClientProps {
  userData: {
    name: string | null
    email: string
    role: string | null
    avatar_url: string | null
  }
  youtubeChannels: {
    id: string
    channel_id: string
    channel_name: string
    channel_thumbnail: string
    created_at: string
  }[]
}

export function SettingsClient({ userData, youtubeChannels }: SettingsClientProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false)
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const error = searchParams.get("error")
    const success = searchParams.get("success")

    if (error) {
      toast({
        title: "Error",
        description: error === "missing_params" 
          ? "Missing required parameters" 
          : decodeURIComponent(error),
        variant: "destructive",
      })
    }

    if (success === "channel_connected") {
      toast({
        title: "Success",
        description: "YouTube channel connected successfully!",
      })
    }
  }, [searchParams, toast])

  // Function to get initials from name
  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U"
  }

  const handleDisconnectChannel = async (channelId: string) => {
    try {
      const { error } = await supabase
        .from("youtube_channels")
        .delete()
        .eq("id", channelId)

      if (error) throw error

      toast({
        title: "Success",
        description: "YouTube channel disconnected successfully.",
      })
      router.refresh()
    } catch (error: any) {
      console.error("Error disconnecting channel:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect YouTube channel.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and YouTube channels.</p>
      </div>

      <div className="grid gap-6">
        {/* Account Details Section */}
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Your personal account information</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={userData?.avatar_url || ""} alt={userData?.name || "User"} />
                <AvatarFallback className="text-lg">
                  {getInitials(userData?.name || "User")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{userData?.name || "Not set"}</h3>
                <p className="text-sm text-muted-foreground">{userData.email}</p>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <div className="font-medium">Name</div>
                <div className="text-muted-foreground">{userData?.name || "Not set"}</div>
              </div>
              <div className="grid gap-2">
                <div className="font-medium">Email</div>
                <div className="text-muted-foreground">{userData.email}</div>
              </div>
              <div className="grid gap-2">
                <div className="font-medium">Role</div>
                <div className="text-muted-foreground capitalize">{userData?.role || "Not set"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* YouTube Channels Section */}
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
                        <AvatarImage src={channel.channel_thumbnail} alt={channel.channel_name} />
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