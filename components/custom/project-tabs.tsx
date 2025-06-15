"use client"

import { useState } from "react"
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

  return (
    <Tabs defaultValue="details" onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Video Details</TabsTrigger>
        <TabsTrigger value="versions">Video Versions</TabsTrigger>
        <TabsTrigger value="chat">Chat</TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="mt-6">
        <ProjectDetails project={project} userRole={userRole} uploads={uploads} />
      </TabsContent>
      <TabsContent value="versions" className="mt-6">
        <VideoVersions project={project} versions={versions} userRole={userRole} />
      </TabsContent>
      <TabsContent value="chat" className="mt-6">
        <ChatFeed projectId={project.id} initialMessages={messages} userId={userId} />
      </TabsContent>
    </Tabs>
  )
}
