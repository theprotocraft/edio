import React, { useState } from 'react';
import { Badge, Button } from '@/components/ui/components';
import { CheckCircle, XCircle } from 'lucide-react';

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const getStatusBadge = (notification: any) => {
    if (notification.type === "editor_invite") {
      switch (notification.metadata?.status) {
        case "accepted":
          return <Badge variant="default" className="ml-2">Accepted</Badge>
        case "rejected":
          return <Badge variant="destructive" className="ml-2">Rejected</Badge>
        case "pending":
          return <Badge variant="secondary" className="ml-2">Pending</Badge>
        default:
          return <Badge variant="secondary" className="ml-2">New</Badge>
      }
    }
    if (!notification.read) {
      return <Badge variant="secondary" className="ml-2">New</Badge>
    }
    return null
  }

  const getActionButtons = (notification: any) => {
    if (notification.type === "editor_invite" && 
        (!notification.metadata?.status || notification.metadata?.status === "pending")) {
      return (
        <div className="flex space-x-2 mt-2">
          <Button
            size="sm"
            onClick={() => handleAction(notification.id, true)}
            className="flex-1"
            disabled={loading}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleAction(notification.id, false)}
            className="flex-1"
            disabled={loading}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </div>
      )
    }
    return null
  }

  const handleAction = async (notificationId: string, accept: boolean) => {
    setLoading(true);
    try {
      // Replace with actual API call to handle the action
      console.log(`Handling action for notification ${notificationId}, accept: ${accept}`);
    } catch (error) {
      console.error("Error handling action:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {notifications.map(notification => (
        <div key={notification.id} className="flex items-center justify-between">
          <div className="flex items-center">
            {getStatusBadge(notification)}
          </div>
          <div>
            {getActionButtons(notification)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Notifications; 