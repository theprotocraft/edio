import { NextResponse } from "next/server"
import { createServerClient } from "@/app/lib/supabase-server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    // Get project publishing status
    const { data: project, error } = await supabase
      .from("projects")
      .select("publishing_status")
      .eq("id", params.id)
      .single()

    if (error) {
      console.error("Error fetching publishing status:", error)
      return NextResponse.json(
        { error: "Failed to fetch publishing status" },
        { status: 500 }
      )
    }

    return NextResponse.json({ status: project.publishing_status })
  } catch (error) {
    console.error("Error in publish status route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 