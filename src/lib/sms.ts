import { supabase } from './supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Send a single SMS via the Supabase Edge Function
 */
export async function sendSMS(phone: string, message: string, schoolId?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ phone, message, school_id: schoolId }),
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'SMS sending failed');
  }
}

/**
 * Send bulk SMS to multiple recipients
 * Returns a summary of successes and failures
 */
export async function sendBulkSMS(
  recipients: Array<{ phone: string; message: string }>,
  schoolId?: string,
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i++) {
    const { phone, message } = recipients[i];
    try {
      await sendSMS(phone, message, schoolId);
      sent++;
    } catch (err: any) {
      failed++;
      errors.push(`${phone}: ${err.message}`);
    }
    if (onProgress) onProgress(i + 1, recipients.length);
    // Small delay to avoid rate limiting
    if (i < recipients.length - 1) await new Promise(r => setTimeout(r, 200));
  }

  return { sent, failed, errors };
}

/**
 * Request a password reset OTP via SMS
 */
export async function requestPasswordResetOTP(phone: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: 'request', phone }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Failed to send OTP');
  return result;
}

/**
 * Verify the OTP for password reset
 */
export async function verifyPasswordResetOTP(
  phone: string,
  otp: string
): Promise<{ success: boolean; user_id: string; message: string }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: 'verify', phone, otp }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'OTP verification failed');
  return result;
}

/**
 * Reset password after OTP verification
 */
export async function resetPasswordWithOTP(
  phone: string,
  otp: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: 'reset', phone, otp, new_password: newPassword }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Password reset failed');
  return result;
}
