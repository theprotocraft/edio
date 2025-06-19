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

interface ProjectChatProps {
  project: any
  messages: any[]
  userId: string
}

export function ProjectChat({ project, messages, userId }: ProjectChatProps) {
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) {
      return
    }

    setSending(true)

    try {
      await sendMessage({
        projectId: project.id,
        content: newMessage,
      })

      setNewMessage("")
      router.refresh()
    } catch (error: any) {
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
    const groups: { [key: string]: any[] } = {}

    messages.forEach((message) => {
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
                      <AvatarImage src={message.sender?.avatar_url} alt={message.sender?.name || "User"} />
                      <AvatarFallback 
                        className={`font-semibold text-white ${
                          message.sender_id === userId 
                            ? "bg-blue-500" 
                            : "bg-green-500"
                        }`}
                      >
                        {getInitials(message.sender?.name || message.sender?.email || "User")}
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
                        {message.type === "feedback" && <div className="font-medium mb-1 text-sm">Feedback:</div>}
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
