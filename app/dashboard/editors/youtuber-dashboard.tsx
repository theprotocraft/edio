"use client"

import { User } from "@supabase/supabase-js"
import { EditorsClient } from "./editors-client"
import { PendingInvitations } from "./pending-invitations"

interface YoutuberDashboardProps {
  user: User
}

export function YoutuberDashboard({ user }: YoutuberDashboardProps) {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <EditorsClient user={user} />
      <PendingInvitations user={user} />
    </div>
  )
}