"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Send } from "lucide-react"
import { getInitials } from "@/lib/utils"
import { sendMessage } from "@/lib/api"
import { useSupabase } from "@/hooks/useUser"
import { Message } from "@/types"

interface ChatFeedProps {
  projectId: string
  initialMessages: Message[]
  userId: string
  onMessageAdd?: (message: Message) => void
}

export function ChatFeed({ projectId, initialMessages, userId, onMessageAdd }: ChatFeedProps) {
  const [msgs, setMsgs] = useState<Message[]>(initialMessages)
  const [lastMessageCount, setLastMessageCount] = useState(initialMessages.length)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [notifiedMessageIds, setNotifiedMessageIds] = useState<Set<string>>(new Set())
  
  // Synchronous deduplication (faster than React state)
  const notifiedIdsRef = useRef<Set<string>>(new Set())
  
  // Sync with external messages updates
  useEffect(() => {
    setMsgs(initialMessages)
    setLastMessageCount(initialMessages.length)
  }, [initialMessages])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { supabase } = useSupabase()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [])

  // Function to show notification for new messages
  const showNotification = (message: Message) => {
    // Synchronous deduplication check
    if (notifiedIdsRef.current.has(message.id)) {
      console.log('🚫 Notification already sent for message:', message.id)
      return
    }
    
    // Immediately mark as notified (synchronous)
    notifiedIdsRef.current.add(message.id)
    
    console.log('🔔 Notification check:', {
      hasNotification: 'Notification' in window,
      permission: Notification.permission,
      isOtherUser: message.sender_id !== userId,
      visibilityState: document.visibilityState,
      senderName: message.sender?.name
    })

    // Only show notifications for other users' messages
    if ('Notification' in window && message.sender_id !== userId) {
      // Mark this message as notified
      setNotifiedMessageIds(prev => new Set([...prev, message.id]))
      try {
        console.log('✅ Attempting to create notification')
        
        const notification = new Notification(`New message from ${message.sender?.name || 'Unknown User'}`, {
          body: message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content,
          icon: message.sender?.avatar_url,
          requireInteraction: true, // Prevent auto-dismiss
        })

        // Debug notification lifecycle
        notification.onshow = () => {
          console.log('🔔 Notification SHOWN')
        }
        
        notification.onclose = () => {
          console.log('❌ Notification CLOSED')
        }
        
        notification.onerror = (error) => {
          console.log('❌ Notification ERROR:', error)
        }

        // Focus window when notification is clicked
        notification.onclick = () => {
          console.log('👆 Notification CLICKED')
          window.focus()
        }
        
        console.log('✅ Notification created successfully')
      } catch (error) {
        console.log('❌ Notification failed:', error)
        // Request permission if not granted
        if (Notification.permission === 'default') {
          console.log('🔔 Requesting notification permission...')
          Notification.requestPermission().then(permission => {
            console.log('🔔 Permission result:', permission)
            setNotificationPermission(permission)
          })
        }
      }
    } else {
      console.log('❌ Notification blocked - not other user message')
    }
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [msgs])


  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!supabase) {
      console.log('No supabase client available for realtime')
      return
    }

    console.log('Setting up realtime subscription for project:', projectId)
    
    // Subscribe to the channel and listen for INSERT events
    const channel = supabase
      .channel(`project-${projectId}-messages`)
      .on(
        'broadcast',
        { event: 'test' },
        (payload) => {
          console.log('🧪 REALTIME: Broadcast test received:', payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          console.log('🔥 POSTGRES_CHANGES: Received payload:', payload)
          const newMessage = payload.new as any
          console.log('🔥 POSTGRES_CHANGES: Parsed message:', newMessage)
          console.log('🔍 USER CHECK: Message sender_id:', newMessage.sender_id, 'Current userId:', userId, 'Is other user:', newMessage.sender_id !== userId)
          
          // Fetch complete message data with sender info since realtime doesn't include relations
          try {
            const { data: fullMessage } = await supabase
              .from("messages")
              .select(`
                *,
                sender:users(id, name, email, avatar_url)
              `)
              .eq("id", newMessage.id)
              .single()
            
            if (fullMessage) {
              setMsgs(prev => {
                // Check if this message already exists (avoid duplicates)
                if (prev.find(msg => msg.id === fullMessage.id)) {
                  return prev
                }
                
                // If this is from the current user, replace optimistic message but keep "You" as name
                if (fullMessage.sender_id === userId) {
                  const withoutOptimistic = prev.filter(msg => !msg.id.startsWith('temp-'))
                  // Pre-construct the sender object to avoid any temporary exposure of real user data
                  const youSender = {
                    id: userId,
                    name: "You",
                    email: fullMessage.sender?.email,
                    avatar_url: fullMessage.sender?.avatar_url
                  }
                  const messageWithYou = {
                    ...fullMessage,
                    sender: youSender // Use pre-constructed sender object
                  } as Message
                  const updated = [...withoutOptimistic, messageWithYou]
                  
                  // Update parent with the real message (defer to avoid render cycle issues)
                  if (onMessageAdd) {
                    setTimeout(() => onMessageAdd(messageWithYou), 0)
                  }
                  
                  return updated
                }
                
                // For other users' messages, just add normally
                const updated = [...prev, fullMessage as Message]
                
                // Show notification for other users' messages
                console.log('📨 Calling showNotification for other user message')
                showNotification(fullMessage as Message)
                
                // Update parent with the new message (defer to avoid render cycle issues)
                if (onMessageAdd) {
                  setTimeout(() => onMessageAdd(fullMessage as Message), 0)
                }
                
                return updated
              })
            }
          } catch (error) {
            console.error("Error fetching full message data:", error)
            
            // Fallback to basic message if sender fetch fails
            setMsgs(prev => {
              // Check if this message already exists (avoid duplicates)
              if (prev.find(msg => msg.id === newMessage.id)) {
                return prev
              }
              
              // If this is from the current user, replace optimistic message but keep "You" as name
              if (newMessage.sender_id === userId) {
                const withoutOptimistic = prev.filter(msg => !msg.id.startsWith('temp-'))
                // Pre-construct the sender object to avoid any temporary exposure of real user data
                const youSender = {
                  id: userId,
                  name: "You",
                  email: undefined,
                  avatar_url: undefined
                }
                const messageWithYou = {
                  ...newMessage,
                  sender: youSender // Use pre-constructed sender object
                } as Message
                return [...withoutOptimistic, messageWithYou]
              }
              
              // For other users' messages, just add normally
              console.log('📨 Calling showNotification for fallback message')
              showNotification(newMessage as Message)
              return [...prev, newMessage as Message]
            })
          }
        }
      )
      .subscribe((status) => {
        // Handle connection status
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          // Trigger immediate polling when realtime fails
          setTimeout(async () => {
            try {
              const { data: latestMessages } = await supabase
                .from("messages")
                .select(`*, sender:users(id, name, email, avatar_url)`)
                .eq("project_id", projectId)
                .order("created_at", { ascending: true })

              if (latestMessages && latestMessages.length > lastMessageCount) {
                const newMessages = latestMessages.slice(lastMessageCount)
                
                newMessages.forEach((message) => {
                  const formattedMessage = {
                    ...message,
                    sender: message.sender_id === userId 
                      ? { ...message.sender, name: "You" }
                      : message.sender
                  } as Message

                  setMsgs(prev => {
                    const exists = prev.find(msg => msg.id === formattedMessage.id)
                    if (!exists) {
                      // Show notification for other users' messages
                      if (formattedMessage.sender_id !== userId) {
                        showNotification(formattedMessage)
                      }
                      setTimeout(() => {
                        if (onMessageAdd) {
                          onMessageAdd(formattedMessage)
                        }
                      }, 0)
                      return [...prev, formattedMessage]
                    }
                    return prev
                  })
                })
                
                setLastMessageCount(latestMessages.length)
              }
            } catch (error) {
              console.error('Error syncing messages after connection loss:', error)
            }
          }, 1000)
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, projectId, userId])

  // Fallback polling to ensure messages are synced (runs every 30 seconds)
  useEffect(() => {
    if (!supabase) return

    const pollMessages = async () => {
      try {
        const { data: latestMessages } = await supabase
          .from("messages")
          .select(`
            *,
            sender:users(id, name, email, avatar_url)
          `)
          .eq("project_id", projectId)
          .order("created_at", { ascending: true })

        if (latestMessages && latestMessages.length > lastMessageCount) {
          const newMessages = latestMessages.slice(lastMessageCount)
          
          newMessages.forEach((message) => {
            const formattedMessage = {
              ...message,
              sender: message.sender_id === userId 
                ? { ...message.sender, name: "You" }
                : message.sender
            } as Message

            setMsgs(prev => {
              const exists = prev.find(msg => msg.id === formattedMessage.id)
              if (!exists) {
                // Show notification for other users' messages
                if (formattedMessage.sender_id !== userId) {
                  console.log('📨 Calling showNotification for polling message')
                  showNotification(formattedMessage)
                }
                if (onMessageAdd) {
                  setTimeout(() => onMessageAdd(formattedMessage), 0)
                }
                return [...prev, formattedMessage]
              }
              return prev
            })
          })
          
          setLastMessageCount(latestMessages.length)
        }
      } catch (error) {
        console.error('Error polling messages:', error)
      }
    }

    // Poll every 30 seconds
    const pollInterval = setInterval(pollMessages, 30000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [supabase, projectId, userId, lastMessageCount, onMessageAdd])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) {
      return
    }

    setSending(true)
    const messageContent = newMessage.trim()
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`, // Temporary ID
      project_id: projectId,
      sender_id: userId,
      content: messageContent,
      type: 'text',
      created_at: new Date().toISOString(),
      sender: {
        id: userId,
        name: "You", // Always use "You" for optimistic messages to avoid initials mismatch
        email: undefined,
      }
    }

    // Add optimistic message immediately
    setMsgs(prev => [...prev, optimisticMessage])
    setNewMessage("")
    
    // Notify parent component about the new message (defer to avoid render cycle issues)
    setTimeout(() => {
      if (onMessageAdd) {
        onMessageAdd(optimisticMessage)
      }
    }, 0)

    try {
      
      const result = await sendMessage({
        projectId,
        content: messageContent,
      })
      
      // Test if realtime is working with a simple broadcast
      if (supabase) {
        const channel = supabase.channel(`project-${projectId}-messages`)
        channel.send({
          type: 'broadcast',
          event: 'test',
          payload: { message: 'Testing realtime connection', timestamp: Date.now() }
        })
      }
      
      
      // The real message will replace the optimistic one via realtime subscription
      // Also poll once after 5 seconds to ensure message was persisted
      setTimeout(async () => {
        try {
          const { data: recentMessages } = await supabase
            .from("messages")
            .select("id, content")
            .eq("project_id", projectId)
            .eq("sender_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)

          // Message persistence check (silent)
        } catch (error) {
          console.error('Error checking message persistence:', error)
        }
      }, 5000)
      
    } catch (error: any) {
      // Remove optimistic message on error
      setMsgs(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setNewMessage(messageContent) // Restore the message content
      
      toast({
        title: "Error",
        description: error.message || "Failed to send message.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as any)
    }
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {}

    msgs.forEach((message) => {
      const date = new Date(message.created_at).toLocaleDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })

    return groups
  }

  const messageGroups = groupMessagesByDate()

  return (
    <div className="flex flex-col h-[600px] border rounded-lg overflow-hidden shadow-md">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.keys(messageGroups).length > 0 ? (
          Object.entries(messageGroups).map(([date, dateMessages]) => (
            <div key={date} className="space-y-4">
              <div className="flex justify-center">
                <span className="text-xs bg-muted px-2 py-1 rounded-full">{date}</span>
              </div>

              {dateMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex max-w-[80%] ${message.sender_id === userId ? "flex-row-reverse" : "flex-row"}`}>
                    <Avatar className={`h-8 w-8 ${message.sender_id === userId ? "ml-2" : "mr-2"}`}>
                      <AvatarImage src={"You"} alt={message.sender?.name || "User"} />
                      <AvatarFallback 
                        className={`font-semibold text-white ${
                          message.sender_id === userId 
                            ? "bg-blue-500" 
                            : "bg-green-500"
                        }`}
                      >
                        {message.sender_id === userId 
                          ? "You" 
                          : getInitials(message.sender?.name || message.sender?.email || "User")
                        }
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      {/* Sender name */}
                      <div
                        className={`text-xs font-medium text-muted-foreground mb-1 ${
                          message.sender_id === userId ? "text-right" : "text-left"
                        }`}
                      >
                        {message.sender_id === userId ? "You" : (message.sender?.name || message.sender?.email || "Unknown User")}
                      </div>
                      
                      <div
                        className={`rounded-lg p-3 ${
                          message.type === "feedback"
                            ? "bg-yellow-50 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                            : message.sender_id === userId
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      
                      <div
                        className={`text-xs text-muted-foreground mt-1 ${
                          message.sender_id === userId ? "text-right" : "text-left"
                        }`}
                      >
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-2">No messages yet</p>
            <p className="text-sm text-muted-foreground">Start the conversation with your team</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] flex-1 resize-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !newMessage.trim()}
            className="rounded-full h-10 w-10 shadow-md transition-transform active:scale-[0.98]"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  )
}