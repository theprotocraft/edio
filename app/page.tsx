import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Streamline Your Video Editing Workflow
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Edio connects YouTubers with editors for seamless collaboration, feedback, and video production.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/register">
                  <Button>Get Started</Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline">Sign In</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-3 items-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tighter md:text-3xl">For YouTubers</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Focus on creating content while easily managing your editing projects. Provide feedback, approve
                  versions, and keep everything organized.
                </p>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tighter md:text-3xl">For Editors</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Streamline your workflow with clear project requirements, organized feedback, and version tracking.
                  Deliver your best work efficiently.
                </p>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tighter md:text-3xl">Seamless Collaboration</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Real-time chat, file sharing, and version control in one place. No more scattered feedback or lost
                  files.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full py-6 bg-white dark:bg-gray-950 border-t">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Edio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
