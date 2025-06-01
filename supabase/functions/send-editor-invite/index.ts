import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { email, projectOwnerEmail } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Send email using your email service (e.g., SendGrid, AWS SES, etc.)
    // This is a placeholder - you'll need to implement the actual email sending logic
    const emailResponse = await fetch("https://api.your-email-service.com/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("EMAIL_SERVICE_API_KEY")}`,
      },
      body: JSON.stringify({
        to: email,
        subject: "You've been invited to be an editor",
        html: `
          <h1>Editor Invitation</h1>
          <p>${projectOwnerEmail} has invited you to be an editor on their projects.</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${Deno.env.get("APP_URL")}/accept-invite?email=${encodeURIComponent(email)}">
            Accept Invitation
          </a>
        `,
      }),
    })

    if (!emailResponse.ok) {
      throw new Error("Failed to send email")
    }

    return new Response(
      JSON.stringify({ message: "Invitation sent successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
}) 