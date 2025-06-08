"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EditProfileDialog } from "@/app/components/edit-profile-dialog"

interface SettingsClientProps {
  userData: {
    name: string | null
    email: string
    role: string | null
    avatar_url: string | null
  }
}

export function SettingsClient({ userData }: SettingsClientProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Function to get initials from name
  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U"
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
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Add Channel
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No YouTube channels connected yet. Click "Add Channel" to connect your first channel.
            </div>
          </CardContent>
        </Card>
      </div>

      <EditProfileDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        currentName={userData?.name || ""}
      />
    </div>
  )
} 