import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// VAPID keys for web push
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = 'mailto:admin@eduhub.ac.ke';

// Helper: base64url encode
function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper: base64url decode
function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

// Generate VAPID JWT
async function generateVapidJWT(audience: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  };

  const encodedHeader = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Import the private key
  const privateKeyBytes = base64urlDecode(VAPID_PRIVATE_KEY);
  const privateKey = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = base64urlEncode(new Uint8Array(signature));
  return `${signingInput}.${encodedSignature}`;
}

// Send a single push notification
async function sendPushNotification(subscription: any, payload: string): Promise<boolean> {
  try {
    const endpoint = subscription.endpoint;
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await generateVapidJWT(audience);
    const vapidHeader = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': vapidHeader,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body: new TextEncoder().encode(payload),
    });

    return response.ok || response.status === 201;
  } catch (err) {
    console.error('Push send error:', err);
    return false;
  }
}

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { userIds, title, message, url } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ error: 'userIds array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch push subscriptions for these users
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', userIds);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
    }

    const subs = subscriptions || [];
    let sent = 0;
    let failed = 0;

    const notificationPayload = JSON.stringify({
      title: title || 'EduHub Notification',
      body: message || '',
      url: url || '/',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    });

    // Send push to each subscription
    for (const sub of subs) {
      if (sub.subscription) {
        const success = await sendPushNotification(sub.subscription, notificationPayload);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: subs.length,
        sent,
        failed,
        message: `Push notifications sent: ${sent}/${subs.length}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
