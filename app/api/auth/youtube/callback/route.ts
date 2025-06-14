import { NextResponse } from "next/server"
import { google } from 'googleapis'
import { createServerClient } from "@/app/lib/supabase-server"
import { encrypt } from "@/lib/encryption"

const oauth2Client = new google.auth.OAuth2(
  process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is our userId

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=missing_params', request.url))
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=token_error', request.url))
    }

    // Get channel info using the access token
    const youtube = google.youtube('v3')
    const channelResponse = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
      access_token: tokens.access_token
    })

    if (!channelResponse.data.items?.[0]) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=no_channel', request.url))
    }

    const channel = channelResponse.data.items[0]
    const supabase = await createServerClient()

    // Store channel info and tokens (encrypted)
    const { error: channelError } = await supabase
      .from('youtube_channels')
      .upsert({
        user_id: state,
        channel_id: channel.id,
        channel_name: channel.snippet?.title,
        channel_thumbnail: channel.snippet?.thumbnails?.default?.url,
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token),
        token_expires_at: new Date(Date.now() + (tokens.expiry_date || 7 * 24 * 60 * 60 * 1000)).toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,channel_id'
      })

    if (channelError) {
      console.error('Error storing channel:', channelError)
      return NextResponse.redirect(new URL('/dashboard/settings?error=storage_error', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard/settings?success=channel_connected', request.url))
  } catch (error: any) {
    console.error("Error in YouTube callback:", error)
    return NextResponse.redirect(new URL('/dashboard/settings?error=callback_error', request.url))
  }
} 