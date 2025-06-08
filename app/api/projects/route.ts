import { NextResponse } from "next/server"
import { createRouteClient } from "@/app/supabase-route"

export async function POST(request: Request) {
  try {
    const supabase = await createRouteClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to verify role
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
      
    if (profileError || !userData) {
      return NextResponse.json({ error: "User profile not found" }, { status: 400 })
    }
    
    if (userData.role !== "youtuber") {
      return NextResponse.json({ error: "Only content creators can create projects" }, { status: 403 })
    }
    
    // Get request body
    const {
      projectTitle,
      videoTitle,
      description,
      hashtags,
      fileUrl,
      fileName,
      fileSize
    } = await request.json()
    
    // Validate required fields
    if (!projectTitle) {
      return NextResponse.json({ error: "Project title is required" }, { status: 400 })
    }
    
    if (!fileUrl || !fileName || !fileSize) {
      return NextResponse.json({ error: "File information is required" }, { status: 400 })
    }
    
    // Create project record
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        project_title: projectTitle,
        video_title: videoTitle || null,
        description: description || null,
        // hashtags: hashtags || null,
        owner_id: user.id,
        status: "pending"
      })
      .select()
      .single()
      
    if (projectError || !project) {
      console.error("Error creating project:", projectError)
      return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
    }
    
    // Create upload record
    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .insert({
        project_id: project.id,
        user_id: user.id,
        file_url: fileUrl,
        file_type: "video",
        file_name: fileName,
        file_size: fileSize
      })
      .select()
      .single()
      
    if (uploadError || !upload) {
      console.error("Error creating upload record:", uploadError)
      // Project was created but upload record failed
      // We could roll back the project here, but let's keep it simple for now
      return NextResponse.json({ 
        projectId: project.id,
        warning: "Project created but upload record may be incomplete" 
      })
    }
    
    // Create initial video version record (version 1)
    const { error: versionError } = await supabase
      .from("video_versions")
      .insert({
        project_id: project.id,
        uploader_id: user.id,
        version_number: 1, // Initial version is always 1
        file_url: fileUrl,
        notes: "Initial upload"
      })
    
    if (versionError) {
      console.error("Error creating version record:", versionError)
      return NextResponse.json({ 
        projectId: project.id,
        warning: "Project created but version record may be incomplete"
      })
    }
    
    return NextResponse.json({ projectId: project.id })
  } catch (error) {
    console.error("Error in project creation API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 