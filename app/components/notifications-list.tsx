"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationItem } from "./notification-item"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  type: string
  message: string
  created_at: string
  metadata: any
  read: boolean
}

interface NotificationsListProps {
  notifications: Notification[]
}

export function NotificationsList({ notifications }: NotificationsListProps) {
  const router = useRouter()

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Notifications</CardTitle>
        <CardDescription>Stay updated on your project activities</CardDescription>
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