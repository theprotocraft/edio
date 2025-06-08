"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationActions } from "./notification-actions"

interface Notification {
  id: string
  type: string
  message: string
  created_at: string
  invite_id: string
}

interface NotificationsListProps {
  notifications: Notification[]
}

export function NotificationsList({ notifications }: NotificationsListProps) {
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
              <div key={notification.id} className="flex items-start space-x-4 rounded-md border p-4">
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{notification.type}</p>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </p>
                  {notification.type === 'editor_invite' && (
                    <NotificationActions 
                      notificationId={notification.id}
                      inviteId={notification.invite_id}
                    />
                  )}
                </div>
              </div>
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