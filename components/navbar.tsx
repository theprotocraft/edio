"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { useSupabase } from "@/lib/supabase-provider"

export default function Navbar() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { supabase, user, loading } = useSupabase()

  const isActive = (path: string) => {
    return pathname === path
  }

  // Check if we're on authentication pages
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password"
  // Check if we're on the home page
  const isHomePage = pathname === "/"

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="container mx-auto flex h-16 items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">Edio</span>
        </Link>
        <nav className="hidden md:flex ml-auto items-center gap-6">
          {/* Only show navigation links if not on auth pages and not on home page */}
          {!isAuthPage && !isHomePage && (
            <Link
              href="/"
              className={`text-sm font-medium ${
                isActive("/")
                  ? "text-blue-600 dark:text-blue-500"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
              }`}
            >
              Home
            </Link>
          )}

          {/* Only show dashboard and projects if user is logged in and not on auth pages */}
          {!isAuthPage && user && (
            <>
              <Link
                href="/dashboard"
                className={`text-sm font-medium ${
                  isActive("/dashboard")
                    ? "text-blue-600 dark:text-blue-500"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/projects"
                className={`text-sm font-medium ${
                  isActive("/projects")
                    ? "text-blue-600 dark:text-blue-500"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                }`}
              >
                Projects
              </Link>
            </>
          )}

          {/* Show auth buttons if user is not logged in */}
          {!loading && !user && (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
          <ModeToggle />
        </nav>
        <div className="flex md:hidden ml-auto items-center gap-4">
          <ModeToggle />
          <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle Menu">
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="container py-4 px-4 sm:px-6 flex flex-col gap-4">
            {/* Only show navigation links if not on auth pages and not on home page */}
            {!isAuthPage && !isHomePage && (
              <Link
                href="/"
                className={`text-sm font-medium ${
                  isActive("/")
                    ? "text-blue-600 dark:text-blue-500"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
            )}

            {/* Only show dashboard and projects if user is logged in and not on auth pages */}
            {!isAuthPage && user && (
              <>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium ${
                    isActive("/dashboard")
                      ? "text-blue-600 dark:text-blue-500"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/projects"
                  className={`text-sm font-medium ${
                    isActive("/projects")
                      ? "text-blue-600 dark:text-blue-500"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Projects
                </Link>
              </>
            )}

            {/* Show auth buttons if user is not logged in */}
            {!loading && !user && (
              <div className="flex flex-col gap-2">
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
