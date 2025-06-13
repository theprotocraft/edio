"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface ConnectYouTubeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectYouTubeDialog({ open, onOpenChange }: ConnectYouTubeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { toast } = useToast()

  // Reset states when dialog opens
  useEffect(() => {
    if (open) {
      setIsConnecting(false)
      setLoading(false)
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    if (isConnecting) {
      return
    }
    onOpenChange(newOpen)
  }

  const handleConnect = async () => {
    console.log('Starting connection process...')
    setLoading(true)
    setIsConnecting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Get the auth URL from our server
      const response = await fetch(`/api/auth/youtube?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('Failed to get auth URL')
      }

      const { authUrl } = await response.json()
      
      // Redirect to Google's OAuth page
      window.location.href = authUrl
    } catch (error: any) {
      console.error('Error starting auth flow:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to connect to YouTube.",
        variant: "destructive",
      })
      setIsConnecting(false)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect YouTube Channel</DialogTitle>
          <DialogDescription>
            Connect your YouTube channel to manage your content. You'll be redirected to YouTube to authorize access.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This will allow us to:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>View your channel information</li>
            <li>Access your video content</li>
            <li>Manage your channel settings</li>
          </ul>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading || isConnecting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleConnect}
            disabled={loading || isConnecting}
          >
            {loading ? "Connecting..." : "Connect YouTube Channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 