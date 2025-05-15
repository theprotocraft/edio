import type React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ModeToggle } from "@/components/ui/mode-toggle"

export const metadata: Metadata = {
  title: "Authentication - Edio",
  description: "Authentication pages for Edio platform",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">Edio</span>
          </Link>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">{children}</main>
      <footer className="w-full border-t border-border bg-muted py-6 px-4 md:px-8">
        <div className="container mx-auto">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Edio</span>
              <span className="text-sm text-muted-foreground">© 2023 All rights reserved.</span>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="#" className="hover:underline">
                Terms
              </Link>
              <Link href="#" className="hover:underline">
                Privacy
              </Link>
              <Link href="#" className="hover:underline">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
