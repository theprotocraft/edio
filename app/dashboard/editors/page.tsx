import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { EditorsClient } from "./editors-client"
import { PendingInvitations } from "./pending-invitations"

export default async function EditorsPage() {
  const supabase = createServerComponentClient({ cookies })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* todo: add pending invitations for editors only (if needed that too)*/}
      <PendingInvitations user={session.user} />
      <EditorsClient user={session.user} />
    </div>
  )
} 