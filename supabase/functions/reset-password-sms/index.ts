import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sendAfricasTalking(
  phone: string,
  message: string,
  senderId: string,
  apiKey: string,
  username: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = "https://api.africastalking.com/version1/messaging";
  const formData = new URLSearchParams({ username, to: phone, message, from: senderId || "" });
  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", apiKey },
    body: formData.toString(),
  });
  const data = await response.json();
  const recipient = data?.SMSMessageData?.Recipients?.[0];
  if (recipient?.status === "Success" || recipient?.statusCode === 101) {
    return { success: true, messageId: recipient.messageId };
  }
  return { success: false, error: recipient?.status || "SMS send failed" };
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action, phone, otp, new_password } = body;

    // Normalize phone
    let normalizedPhone = (phone || "").trim().replace(/\s+/g, "");
    if (normalizedPhone.startsWith("0")) normalizedPhone = "+254" + normalizedPhone.slice(1);
    else if (normalizedPhone.startsWith("7") || normalizedPhone.startsWith("1")) normalizedPhone = "+254" + normalizedPhone;
    else if (!normalizedPhone.startsWith("+")) normalizedPhone = "+" + normalizedPhone;

    if (action === "request") {
      // Step 1: Find user by phone number
      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select("id, school_id, first_name")
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (profileError || !profile) {
        // Also try parent_phone in students table
        const { data: student } = await adminClient
          .from("students")
          .select("profile_id, school_id")
          .eq("parent_phone", normalizedPhone)
          .maybeSingle();

        if (!student) {
          return new Response(
            JSON.stringify({ error: "No account found with this phone number" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Use student's profile
        const { data: studentProfile } = await adminClient
          .from("profiles")
          .select("id, school_id, first_name")
          .eq("id", student.profile_id)
          .single();

        if (!studentProfile) {
          return new Response(
            JSON.stringify({ error: "Account not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return await handleOTPRequest(adminClient, studentProfile, normalizedPhone);
      }

      return await handleOTPRequest(adminClient, profile, normalizedPhone);
    }

    if (action === "verify") {
      // Step 2: Verify OTP
      const { data: resetRecord, error: resetError } = await adminClient
        .from("password_resets")
        .select("*")
        .eq("phone", normalizedPhone)
        .eq("otp", otp)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (resetError || !resetRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired OTP. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, user_id: resetRecord.user_id, message: "OTP verified" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset") {
      // Step 3: Reset password after OTP verification
      if (!new_password || new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: resetRecord } = await adminClient
        .from("password_resets")
        .select("*")
        .eq("phone", normalizedPhone)
        .eq("otp", otp)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!resetRecord) {
        return new Response(
          JSON.stringify({ error: "OTP expired or already used. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update password
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        resetRecord.user_id,
        { password: new_password }
      );

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to reset password: " + updateError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark OTP as used
      await adminClient.from("password_resets").update({ used: true }).eq("id", resetRecord.id);

      return new Response(
        JSON.stringify({ success: true, message: "Password reset successfully! You can now log in." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: request, verify, or reset" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Reset Password Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleOTPRequest(adminClient: any, profile: any, normalizedPhone: string) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Store OTP
  await adminClient.from("password_resets").insert({
    user_id: profile.id,
    phone: normalizedPhone,
    otp,
    expires_at: expiresAt,
    used: false,
  });

  // Fetch SMS config
  const { data: schoolSettings } = await adminClient
    .from("school_settings")
    .select("sms_sender_id, sms_api_key, sms_username")
    .eq("school_id", profile.school_id)
    .maybeSingle();

  const apiKey = schoolSettings?.sms_api_key || Deno.env.get("AT_API_KEY") || "";
  const username = schoolSettings?.sms_username || Deno.env.get("AT_USERNAME") || "sandbox";
  const senderId = schoolSettings?.sms_sender_id || Deno.env.get("AT_SENDER_ID") || "KIMATU";

  if (!apiKey) {
    // Return OTP in response for testing (in production, remove this)
    return new Response(
      JSON.stringify({ success: true, message: "OTP generated (SMS not configured)", otp_debug: otp }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const message = `Your Kimatu Analytics password reset OTP is: ${otp}. Valid for 10 minutes. Do not share this code. - Kimatu Analytics`;
  
  const smsResult = await sendAfricasTalking(normalizedPhone, message, senderId, apiKey, username);

  if (!smsResult.success) {
    return new Response(
      JSON.stringify({ error: "Failed to send OTP SMS: " + smsResult.error }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: `OTP sent to ${normalizedPhone}. Valid for 10 minutes.` }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
