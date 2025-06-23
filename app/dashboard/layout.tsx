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
import { redirect } from "next/navigation"
import type { Database } from "@/types/supabase"
import DashboardLogout from "@/components/dashboard-logout"
import { createServerClient } from "@/lib/supabase-server"
import { DashboardNav } from "@/app/components/dashboard-nav"
import { MainNav } from "@/app/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { Notifications } from "@/app/components/notifications"

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // Create Supabase client
  const supabase = await createServerClient()
  
  // Get user and profile data
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }
  
  let userRole: string | null = null

  try {
    // Fetch the user's role from the database
    const { data: userData, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
    
    if (error) {
      console.error("Error fetching user role:", error)
    }
    
    if (userData) {
      userRole = userData.role
    }
  } catch (error) {
    console.error("Failed to fetch user role:", error)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-16 items-center justify-between py-4 px-6">
          <MainNav />
          <div className="flex items-center gap-4">
            <Notifications />
            <UserNav />
          </div>
        </div>
      </header>
      <div className="flex-1 flex">
        <aside className="hidden w-[200px] flex-col md:flex bg-background/50 p-6">
          <DashboardNav userRole={userRole} />
        </aside>
        <main className="flex-1 flex flex-col p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
