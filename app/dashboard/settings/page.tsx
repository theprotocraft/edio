import { createServerClient } from "@/lib/supabase-server"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from("users")
    .select("name, email, role, avatar_url")
    .eq("id", user?.id)
    .single()

  const { data: youtubeChannels } = await supabase
    .from("youtube_channels")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })

  return <SettingsClient userData={userData} youtubeChannels={youtubeChannels || []} />
} 