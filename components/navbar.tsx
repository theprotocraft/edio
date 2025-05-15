"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { useSupabase } from "@/lib/supabase-provider"
import { useState, useEffect } from "react"

export default function Navbar() {
  const pathname = usePathname()
  const { supabase, user } = useSupabase()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      try {
        setIsLoading(true)
        if (user) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [user])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setIsAuthenticated(false)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Don't show navbar on auth pages
  if (pathname === "/login" || pathname === "/register") {
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
            <Link
              href="/dashboard"
              className={`transition-colors hover:text-foreground/80 ${
                pathname === "/dashboard" ? "text-foreground" : "text-foreground/60"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/projects"
              className={`transition-colors hover:text-foreground/80 ${
                pathname?.startsWith("/projects") ? "text-foreground" : "text-foreground/60"
              }`}
            >
              Projects
            </Link>
          </nav>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">Sign Up</Link>
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
