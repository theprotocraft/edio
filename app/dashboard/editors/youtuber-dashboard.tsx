"use client"

import { User } from "@supabase/supabase-js"
import { useRef } from "react"
import { EditorsClient } from "./editors-client"
import { PendingInvitations } from "./pending-invitations"

interface YoutuberDashboardProps {
  user: User
}

export function YoutuberDashboard({ user }: YoutuberDashboardProps) {
  const pendingInvitationsRef = useRef<{ refreshInvitations: () => void }>(null)

  const handleInvitationSent = () => {
    pendingInvitationsRef.current?.refreshInvitations()
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <EditorsClient user={user} onInvitationSent={handleInvitationSent} />
      <PendingInvitations user={user} ref={pendingInvitationsRef} />
    </div>
  )
}