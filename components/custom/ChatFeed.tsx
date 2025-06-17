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
}

export function ChatFeed({ projectId, initialMessages, userId }: ChatFeedProps) {
  const [msgs, setMsgs] = useState<Message[]>(initialMessages)
  
  // Sync with external messages updates
  useEffect(() => {
    setMsgs(initialMessages)
  }, [initialMessages])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { supabase } = useSupabase()
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
          console.log('🔥 REALTIME: Raw payload received:', payload)
          const newMessage = payload.new as any
          console.log('🔥 REALTIME: Parsed message:', newMessage)
          
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
              console.log('Fetched full message with sender:', fullMessage)
              setMsgs(prev => {
                console.log('Current messages before update:', prev)
                // Check if this message already exists (avoid duplicates)
                if (prev.find(msg => msg.id === fullMessage.id)) {
                  console.log('Message already exists, skipping')
                  return prev
                }
                
                // If this is from the current user, replace optimistic message but keep "You" as name
                if (fullMessage.sender_id === userId) {
                  console.log('Replacing optimistic message for current user')
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
                  console.log('Updated messages after replacing optimistic:', updated)
                  return updated
                }
                
                // For other users' messages, just add normally
                console.log('Adding message from other user')
                const updated = [...prev, fullMessage as Message]
                console.log('Updated messages after adding other user message:', updated)
                return updated
              })
            }
          } catch (error) {
            console.error("Error fetching full message data:", error)
            
            // Fallback to basic message if sender fetch fails
            setMsgs(prev => {
              console.log('Using fallback message update')
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
              return [...prev, newMessage as Message]
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      console.log('Cleaning up realtime subscription')
      channel.unsubscribe()
    }
  }, [supabase, projectId, userId])

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
    console.log('💡 Optimistic message added, current msgs count:', msgs.length + 1)

    try {
      console.log('Sending message:', messageContent)
      console.log('Optimistic message added to UI:', optimisticMessage)
      
      const result = await sendMessage({
        projectId,
        content: messageContent,
      })
      console.log('Message sent successfully:', result)
      
      // Test if realtime is working with a simple broadcast
      if (supabase) {
        const channel = supabase.channel(`project-${projectId}-messages`)
        channel.send({
          type: 'broadcast',
          event: 'test',
          payload: { message: 'Testing realtime connection', timestamp: Date.now() }
        })
        console.log('🧪 Test broadcast sent')
      }
      
      // Add a small timeout to see if realtime kicks in
      setTimeout(() => {
        console.log('Current messages after 2 seconds:', msgs)
      }, 2000)
      
      // The real message will replace the optimistic one via realtime subscription
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