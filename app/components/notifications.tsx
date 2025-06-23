"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationItem } from "./notification-item"

interface Notification {
  id: string
  type: string
  message: string
  metadata: any
  read: boolean
  created_at: string
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchPromise, setFetchPromise] = useState<Promise<void> | null>(null)
  const supabase = createClientComponentClient()

  const fetchNotifications = async () => {
    // Prevent duplicate requests
    if (fetchPromise) return fetchPromise

    const promise = (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5)

        if (error) throw error
        setNotifications(data || [])
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoading(false)
        setFetchPromise(null)
      }
    })()

    setFetchPromise(promise)
    return promise
  }

  useEffect(() => {
    const setupNotifications = async () => {
      await fetchNotifications()

      // Subscribe to new notifications
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    setupNotifications()
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Mark all unread notifications as read
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds)

      if (error) throw error
      
      // Refresh notifications to update the UI
      await fetchNotifications()
    } catch (error) {
      console.error("Error marking notifications as read:", error)
    }
  }

  return (
    <DropdownMenu onOpenChange={(open) => {
      if (open) {
        markAllAsRead()
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onActionComplete={fetchNotifications}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 