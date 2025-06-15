"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Youtube } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ConnectYouTubeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectYouTubeDialog({ open, onOpenChange }: ConnectYouTubeDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleConnect = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/youtube')
      if (!response.ok) {
        throw new Error('Failed to get YouTube auth URL')
      }
      
      const { authUrl } = await response.json()
      window.location.href = authUrl
    } catch (error) {
      console.error('Error connecting to YouTube:', error)
      toast({
        title: "Error",
        description: "Failed to connect to YouTube",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            Connect YouTube Channel
          </DialogTitle>
          <DialogDescription>
            Connect your YouTube channel to enable video publishing directly from Edio.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            By connecting your YouTube channel, you'll be able to:
          </p>
          <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Publish videos directly to YouTube</li>
            <li>Set video titles, descriptions, and thumbnails</li>
            <li>Manage your video uploads from within Edio</li>
          </ul>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleConnect} 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Connecting..." : "Connect YouTube"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 