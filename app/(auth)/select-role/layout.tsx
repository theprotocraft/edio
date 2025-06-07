import Image from "next/image"
import type { ReactNode } from "react"

export default function SelectRoleLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-screen-xl flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center">
          <Image
            src="/logo.svg"
            alt="Edio"
            width={40}
            height={40}
            className="mr-2"
          />
          <span className="text-2xl font-bold">Edio</span>
        </div>
        <div className="w-full max-w-md">{children}</div>
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Edio. All rights reserved.
        </footer>
      </div>
    </div>
  )
} 