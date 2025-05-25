import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import DashboardNavbar from "@/components/dashboard-navbar"
import {
  LayoutDashboard,
  FolderIcon as FolderVideo,
  MessageSquare,
  Bell,
  Settings,
  HelpCircle,
  Users,
  LogOut,
} from "lucide-react"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"
import DashboardLogout from "@/components/dashboard-logout"

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // Create Supabase client
  const supabase = createServerComponentClient<Database>({ cookies })
  
  // Get user session and profile data
  const { data: { session } } = await supabase.auth.getSession()
  let userRole = "editor" // Default role

  if (session?.user) {
    // Fetch the user's role from the database
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single()
    
    if (userData) {
      userRole = userData.role
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNavbar />
      <div className="container mx-auto flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="fixed top-16 z-30 -ml-2 hidden h-[calc(100vh-4rem)] w-full shrink-0 md:sticky md:block">
          <div className="h-full py-6 pr-6 lg:py-8">
            <nav className="flex flex-col space-y-2">
              <Link href="/dashboard/overview">
                <Button variant="ghost" className="w-full justify-start">
                  <LayoutDashboard className="mr-2 h-5 w-5" />
                  Overview
                </Button>
              </Link>
              <Link href="/dashboard/projects">
                <Button variant="ghost" className="w-full justify-start">
                  <FolderVideo className="mr-2 h-5 w-5" />
                  Projects
                </Button>
              </Link>
              {userRole === "editor" && (
                <Link href="/dashboard/youtubers">
                  <Button variant="ghost" className="w-full justify-start">
                    <Users className="mr-2 h-5 w-5" />
                    Youtubers
                  </Button>
                </Link>
              )}
              {userRole === "youtuber" && (
                <Link href="/dashboard/editors">
                  <Button variant="ghost" className="w-full justify-start">
                    <Users className="mr-2 h-5 w-5" />
                    Editors
                  </Button>
                </Link>
              )}
              <DashboardLogout />
            </nav>
          </div>
        </aside>
        <main className="flex w-full flex-col overflow-hidden py-6 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
