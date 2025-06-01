"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSupabase } from "@/hooks/useUser"
import { FcGoogle } from "react-icons/fc"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function RegisterPage() {
  const [userRole, setUserRole] = useState("youtuber")
  const [loading, setLoading] = useState(false)
  const { supabase } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

  const handleGoogleSignUp = async () => {
    setLoading(true)

    try {
      const origin = window.location.origin
      const redirectTo = `${origin}/auth/callback?role=${userRole}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo,
          queryParams: {
            role: userRole,
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
        title: "Registration failed",
        description: error.message || "An error occurred during registration.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
        <CardDescription>Choose your account type and sign up with Google</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-center block">I am a</Label>
          <RadioGroup value={userRole} onValueChange={setUserRole} className="flex justify-center space-x-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="youtuber" id="youtuber" />
              <Label htmlFor="youtuber">Content Creator</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="editor" id="editor" />
              <Label htmlFor="editor">Video Editor</Label>
            </div>
          </RadioGroup>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full flex items-center justify-center gap-2 py-6"
          onClick={handleGoogleSignUp}
          disabled={loading}
        >
          <FcGoogle className="h-5 w-5" />
          <span>{loading ? "Creating account..." : "Sign up with Google"}</span>
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <div className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
