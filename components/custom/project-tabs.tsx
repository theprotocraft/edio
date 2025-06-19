"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VideoVersions } from "@/components/custom/video-versions"
import { ChatFeed } from "@/components/custom/ChatFeed"
import { ProjectDetails } from "@/components/custom/project-details"
import { Message } from "@/types"

interface ProjectTabsProps {
  project: any
  uploads: any[]
  versions: any[]
  messages: Message[]
  userRole: "youtuber" | "editor"
  userId: string
}

export function ProjectTabs({ project, uploads, versions, messages, userRole, userId }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [currentProject, setCurrentProject] = useState(project)
  const [currentMessages, setCurrentMessages] = useState(messages)
  const [currentVersions, setCurrentVersions] = useState(versions)

  // Update local state when props change
  useEffect(() => {
    setCurrentProject(project)
  }, [project])

  useEffect(() => {
    setCurrentMessages(messages)
  }, [messages])

  useEffect(() => {
    setCurrentVersions(versions)
  }, [versions])

  // Function to refresh versions from API
  const refreshVersions = async () => {
    try {
      // Small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const response = await fetch(`/api/projects/${project.id}/versions`)
      if (response.ok) {
        const data = await response.json()
        setCurrentVersions(data.versions || [])
      }
    } catch (error) {
      console.error('Failed to refresh versions:', error)
    }
  }

  // Handle project updates for immediate UI feedback
  const handleProjectUpdate = (updates: any) => {
    setCurrentProject((prev: any) => ({
      ...prev,
      ...updates
    }))
    
    // If this is a refresh request, refetch versions
    if (updates?.refresh) {
      refreshVersions()
    }
  }

  // Handle message updates for immediate UI feedback
  const handleMessageAdd = useCallback((newMessage: Message) => {
    setCurrentMessages((prev) => {
      // Check if message already exists by ID
      const exists = prev.find(msg => msg.id === newMessage.id)
      if (exists) {
        return prev // Message already exists, don't add duplicate
      }
      
      // If this is a real message (from server), check if we need to replace an optimistic message
      if (!newMessage.id.startsWith('temp-') && newMessage.sender_id === userId) {
        // Remove any temporary messages for this user and add the real one
        const withoutOptimistic = prev.filter(msg => !msg.id.startsWith('temp-'))
        return [...withoutOptimistic, newMessage]
      }
      
      // Add new message (optimistic or from other users)
      return [...prev, newMessage]
    })
  }, [userId])

  return (
    <Tabs defaultValue="details" onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Video Details</TabsTrigger>
        <TabsTrigger value="versions">Video Versions</TabsTrigger>
        <TabsTrigger value="chat">Chat</TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="mt-6">
        <ProjectDetails project={currentProject} userRole={userRole} uploads={uploads} />
      </TabsContent>
      <TabsContent value="versions" className="mt-6">
        <VideoVersions 
          project={currentProject} 
          versions={currentVersions} 
          userRole={userRole} 
          onProjectUpdate={handleProjectUpdate}
          onMessageAdd={handleMessageAdd}
        />
      </TabsContent>
      <TabsContent value="chat" className="mt-6">
        <ChatFeed 
          projectId={project.id} 
          initialMessages={currentMessages} 
          userId={userId}
          onMessageAdd={handleMessageAdd}
        />
      </TabsContent>
    </Tabs>
  )
}
