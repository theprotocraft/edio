import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Video, Edit, MessageSquare, Upload } from "lucide-react"
import PublicNavbar from "@/components/public-navbar"
import { EnvChecker } from "@/components/env-checker"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">
        {/* Environment variable checker - only shows if env vars are missing */}
        <EnvChecker />

        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Seamless Collaboration for Content Creators
                  </h1>
                  <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                    Edio connects YouTubers with video editors in one streamlined platform. Upload, review, and finalize
                    your videos with ease.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/login">
                    <Button
                      size="lg"
                      className="gap-1.5 rounded-2xl shadow-md transition-transform active:scale-[0.98]"
                    >
                      Get Started <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button size="lg" variant="outline" className="rounded-2xl">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-[350px] w-full max-w-[550px] sm:h-[450px] md:h-[550px] lg:h-[550px]">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-70 blur-3xl" />
                  <div className="relative bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 h-full w-full rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-8 rounded-full bg-blue-500" />
                          <div className="font-medium">Project Dashboard</div>
                        </div>
                        <div className="flex space-x-2">
                          <div className="h-3 w-3 rounded-full bg-red-500" />
                          <div className="h-3 w-3 rounded-full bg-yellow-500" />
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 flex-1">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Features</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Everything you need to streamline your video production workflow
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center space-y-2 rounded-lg border border-gray-200 p-6 shadow-sm dark:border-gray-800">
                <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                  <Video className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold">Project Management</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Organize your video projects with deadlines and requirements
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border border-gray-200 p-6 shadow-sm dark:border-gray-800">
                <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                  <Edit className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold">Version Control</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Track changes and manage multiple versions of your videos
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border border-gray-200 p-6 shadow-sm dark:border-gray-800">
                <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                  <MessageSquare className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold">In-App Chat</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Communicate directly with your team within each project
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border border-gray-200 p-6 shadow-sm dark:border-gray-800">
                <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                  <Upload className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold">Secure Uploads</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Share large files securely with pre-signed S3 URLs
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t border-gray-200 bg-white py-6 dark:border-gray-800 dark:bg-gray-950">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Edio</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">© 2023 All rights reserved.</span>
            </div>
            <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
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
