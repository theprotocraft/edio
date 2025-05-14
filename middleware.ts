import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Check if Supabase environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Protected routes that require Supabase
  const protectedPaths = ["/dashboard", "/projects", "/auth"]

  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  // If accessing a protected path and environment variables are missing, redirect to setup
  if (isProtectedPath && (!supabaseUrl || !supabaseKey)) {
    return NextResponse.redirect(new URL("/setup-required", request.url))
  }

  return NextResponse.next()
}

// Only run middleware on specific paths
export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/auth/:path*"],
}
