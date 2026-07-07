import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Africa's Talking SMS API
async function sendAfricasTalking(
  phone: string,
  message: string,
  senderId: string,
  apiKey: string,
  username: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = "https://api.africastalking.com/version1/messaging";
  const formData = new URLSearchParams({
    username,
    to: phone,
    message,
    from: senderId || "",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      apiKey,
    },
    body: formData.toString(),
  });

  const data = await response.json();
  const recipient = data?.SMSMessageData?.Recipients?.[0];
  if (recipient?.status === "Success" || recipient?.statusCode === 101) {
    return { success: true, messageId: recipient.messageId };
  }
  return { success: false, error: recipient?.status || "SMS send failed" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role, school_id")
      .eq("id", callerUser.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { phone, message, school_id } = body;

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: phone, message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolvedSchoolId = school_id || callerProfile.school_id;

    // Fetch SMS branding config from school settings
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: schoolSettings } = await adminClient
      .from("school_settings")
      .select("sms_sender_id, sms_api_key, sms_username, sms_provider")
      .eq("school_id", resolvedSchoolId)
      .maybeSingle();

    // Fall back to environment variables
    const apiKey = schoolSettings?.sms_api_key || Deno.env.get("AT_API_KEY") || "";
    const username = schoolSettings?.sms_username || Deno.env.get("AT_USERNAME") || "sandbox";
    const senderId = schoolSettings?.sms_sender_id || Deno.env.get("AT_SENDER_ID") || "KIMATU";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "SMS not configured. Please set up SMS credentials in School Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone number to E.164 format
    let normalizedPhone = phone.trim().replace(/\s+/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "+254" + normalizedPhone.slice(1);
    } else if (normalizedPhone.startsWith("7") || normalizedPhone.startsWith("1")) {
      normalizedPhone = "+254" + normalizedPhone;
    } else if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = "+" + normalizedPhone;
    }

    const result = await sendAfricasTalking(normalizedPhone, message, senderId, apiKey, username);

    // Log SMS to sms_logs table
    await adminClient.from("sms_logs").insert({
      school_id: resolvedSchoolId,
      recipient_phone: normalizedPhone,
      message,
      status: result.success ? "sent" : "failed",
      message_id: result.messageId || null,
      error_message: result.error || null,
      sent_by: callerUser.id,
      sent_at: new Date().toISOString(),
    }).catch(() => {}); // Non-blocking log

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || "SMS failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("SMS Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
