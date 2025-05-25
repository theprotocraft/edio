"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { useState } from "react"

export default function LogoutButton() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant="ghost" 
      className="w-full justify-start" 
      onClick={handleLogout}
      disabled={isLoading}
    >
      <LogOut className="mr-2 h-5 w-5" />
      {isLoading ? "Logging out..." : "Logout"}
    </Button>
  )
} 