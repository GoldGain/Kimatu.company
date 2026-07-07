// SMSGate Cloud API - Direct integration
// Credentials are hardcoded as per system configuration
const SMSGATE_API_URL = 'https://api.sms-gate.app/3rdparty/v1/messages';
const SMSGATE_USERNAME = '7KTHKG';
const SMSGATE_PASSWORD = 'cvnjmdrrpq5q7m';
const SMSGATE_SENDER = 'Kimatu Analytics';

// Helper: build Basic auth header
const buildAuthHeader = () => {
  return 'Basic ' + btoa(`${SMSGATE_USERNAME}:${SMSGATE_PASSWORD}`);
};

/**
 * Send a single SMS via SMSGate Cloud API
 */
export async function sendSMS(phone: string, message: string, _schoolId?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Normalize phone number - ensure it starts with 254 or +
  let normalizedPhone = phone.trim();
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '254' + normalizedPhone.substring(1);
  }
  if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = '+' + normalizedPhone;
  }

  const response = await fetch(SMSGATE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': buildAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: message,
      phoneNumbers: [normalizedPhone],
      senderId: SMSGATE_SENDER,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SMS sending failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return { success: true, messageId: result.messageId || result.id };
}

/**
 * Send bulk SMS to multiple recipients via SMSGate
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
    if (i < recipients.length - 1) await new Promise(r => setTimeout(r, 200));
  }

  return { sent, failed, errors };
}

// ─── SMS Message Templates ────────────────────────────────────────────────────

export const SMS_TEMPLATES = {
  welcomeSchoolAdmin: (email: string) =>
    `KIMATU ANALYTICS\n━━━━━━━━━━━━━━━━━━━━\nWelcome to Kimatu Analytics!\n\nYour School Admin account has been created successfully.\n\nLogin Details:\nUsername: ${email}\nPassword: SchoolAdmin@2025\n\nLogin: https://kimatu.company/login\n\nIMPORTANT: Please change your password after first login for security.\n\nSmarter Schools, Brighter Futures\n━━━━━━━━━━━━━━━━━━━━`,

  welcomeTeacher: (email: string) =>
    `KIMATU ANALYTICS\n━━━━━━━━━━━━━━━━━━━━\nWelcome to Kimatu Analytics!\n\nYour Teacher account has been created successfully.\n\nLogin Details:\nUsername: ${email}\nPassword: Teacher@2025\n\nLogin: https://kimatu.company/login\n\nIMPORTANT: Please change your password after first login for security.\n\nSmarter Schools, Brighter Futures\n━━━━━━━━━━━━━━━━━━━━`,

  welcomeParent: (email: string) =>
    `KIMATU ANALYTICS\n━━━━━━━━━━━━━━━━━━━━\nDear Parent,\n\nYour Parent account has been created successfully.\n\nLogin Details:\nUsername: ${email}\nPassword: Parent@2025\n\nLogin: https://kimatu.company/login\n\nIMPORTANT: Please change your password after first login for security.\n\nSmarter Schools, Brighter Futures\n━━━━━━━━━━━━━━━━━━━━`,

  welcomeStudent: (email: string, admissionNumber: string) =>
    `KIMATU ANALYTICS\n━━━━━━━━━━━━━━━━━━━━\nDear Student,\n\nYour Student account has been created successfully.\n\nLogin Details:\nUsername: ${email}\nPassword: ${admissionNumber}@2025\n\nLogin: https://kimatu.company/login\n\nIMPORTANT: Please change your password after first login for security.\n\nSmarter Schools, Brighter Futures\n━━━━━━━━━━━━━━━━━━━━`,

  welcomeReseller: (email: string) =>
    `KIMATU ANALYTICS\n━━━━━━━━━━━━━━━━━━━━\nWelcome to Kimatu Analytics!\n\nYour Reseller account has been created successfully.\n\nLogin Details:\nUsername: ${email}\nPassword: 123456789\n\nLogin: https://kimatu.company/login\n\nIMPORTANT: Please change your password after first login for security.\n\nSmarter Schools, Brighter Futures\n━━━━━━━━━━━━━━━━━━━━`,

  passwordResetOTP: (otp: string) =>
    `KIMATU ANALYTICS\n━━━━━━━━━━━━━━━━━━━━\nPassword Reset Request\n\nYour OTP verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this message.\n\nSmarter Schools, Brighter Futures\n━━━━━━━━━━━━━━━━━━━━`,

  passwordResetSuccess: () =>
    `KIMATU ANALYTICS\n━━━━━━━━━━━━━━━━━━━━\nPassword Reset Successful\n\nYour password has been changed successfully.\n\nIf you did not make this change, please contact support immediately.\n\nSmarter Schools, Brighter Futures\n━━━━━━━━━━━━━━━━━━━━`,

  resultsToParent: (studentName: string, className: string, subjects: Array<{ name: string; marks: number; grade: string }>, totalPoints: number, totalPossible: number, rank: number, totalStudents: number, comment: string) => {
    const subjectLines = subjects.slice(0, 5).map(s => `${s.name}: ${s.marks}% - ${s.grade}`).join('\n');
    return `KIMATU ANALYTICS\n━━━━━━━━━━━━━━━━━━━━\nDear Parent,\n\nResults for ${studentName} - ${className}\n\nLearning Areas:\n${subjectLines}\n\nSummary:\nTotal Points: ${totalPoints}/${totalPossible}\nClass Rank: ${rank}/${totalStudents}\n\nTeacher Comment:\n${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}\n\nView Full Results:\nhttps://kimatu.company/login\n\nSmarter Schools, Brighter Futures\n━━━━━━━━━━━━━━━━━━━━`;
  },

  announcement: (schoolName: string, message: string) =>
    `KIMATU ANALYTICS\n━━━━━━━━━━━━━━━━━━━━\n${schoolName} Announcement\n\n${message}\n\nSmarter Schools, Brighter Futures\n━━━━━━━━━━━━━━━━━━━━`,

  customMessage: (message: string) =>
    `KIMATU ANALYTICS\n━━━━━━━━━━━━━━━━━━━━\n${message}\n\nSmarter Schools, Brighter Futures\n━━━━━━━━━━━━━━━━━━━━`,
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

// ─── Legacy functions for backward compatibility ──────────────────────────────

/**
 * Request a password reset OTP via SMS
 * Uses Supabase Edge Function - kept for compatibility
 */
export async function requestPasswordResetOTP(phone: string): Promise<{ success: boolean; message: string }> {
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
  const { supabase } = await import('./supabase/client');
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
  const { supabase } = await import('./supabase/client');
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
