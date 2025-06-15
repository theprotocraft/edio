import { redirect } from "next/navigation"
import { createServerClient } from "@/app/lib/supabase-server"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const supabase = createServerClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Fetch user profile
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("name, email, role, avatar_url")
    .eq("id", user.id)
    .single()

  if (userError) {
    console.error("Error fetching user profile:", userError)
    redirect("/login")
  }

  // Fetch YouTube channels only if user is a YouTuber
  let youtubeChannels: any[] = []
  if (userData?.role === "youtuber") {
    const { data: channels, error: channelsError } = await supabase
      .from("youtube_channels")
      .select("id, channel_name, channel_thumbnail, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (channelsError) {
      console.error("Error fetching YouTube channels:", channelsError)
    } else {
      youtubeChannels = channels || []
    }
  }

  return (
    <SettingsClient 
      userData={userData}
      youtubeChannels={youtubeChannels}
    />
  )
} 