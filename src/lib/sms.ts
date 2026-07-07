// ─── Olympus SMS API Integration ─────────────────────────────────────────────
// Using Olympus SMS with PROCALL sender ID

const OLYMPUS_API_URL = 'https://sms.ots.co.ke/api/v3/sms/send';
const OLYMPUS_API_TOKEN = '3682|HN95vYSLpT8BcOjhWYj7gBVOXTSp1B3UsZFbtByfbfef70cf';
const DEFAULT_SENDER_ID = 'PROCALL';

interface SMSPayload {
  recipient: string;   // Format: 254XXXXXXXXX
  sender_id: string;   // Sender ID for SMS
  type: 'plain';       // Must be "plain"
  message: string;     // Plain text only, no emojis
}

interface SMSResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Send a single SMS via Olympus SMS API
 * @param phone - Phone number in format 254XXXXXXXXX
 * @param message - Plain text message (no emojis or special characters)
 */
export async function sendSMS(phone: string, message: string): Promise<SMSResponse> {
  try {
    // Normalize phone to 254XXXXXXXXX format
    let normalizedPhone = phone.trim().replace(/\s/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '254' + normalizedPhone.slice(1);
    }
    if (normalizedPhone.startsWith('+')) {
      normalizedPhone = normalizedPhone.slice(1);
    }

    // Strip emojis and special characters that cause encoding issues
    const cleanMessage = message.replace(/[^\w\s.,;:!?@#$%&*()\-+=/[\]{}|<>~^`\n]/g, '');

    const payload: SMSPayload = {
      recipient: normalizedPhone,
      sender_id: DEFAULT_SENDER_ID,
      type: 'plain',
      message: cleanMessage,
    };

    const response = await fetch(OLYMPUS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OLYMPUS_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, message: 'SMS sent successfully', data };
    } else {
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send SMS' };
  }
}

/**
 * Send bulk SMS to multiple recipients
 * @param recipients - Array of phone numbers
 * @param message - Plain text message
 */
export async function sendBulkSMS(recipients: string[], message: string): Promise<SMSResponse> {
  const results: any[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const phone of recipients) {
    const result = await sendSMS(phone, message);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    results.push({ phone, ...result });
  }

  return {
    success: failCount === 0,
    message: `Sent: ${successCount}, Failed: ${failCount}`,
    data: results,
  };
}

// ─── Welcome SMS Messages ────────────────────────────────────────────────────

export function generateWelcomeSMS(
  firstName: string,
  role: string,
  email: string,
  password: string,
  schoolName?: string
): string {
  const schoolLine = schoolName ? ` at ${schoolName}` : '';
  return `Welcome to Kimatu Analytics${schoolLine}!\n\nHello ${firstName}, your ${role} account has been created.\n\nLogin: ${email}\nPassword: ${password}\nPortal: https://kimatu.company\n\nPlease change your password after first login.`;
}

export function generateResultsSMS(
  parentName: string,
  studentName: string,
  termName: string,
  average: string,
  position?: string
): string {
  const posLine = position ? `\nPosition: ${position}` : '';
  return `Kimatu Analytics: Results Notification\n\nDear ${parentName},\n${studentName}'s ${termName} results are now available.\nAverage: ${average}%${posLine}\n\nLogin to view full report: https://kimatu.company`;
}

export function generateAnnouncementSMS(
  schoolName: string,
  message: string
): string {
  return `Kimatu Analytics: ${schoolName}\n\n${message}`;
}

export function generatePasswordResetSMS(otp: string): string {
  return `Kimatu Analytics: Password Reset\n\nYour OTP code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore.`;
}

// ─── Legacy compatible functions ─────────────────────────────────────────────

export const SMS_TEMPLATES = {
  welcomeSchoolAdmin: (email: string, password?: string) =>
    generateWelcomeSMS('Admin', 'School Admin', email, password || 'SchoolAdmin@2025'),

  welcomeTeacher: (email: string, password?: string) =>
    generateWelcomeSMS('Teacher', 'Teacher', email, password || 'Teacher@2025'),

  welcomeParent: (email: string, password?: string) =>
    generateWelcomeSMS('Parent', 'Parent', email, password || 'Parent@2025'),

  welcomeStudent: (email: string, admissionNumber: string) =>
    generateWelcomeSMS('Learner', 'Student', email, `${admissionNumber}@2025`),

  welcomeReseller: (email: string) =>
    generateWelcomeSMS('Reseller', 'Reseller', email, '123456789'),

  passwordResetOTP: (otp: string) =>
    generatePasswordResetSMS(otp),

  passwordResetSuccess: () =>
    'Kimatu Analytics: Your password has been reset successfully. If you did not make this change, contact support.',

  resultsToParent: (studentName: string, className: string, subjects: Array<{ name: string; marks: number; grade: string }>, totalPoints: number, totalPossible: number, rank: number, totalStudents: number, comment: string) => {
    const subjectLines = subjects.slice(0, 5).map(s => `${s.name}: ${s.marks}% - ${s.grade}`).join('\n');
    return `Kimatu Analytics\n\nResults for ${studentName} - ${className}\n\nLearning Areas:\n${subjectLines}\n\nSummary:\nTotal Points: ${totalPoints}/${totalPossible}\nClass Rank: ${rank}/${totalStudents}\n\nView Full Results:\nhttps://kimatu.company`;
  },

  announcement: (schoolName: string, message: string) =>
    generateAnnouncementSMS(schoolName, message),

  customMessage: (message: string) =>
    `Kimatu Analytics\n\n${message}`,
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
