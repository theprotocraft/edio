import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { EditorDashboard } from "./editor-dashboard"
import { YoutuberDashboard } from "./youtuber-dashboard"

export default async function EditorsPage() {
  const supabase = createServerComponentClient({ cookies })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Get user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single()

  const userRole = userData?.role

  if (userRole === "editor") {
    return <EditorDashboard user={session.user} />
  } else if (userRole === "youtuber") {
    return <YoutuberDashboard user={session.user} />
  } else {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Access denied. Please check your user role.</p>
        </div>
      </div>
    )
  }
} 