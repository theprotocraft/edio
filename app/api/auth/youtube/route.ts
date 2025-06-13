import { NextResponse } from "next/server"
import { google } from 'googleapis'
import { createServerClient } from "@/app/lib/supabase-server"

const oauth2Client = new google.auth.OAuth2(
  process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Generate OAuth2 URL with offline access and longer token duration
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.upload'
      ],
      prompt: 'consent',
      state: userId, // Pass userId in state for verification
    })

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error("Error generating auth URL:", error)
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    )
  }
} 