"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationItem } from "@/app/components/notification-item"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  type: string
  message: string
  created_at: string
  invite_id?: string
}

interface DashboardNotificationsProps {
  notifications: Notification[]
}

export function DashboardNotifications({ notifications }: DashboardNotificationsProps) {
  const router = useRouter()

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Notifications</CardTitle>
        <CardDescription>Stay updated on your palproject activities</CardDescription>
      </CardHeader>
      <CardContent>
        {notifications && notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <NotificationItem 
                key={notification.id}
                notification={notification}
                onActionComplete={() => router.refresh()}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-center">
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 