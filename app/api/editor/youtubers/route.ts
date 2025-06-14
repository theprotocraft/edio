import { NextResponse } from "next/server"
import { createRouteClient } from "@/app/supabase-route"

export async function GET(request: Request) {
  try {
    const supabase = await createRouteClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is an editor
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
      
    if (profileError || !userData || userData.role !== "editor") {
      return NextResponse.json({ 
        error: "Access denied. Editor role required.", 
        userRole: userData?.role
      }, { status: 403 })
    }
    
    // Get affiliated youtubers (accepted relationships)
    const { data: affiliatedData, error: affiliatedError } = await supabase
      .from("youtuber_editors")
      .select(`
        id,
        youtuber_id,
        status,
        created_at,
        updated_at,
        youtuber:youtuber_id (
          id,
          name,
          email,
          created_at
        )
      `)
      .eq("editor_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
    
    if (affiliatedError) {
      console.error("Error fetching affiliated youtubers:", affiliatedError)
      return NextResponse.json({ error: "Failed to fetch affiliated youtubers" }, { status: 500 })
    }

    // Get pending invitations from youtubers
    const { data: pendingData, error: pendingError } = await supabase
      .from("youtuber_editors")
      .select(`
        id,
        youtuber_id,
        status,
        created_at,
        youtuber:youtuber_id (
          id,
          name,
          email,
          created_at
        )
      `)
      .eq("editor_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
    
    if (pendingError) {
      console.error("Error fetching pending invitations:", pendingError)
      return NextResponse.json({ error: "Failed to fetch pending invitations" }, { status: 500 })
    }

    // Also get editor_invites table data
    const { data: editorInvitesData, error: editorInvitesError } = await supabase
      .from("editor_invites")
      .select(`
        id,
        creator_id,
        editor_email,
        status,
        created_at,
        accepted_at,
        creator:creator_id (
          id,
          name,
          email,
          created_at
        )
      `)
      .eq("editor_email", user.email)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
    
    if (editorInvitesError) {
      console.error("Error fetching editor invites:", editorInvitesError)
      return NextResponse.json({ error: "Failed to fetch editor invites" }, { status: 500 })
    }

    // Transform the data
    const affiliatedYoutubers = affiliatedData?.map(item => ({
      id: item.id,
      relationshipId: item.id,
      youtuber: {
        id: item.youtuber.id,
        name: item.youtuber.name,
        email: item.youtuber.email,
        joined: item.youtuber.created_at
      },
      status: item.status,
      connectedSince: item.updated_at || item.created_at
    })) || []

    const pendingInvitations = [
      // From youtuber_editors table
      ...(pendingData?.map(item => ({
        id: item.id,
        type: "youtuber_editor" as const,
        youtuber: {
          id: item.youtuber.id,
          name: item.youtuber.name,
          email: item.youtuber.email
        },
        invitedAt: item.created_at
      })) || []),
      // From editor_invites table
      ...(editorInvitesData?.map(item => ({
        id: item.id,
        type: "editor_invite" as const,
        youtuber: {
          id: item.creator.id,
          name: item.creator.name,
          email: item.creator.email
        },
        invitedAt: item.created_at
      })) || [])
    ]

    return NextResponse.json({ 
      affiliatedYoutubers,
      pendingInvitations
    })
  } catch (error) {
    console.error("Error in editor youtubers API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createRouteClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is an editor
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
      
    if (profileError || !userData || userData.role !== "editor") {
      return NextResponse.json({ error: "Access denied. Editor role required." }, { status: 403 })
    }
    
    const { invitationId, action, invitationType } = await request.json()
    
    if (!invitationId || !action || !invitationType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (invitationType === "youtuber_editor") {
      // Handle youtuber_editors table invitation
      const { error: updateError } = await supabase
        .from("youtuber_editors")
        .update({
          status: action === "accept" ? "active" : "rejected"
        })
        .eq("id", invitationId)
        .eq("editor_id", user.id)
        .eq("status", "pending")

      if (updateError) {
        console.error("Error updating youtuber_editors invitation:", updateError)
        return NextResponse.json({ error: "Failed to update invitation" }, { status: 500 })
      }
    } else if (invitationType === "editor_invite") {
      // Handle editor_invites table invitation
      const { error: updateError } = await supabase
        .from("editor_invites")
        .update({
          status: action === "accept" ? "accepted" : "declined",
          accepted_at: action === "accept" ? new Date().toISOString() : null,
          editor_id: action === "accept" ? user.id : null
        })
        .eq("id", invitationId)
        .eq("editor_email", user.email)
        .eq("status", "pending")

      if (updateError) {
        console.error("Error updating editor_invites invitation:", updateError)
        return NextResponse.json({ error: "Failed to update invitation" }, { status: 500 })
      }

      // If accepted, also create entry in youtuber_editors table
      if (action === "accept") {
        const { data: inviteData, error: fetchError } = await supabase
          .from("editor_invites")
          .select("creator_id")
          .eq("id", invitationId)
          .single()

        if (!fetchError && inviteData) {
          const { error: createError } = await supabase
            .from("youtuber_editors")
            .insert({
              youtuber_id: inviteData.creator_id,
              editor_id: user.id,
              status: "active"
            })

          if (createError) {
            console.error("Error creating youtuber_editors entry:", createError)
            // Don't fail the request, just log the error
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Invitation ${action}ed successfully`
    })
  } catch (error) {
    console.error("Error in editor youtubers POST API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}