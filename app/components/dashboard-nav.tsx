"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, FileVideo, Users } from "lucide-react"
import DashboardLogout from "@/components/dashboard-logout"

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col space-y-2">
      <Link href="/dashboard/overview">
        <Button
          variant={pathname === "/dashboard/overview" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <LayoutDashboard className="mr-2 h-5 w-5" />
          Overview
        </Button>
      </Link>
      <Link href="/dashboard/projects">
        <Button
          variant={pathname === "/dashboard/projects" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <FileVideo className="mr-2 h-5 w-5" />
          Projects
        </Button>
      </Link>
      <Link href="/dashboard/editors">
        <Button
          variant={pathname === "/dashboard/editors" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <Users className="mr-2 h-5 w-5" />
          Editors
        </Button>
      </Link>
      <DashboardLogout />
    </nav>
  )
} 