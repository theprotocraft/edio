"use client"

import { useState, useEffect, useRef } from "react"
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
import Script from "next/script"

interface ConnectYouTubeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectYouTubeDialog({ open, onOpenChange }: ConnectYouTubeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [gisLoaded, setGisLoaded] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const tokenClientRef = useRef<any>(null)
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

  useEffect(() => {
    if (gisLoaded && open && !tokenClientRef.current) {
      initializeGoogleAuth()
    }
  }, [gisLoaded, open])

  const handleOpenChange = (newOpen: boolean) => {
    if (isConnecting) {
      return
    }
    onOpenChange(newOpen)
  }

  const initializeGoogleAuth = async () => {
    try {
      console.log('Initializing Google Auth...')
      const clientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID
      if (!clientId) {
        throw new Error('Missing YouTube API credentials')
      }

      console.log('Client ID:', clientId)
      console.log('Current origin:', window.location.origin)

      // Initialize the Google Identity Services
      tokenClientRef.current = await window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
        callback: async (response) => {
          console.log('OAuth callback received:', {
            hasAccessToken: !!response.access_token,
            expiresIn: response.expires_in,
            error: response.error
          })

          if (response.error) {
            console.error('Auth error:', response.error)
            toast({
              title: "Error",
              description: "Failed to authenticate with YouTube.",
              variant: "destructive",
            })
            setIsConnecting(false)
            onOpenChange(false)
            return
          }

          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")
            console.log('User authenticated:', user.id)

            // Get the current user's YouTube channel info
            console.log('Fetching channel info...')
            const channelResponse = await fetch(
              'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
              {
                headers: {
                  Authorization: `Bearer ${response.access_token}`,
                },
              }
            )

            if (!channelResponse.ok) {
              const errorText = await channelResponse.text()
              console.error('Channel API error:', {
                status: channelResponse.status,
                statusText: channelResponse.statusText,
                body: errorText
              })
              throw new Error('Failed to fetch channel information')
            }

            const channelData = await channelResponse.json()
            console.log('Channel API response:', JSON.stringify(channelData, null, 2))

            if (!channelData.items || channelData.items.length === 0) {
              throw new Error('No YouTube channel found. Please make sure you have a YouTube channel and try again.')
            }

            const channel = channelData.items[0]
            console.log('Channel info:', {
              id: channel.id,
              name: channel.snippet.title,
              thumbnail: channel.snippet.thumbnails.default.url
            })

            // Prepare the data to be stored
            const channelDataToStore = {
              user_id: user.id,
              channel_id: channel.id,
              channel_name: channel.snippet.title,
              channel_thumbnail: channel.snippet.thumbnails.default.url,
              access_token: response.access_token,
              token_expires_at: new Date(Date.now() + (response.expires_in || 3600) * 1000).toISOString(),
            }
            console.log('Storing channel data:', JSON.stringify(channelDataToStore, null, 2))

            // Store the channel information and tokens
            console.log('Storing channel info...')
            const { error: channelError } = await supabase.from("youtube_channels").insert(channelDataToStore)

            if (channelError) {
              console.error('Error storing channel:', channelError)
              throw channelError
            }

            console.log('Channel stored successfully')
            toast({
              title: "Success",
              description: "YouTube channel connected successfully!",
            })

            setIsConnecting(false)
            onOpenChange(false)
            router.refresh()
          } catch (error: any) {
            console.error('Error in auth callback:', error)
            toast({
              title: "Error",
              description: error.message || "Failed to save channel information.",
              variant: "destructive",
            })
            setIsConnecting(false)
            onOpenChange(false)
          }
        },
      })
      console.log('Google Auth initialized successfully')
    } catch (error: any) {
      console.error('Error initializing Google Auth:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to initialize YouTube connection.",
        variant: "destructive",
      })
      setIsConnecting(false)
      onOpenChange(false)
    }
  }

  const handleConnect = async () => {
    console.log('Starting connection process...')
    setLoading(true)
    setIsConnecting(true)
    try {
      if (!tokenClientRef.current) {
        throw new Error('Token client not initialized')
      }
      console.log('Requesting access token...')
      console.log('Current window location:', window.location.href)
      tokenClientRef.current.requestAccessToken()
    } catch (error: any) {
      console.error('Error signing in:', error)
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
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={() => {
          console.log('Google Identity Services script loaded')
          setGisLoaded(true)
        }}
      />
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
              disabled={loading || !gisLoaded || isConnecting}
            >
              {loading ? "Connecting..." : "Connect YouTube Channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 