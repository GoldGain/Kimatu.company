// Olympus SMS API - Direct integration
// Provider: Olympus SMS (OTS)
// Endpoint: https://sms.ots.co.ke/api/v3/sms/send
const OLYMPUS_API_URL = 'https://sms.ots.co.ke/api/v3/sms/send';
const OLYMPUS_API_TOKEN = '3682|HN95vYSLpT8BcOjhWYj7gBVOXTSp1B3UsZFbtByfbfef70cf';
const OLYMPUS_SENDER_ID = 'PROCALL';

/**
 * Send a single SMS via Olympus SMS API
 * IMPORTANT: Uses plain text only - no emojis, no special characters, no Unicode
 */
export async function sendSMS(
  phone: string,
  message: string,
  _schoolId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Normalize phone number - must start with 254, no leading 0, no +
  let normalizedPhone = phone.trim().replace(/\s+/g, '');
  if (normalizedPhone.startsWith('+')) {
    normalizedPhone = normalizedPhone.substring(1);
  }
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '254' + normalizedPhone.substring(1);
  }
  if (!normalizedPhone.startsWith('254')) {
    normalizedPhone = '254' + normalizedPhone;
  }

  // Strip any non-plain-text characters to ensure clean SMS
  const cleanMessage = message
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
    .replace(/\u2014/g, '-')       // em-dash to hyphen
    .replace(/\u2013/g, '-')       // en-dash to hyphen
    .replace(/\u2018|\u2019/g, "'") // smart quotes
    .replace(/\u201C|\u201D/g, '"') // smart double quotes
    .trim();

  const response = await fetch(OLYMPUS_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OLYMPUS_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      recipient: normalizedPhone,
      sender_id: OLYMPUS_SENDER_ID,
      type: 'plain',
      message: cleanMessage,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SMS sending failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return { success: true, messageId: result.data?.id || result.id || result.message_id };
}

/**
 * Send bulk SMS to multiple recipients via Olympus SMS
 * Returns a summary of successes and failures
 */
export async function sendBulkSMS(
  recipients: Array<{ phone: string; message: string }>,
  schoolId?: string,
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number; errors: string[] }> {
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
    if (i < recipients.length - 1) await new Promise(r => setTimeout(r, 300));
  }

  return { sent, failed, errors };
}

// ─── SMS Message Templates (plain text only - no emojis, no special chars) ────

export const SMS_TEMPLATES = {
  welcomeSchoolAdmin: (email: string) =>
    `KIMATU ANALYTICS\n\nWelcome to Kimatu Analytics!\n\nYour School Admin account has been created successfully.\n\nLogin Details:\nUsername: ${email}\nPassword: SchoolAdmin@2025\n\nLogin: https://kimatu.company/login\n\nIMPORTANT: Please change your password after first login.\n\nSmarter Schools, Brighter Futures`,

  welcomeTeacher: (email: string) =>
    `KIMATU ANALYTICS\n\nWelcome to Kimatu Analytics!\n\nYour Teacher account has been created successfully.\n\nLogin Details:\nUsername: ${email}\nPassword: Teacher@2025\n\nLogin: https://kimatu.company/login\n\nIMPORTANT: Please change your password after first login.\n\nSmarter Schools, Brighter Futures`,

  welcomeParent: (email: string) =>
    `KIMATU ANALYTICS\n\nDear Parent,\n\nYour Parent account has been created successfully.\n\nLogin Details:\nUsername: ${email}\nPassword: Parent@2025\n\nLogin: https://kimatu.company/login\n\nIMPORTANT: Please change your password after first login.\n\nSmarter Schools, Brighter Futures`,

  welcomeStudent: (email: string, admissionNumber: string) =>
    `KIMATU ANALYTICS\n\nDear Student,\n\nYour Student account has been created successfully.\n\nLogin Details:\nUsername: ${email}\nPassword: ${admissionNumber}@2025\n\nLogin: https://kimatu.company/login\n\nIMPORTANT: Please change your password after first login.\n\nSmarter Schools, Brighter Futures`,

  welcomeReseller: (email: string) =>
    `KIMATU ANALYTICS\n\nWelcome to Kimatu Analytics!\n\nYour Reseller account has been created successfully.\n\nLogin Details:\nUsername: ${email}\nPassword: 123456789\n\nLogin: https://kimatu.company/login\n\nIMPORTANT: Please change your password after first login.\n\nSmarter Schools, Brighter Futures`,

  passwordResetOTP: (otp: string) =>
    `KIMATU ANALYTICS\n\nPassword Reset Request\n\nYour OTP verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this message.\n\nSmarter Schools, Brighter Futures`,

  passwordResetSuccess: () =>
    `KIMATU ANALYTICS\n\nPassword Reset Successful\n\nYour password has been changed successfully.\n\nIf you did not make this change, please contact support immediately.\n\nSmarter Schools, Brighter Futures`,

  resultsToParent: (
    studentName: string,
    className: string,
    subjects: Array<{ name: string; marks: number; grade: string }>,
    totalPoints: number,
    totalPossible: number,
    rank: number,
    totalStudents: number,
    _comment: string
  ) => {
    const subjectLines = subjects
      .slice(0, 5)
      .map(s => `${s.name}: ${s.marks}% - ${s.grade}`)
      .join('\n');
    return `KIMATU ANALYTICS\n\nDear Parent,\n\nResults for ${studentName} - ${className}\n\nLearning Areas:\n${subjectLines}\n\nSummary:\nTotal Points: ${totalPoints}/${totalPossible}\nClass Rank: ${rank}/${totalStudents}\n\nView Full Results: https://kimatu.company/login\n\nSmarter Schools, Brighter Futures`;
  },

  announcement: (schoolName: string, message: string) =>
    `KIMATU ANALYTICS\n\n${schoolName} Announcement\n\n${message}\n\nSmarter Schools, Brighter Futures`,

  customMessage: (message: string) =>
    `KIMATU ANALYTICS\n\n${message}\n\nSmarter Schools, Brighter Futures`,
};

/**
 * Get default password for a role
 */
export function getDefaultPassword(role: string, admissionNumber?: string): string {
  switch (role) {
    case 'school_admin': return 'SchoolAdmin@2025';
    case 'teacher': return 'Teacher@2025';
    case 'student': return admissionNumber ? `${admissionNumber}@2025` : 'Student@2025';
    case 'parent': return 'Parent@2025';
    case 'reseller': return '123456789';
    default: return 'Default@2025';
  }
}

// ─── OTP-based password reset helpers ────────────────────────────────────────

/**
 * Request a password reset OTP via SMS using Supabase Edge Function
 */
export async function requestPasswordResetOTP(
  phone: string
): Promise<{ success: boolean; message: string }> {
  const { supabase } = await import('./supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
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
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
