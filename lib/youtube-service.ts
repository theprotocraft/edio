import { google } from 'googleapis'
import { createServerClient } from '@/lib/supabase-server'
import { generatePresignedViewUrl } from '@/lib/s3-service'
import { Readable } from 'stream'
import { encrypt, decrypt } from '@/lib/encryption'

// Legacy function for channel-based auth
export async function getYouTubeClientByChannel(channelId: string) {
  const supabase = await createServerClient()
  
  console.log('🔍 Looking up YouTube channel with ID:', channelId)
  
  // Get YouTube channel and tokens by database ID (not channel_id)
  const { data: channel, error } = await supabase
    .from('youtube_channels')
    .select('*')
    .eq('id', channelId)
    .single()

  if (error) {
    console.error('❌ Database error fetching channel:', error)
    if (error.code === 'PGRST116') {
      throw new Error('No YouTube channel connected')
    }
    throw new Error('Failed to fetch YouTube channel')
  }

  if (!channel) {
    console.error('❌ No channel found in database')
    throw new Error('No YouTube channel connected')
  }

  console.log('✅ Found channel:', channel.channel_name)
  console.log('🔑 Environment variables check:', {
    hasClientId: !!process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID,
    hasClientSecret: !!process.env.YOUTUBE_CLIENT_SECRET,
    clientIdLength: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID?.length || 0
  })

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  )

  // Check if token is expired or about to expire (within 1 hour)
  const tokenExpiresAt = new Date(channel.token_expires_at)
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
  
  console.log('⏰ Token expiry check:', {
    tokenExpiresAt: tokenExpiresAt.toISOString(),
    oneHourFromNow: oneHourFromNow.toISOString(),
    isExpired: tokenExpiresAt <= oneHourFromNow
  })
  
  if (!channel.access_token || !channel.refresh_token) {
    console.error('❌ Missing tokens in database')
    throw new Error('Invalid YouTube channel tokens')
  }
  
  let accessToken = decrypt(channel.access_token)
  console.log('🔓 Decrypted access token length:', accessToken?.length || 0)
  
  if (tokenExpiresAt <= oneHourFromNow) {
    console.log('🔄 Refreshing expired token...')
    // Refresh the token if it's expired or about to expire
    accessToken = await refreshYouTubeTokenByChannel(channelId)
  }

  // Set credentials on the OAuth2 client
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: decrypt(channel.refresh_token)
  })

  console.log('✅ OAuth2 client configured successfully')

  // Create and return YouTube client with auth
  const youtube = google.youtube('v3')
  youtube.context._options = {
    ...youtube.context._options,
    auth: oauth2Client
  }

  return youtube
}

