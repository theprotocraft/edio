"use client"

import { useState, useEffect } from "react"
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

  // Update local state when props change
  useEffect(() => {
    setCurrentProject(project)
  }, [project])

  useEffect(() => {
    setCurrentMessages(messages)
  }, [messages])

  // Handle project updates for immediate UI feedback
  const handleProjectUpdate = (updates: any) => {
    setCurrentProject((prev: any) => ({
      ...prev,
      ...updates
    }))
  }

  // Handle message updates for immediate UI feedback
  const handleMessageAdd = (newMessage: Message) => {
    setCurrentMessages((prev) => [...prev, newMessage])
  }

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
          versions={versions} 
          userRole={userRole} 
          onProjectUpdate={handleProjectUpdate}
          onMessageAdd={handleMessageAdd}
        />
      </TabsContent>
      <TabsContent value="chat" className="mt-6">
        <ChatFeed projectId={project.id} initialMessages={currentMessages} userId={userId} />
      </TabsContent>
    </Tabs>
  )
}
