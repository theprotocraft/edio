"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="mr-4 hidden md:flex">
      <Link href="/" className="mr-6 flex items-center space-x-2">
        <span className="hidden font-bold sm:inline-block">
          Edio
        </span>
      </Link>
      <nav className="flex items-center space-x-6 text-sm font-medium">
        <Link
          href="/dashboard/overview"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/dashboard/overview"
              ? "text-foreground"
              : "text-foreground/60"
          )}
        >
          Overview
        </Link>
        <Link
          href="/dashboard/projects"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/dashboard/projects"
              ? "text-foreground"
              : "text-foreground/60"
          )}
        >
          Projects
        </Link>
        <Link
          href="/dashboard/editors"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/dashboard/editors"
              ? "text-foreground"
              : "text-foreground/60"
          )}
        >
          Editors
        </Link>
      </nav>
    </div>
  )
} 