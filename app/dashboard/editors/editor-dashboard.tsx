"use client"

import { User } from "@supabase/supabase-js"
import { YoutubersSection } from "./youtubers-section"
import { PendingInvitations } from "./pending-invitations"

interface EditorDashboardProps {
  user: User
}

export function EditorDashboard({ user }: EditorDashboardProps) {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <YoutubersSection user={user} />
      <PendingInvitations user={user} />
    </div>
  )
}