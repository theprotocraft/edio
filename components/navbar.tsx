"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { UserNav } from "@/components/custom/user-nav"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const pathname = usePathname()
  const { supabase } = useSupabase()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("Error getting user:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [supabase])

  // Don't show navbar on auth pages
  if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Edio</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {user && (
              <>
                <Link
                  href="/dashboard"
                  className={`transition-colors hover:text-foreground/80 ${
                    pathname?.startsWith("/dashboard") ? "text-foreground" : "text-foreground/60"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/projects"
                  className={`transition-colors hover:text-foreground/80 ${
                    pathname?.startsWith("/dashboard/projects") ? "text-foreground" : "text-foreground/60"
                  }`}
                >
                  Projects
                </Link>
              </>
            )}
            <Link
              href="/about"
              className={`transition-colors hover:text-foreground/80 ${
                pathname?.startsWith("/about") ? "text-foreground" : "text-foreground/60"
              }`}
            >
              About
            </Link>
          </nav>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          {!loading && (
            <>
              {user ? (
                <UserNav user={user} />
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Sign up</Button>
                  </Link>
                </>
              )}
            </>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
