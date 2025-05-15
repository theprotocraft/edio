"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSupabase } from "@/hooks/useUser"
import { FcGoogle } from "react-icons/fc"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { supabase } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  const handleGoogleLogin = async () => {
    setLoading(true)

    try {
      const origin = window.location.origin

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        throw error
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Sign in to Edio</CardTitle>
        <CardDescription>Continue with Google to access your account</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button
          variant="outline"
          size="lg"
          className="w-full flex items-center justify-center gap-2 py-6"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <FcGoogle className="h-5 w-5" />
          <span>{loading ? "Signing in..." : "Sign in with Google"}</span>
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <div className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