export async function uploadVideoToYouTubeByChannel({
  youtube,
  videoUrl,
  title,
  description,
  channelId,
  privacyStatus = 'private',
  thumbnailUrl = null,
  tags = []
}: {
  youtube: any
  videoUrl: string
  title: string
  description: string
  channelId: string
  privacyStatus?: 'private' | 'unlisted' | 'public'
  thumbnailUrl?: string | null
  tags?: string[]
}) {
    console.log("thumbnailUrl", thumbnailUrl)
  try {
    if (!videoUrl) {
      throw new Error('Video URL is required')
    }

    // Extract the file path from the full S3 URL
    let filePath: string
    try {
      const url = new URL(videoUrl)
      filePath = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname
    } catch (error) {
      throw new Error('Invalid video URL format')
    }
    
    // Get presigned URL for the video using server-side function
    const { presignedUrl, error } = await generatePresignedViewUrl({ filePath })
    
    if (error || !presignedUrl) {
      throw new Error(error || 'Failed to generate presigned URL')
    }
    
    // Get the video stream directly from S3
    const response = await fetch(presignedUrl, {
      headers: {
        'Accept': 'video/*'
      }
    })
    if (!response.ok) {
      throw new Error('Failed to fetch video from storage')
    }

    // Get the video data as an ArrayBuffer
    const arrayBuffer = await response.arrayBuffer()
    
    // Create a Node.js readable stream from the ArrayBuffer
    const nodeStream = new Readable()
    nodeStream.push(Buffer.from(arrayBuffer))
    nodeStream.push(null)

    // Upload to YouTube using the stream
    let uploadResponse
    try {
      uploadResponse = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
            channelId,
            tags
          },
          status: {
            privacyStatus,
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: nodeStream,
        },
      })
    } catch (uploadError: any) {
      console.error('Initial upload failed:', uploadError)
      
      // Check if it's an authentication error
      if (uploadError.code === 401 || uploadError.message?.includes('authentication') || uploadError.message?.includes('credentials')) {
        console.log('🔄 Authentication error detected, refreshing token and retrying...')
        
        // Refresh the token
        const newAccessToken = await refreshYouTubeTokenByChannel(channelId)
        
        // Get a fresh YouTube client with the new token
        const freshYoutube = await getYouTubeClientByChannel(channelId)
        
        // Recreate the stream from the stored arrayBuffer
        const retryNodeStream = new Readable()
        retryNodeStream.push(Buffer.from(arrayBuffer))
        retryNodeStream.push(null)
        
        // Retry the upload with fresh authentication
        uploadResponse = await freshYoutube.videos.insert({
          part: ['snippet', 'status'],
          requestBody: {
            snippet: {
              title,
              description,
              channelId,
              tags
            },
            status: {
              privacyStatus,
              selfDeclaredMadeForKids: false,
            },
          },
          media: {
            body: retryNodeStream,
          },
        })
        
        console.log('✅ Upload succeeded after token refresh')
      } else {
        throw uploadError
      }
    }

    // If we have a thumbnail, upload it
    if (thumbnailUrl) {
      try {
        // Get the thumbnail image
        const thumbnailResponse = await fetch(thumbnailUrl)
        if (!thumbnailResponse.ok) {
          throw new Error('Failed to fetch thumbnail')
        }

        const thumbnailBuffer = await thumbnailResponse.arrayBuffer()
        const thumbnailStream = new Readable()
        thumbnailStream.push(Buffer.from(thumbnailBuffer))
        thumbnailStream.push(null)

        // Upload thumbnail
        try {
          await youtube.thumbnails.set({
            videoId: uploadResponse.data.id,
            media: {
              body: thumbnailStream,
            },
          })
          console.log('Thumbnail uploaded successfully')
        } catch (thumbnailError: any) {
          console.error('Error uploading thumbnail:', thumbnailError.message)
          // Don't throw - thumbnail upload failure shouldn't fail the whole process
          if (thumbnailError.code === 403) {
            console.log('Thumbnail upload requires additional permissions. Video uploaded without custom thumbnail.')
          }
        }
      } catch (error) {
        console.error('Error processing thumbnail:', error)
        // Don't throw error here, as the video was uploaded successfully
      }
    }

    return uploadResponse.data
  } catch (error: any) {
    console.error('Error uploading to YouTube:', error)
    throw new Error(error.message || 'Failed to upload video to YouTube')
  }
}

export async function refreshYouTubeTokenByChannel(channelId: string) {
  const supabase = await createServerClient()
  
  // Get channel data by database ID (not channel_id field)
  const { data: channel, error } = await supabase
    .from('youtube_channels')
    .select('*')
    .eq('id', channelId)
    .single()

  if (error || !channel) {
    throw new Error('YouTube channel not found')
  }

  if (!channel.refresh_token) {
    throw new Error('Invalid refresh token')
  }

  try {
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET
    )

    oauth2Client.setCredentials({
      refresh_token: decrypt(channel.refresh_token)
    })

    // Get new access token with longer expiration (7 days)
    const { credentials } = await oauth2Client.refreshAccessToken()
    
    if (!credentials.access_token) {
      throw new Error('Failed to get new access token')
    }
    
    // Calculate expiration time (7 days from now)
    const expiresIn = 7 * 24 * 60 * 60 // 7 days in seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // Update tokens in database (encrypted)
    await supabase
      .from('youtube_channels')
      .update({
        access_token: encrypt(credentials.access_token),
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', channelId)

    // Return the decrypted access token for immediate use
    return credentials.access_token
  } catch (error: any) {
    console.error('Error refreshing YouTube token:', error)
    throw new Error('Failed to refresh YouTube token')
  }
} 