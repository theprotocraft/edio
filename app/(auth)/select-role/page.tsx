"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

export default function SelectRolePage() {
  const [userRole, setUserRole] = useState("youtuber")
  const [loading, setLoading] = useState(true)
  const [checkingUser, setCheckingUser] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionToken = searchParams.get("session")
  const { toast } = useToast()

  // Check if user already exists on component mount
  useEffect(() => {
    const checkExistingUser = async () => {
      if (!sessionToken) {
        setCheckingUser(false)
        setLoading(false)
        return
      }

      try {
        const supabase = createClientComponentClient<Database>()
        
        // Get the user data
        const { data, error } = await supabase.auth.getUser()
        
        if (error || !data?.user) {
          throw new Error("Could not retrieve user information")
        }
        
        // Check if user already has a profile
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select()
          .eq("id", data.user.id)
          .single()
          
        // If user exists, redirect to dashboard
        if (userData) {
          router.push("/dashboard")
          return
        }
        
        // User doesn't exist, show role selection
        setCheckingUser(false)
        setLoading(false)
      } catch (error: any) {
        console.error("Error checking user:", error)
        toast({
          title: "Error checking account",
          description: "An error occurred while checking your account. Please try signing in again.",
          variant: "destructive",
        })
        setCheckingUser(false)
        setLoading(false)
      }
    }
    
    checkExistingUser()
  }, [sessionToken, router, toast])

  const handleRoleSelect = async () => {
    if (!sessionToken) {
      toast({
        title: "Session expired",
        description: "Your session has expired. Please sign in again.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      // Create a Supabase client
      const supabase = createClientComponentClient<Database>()
      
      // Get the user data from the session
      const { data, error } = await supabase.auth.getUser()
      
      if (error || !data?.user) {
        throw new Error("Could not retrieve user information")
      }
      
      // Create the user profile with the selected role
      const { error: insertError } = await supabase.from("users").insert({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.full_name || data.user.user_metadata.name || "",
        role: userRole,
      })

      if (insertError) {
        throw new Error("Could not create user profile")
      }

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Error setting up your account",
        description: error.message || "An error occurred during account setup.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  if (checkingUser) {
    return (
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Checking Account</CardTitle>
          <CardDescription>Please wait while we check your account status...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!sessionToken) {
    return (
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Session Expired</CardTitle>
          <CardDescription>Your session has expired. Please sign in again.</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push("/login")}>Back to Sign In</Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome to Edio</CardTitle>
        <CardDescription>Please select your account type to continue</CardDescription>
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
          className="w-full"
          onClick={handleRoleSelect}
          disabled={loading}
        >
          {loading ? "Setting up your account..." : "Continue"}
        </Button>
      </CardContent>
    </Card>
  )
} 