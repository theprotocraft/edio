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
} from "lucide-react"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
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
              <Link href="/dashboard/editors">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="mr-2 h-5 w-5" />
                  Editors
                </Button>
              </Link>
              <Link href="/dashboard/youtubers">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="mr-2 h-5 w-5" />
                  YouTubers
                </Button>
              </Link>
              <Link href="/dashboard/messages">
                <Button variant="ghost" className="w-full justify-start">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Messages
                </Button>
              </Link>
              <Link href="/dashboard/notifications">
                <Button variant="ghost" className="w-full justify-start">
                  <Bell className="mr-2 h-5 w-5" />
                  Notifications
                </Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button variant="ghost" className="w-full justify-start">
                  <Settings className="mr-2 h-5 w-5" />
                  Settings
                </Button>
              </Link>
              <Link href="/help">
                <Button variant="ghost" className="w-full justify-start">
                  <HelpCircle className="mr-2 h-5 w-5" />
                  Help & Support
                </Button>
              </Link>
            </nav>
          </div>
        </aside>
        <main className="flex w-full flex-col overflow-hidden py-6 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
