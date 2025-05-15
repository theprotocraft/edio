"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/custom/file-upload"
import { VideoVersions } from "@/components/custom/video-versions"
import { ProjectChat } from "@/components/custom/project-chat"

interface ProjectTabsProps {
  project: any
  uploads: any[]
  versions: any[]
  messages: any[]
  userRole: "creator" | "editor"
  userId: string
}

export function ProjectTabs({ project, uploads, versions, messages, userRole, userId }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState("files")

  return (
    <Tabs defaultValue="files" onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="files">Files & Assets</TabsTrigger>
        <TabsTrigger value="versions">Video Versions</TabsTrigger>
        <TabsTrigger value="chat">Chat</TabsTrigger>
      </TabsList>
      <TabsContent value="files" className="mt-6">
        <FileUpload project={project} uploads={uploads} userRole={userRole} />
      </TabsContent>
      <TabsContent value="versions" className="mt-6">
        <VideoVersions project={project} versions={versions} userRole={userRole} />
      </TabsContent>
      <TabsContent value="chat" className="mt-6">
        <ProjectChat project={project} messages={messages} userId={userId} />
      </TabsContent>
    </Tabs>
  )
}
