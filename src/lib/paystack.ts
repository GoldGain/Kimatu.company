// Kimatu Analytics — Paystack Integration
// Pricing: Ksh 50 per learner per term
// Secret Key: Store in SUPABASE_EDGE_FUNCTION or .env (NEVER in client code)

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_f711df1d32dec5d0c2a5a393a76904b1ebfa89bf';

export interface PaystackPaymentParams {
  email: string;
  amount: number; // in KES kobo (already multiplied by 100)
  reference: string;
  callback_url?: string;
  metadata?: Record<string, any>;
  onSuccess?: (response: PaystackSuccessResponse) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

export interface PaystackSuccessResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        callback: (response: PaystackSuccessResponse) => void;
        onClose: () => void;
        metadata?: Record<string, any>;
        callback_url?: string;
      }) => { openIframe: () => void };
    };
  }
}

let scriptLoaded = false;
let scriptLoading = false;

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (scriptLoaded) { resolve(); return; }
    if (scriptLoading) {
      const check = setInterval(() => {
        if (scriptLoaded) { clearInterval(check); resolve(); }
      }, 100);
      return;
    }
    scriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => { scriptLoaded = true; scriptLoading = false; resolve(); };
    script.onerror = () => { scriptLoading = false; reject(new Error('Failed to load Paystack script')); };
    document.body.appendChild(script);
  });
}

/**
 * Initialize a Paystack payment popup
 * @param params Payment parameters
 */
export async function initializePayment(params: PaystackPaymentParams): Promise<void> {
  await loadPaystackScript();

  const { email, amount, reference, callback_url, metadata, onSuccess, onCancel, onError } = params;

  try {
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount, // Amount in kobo (KES * 100)
      currency: 'KES',
      ref: reference,
      callback: (response: PaystackSuccessResponse) => {
        console.log('Paystack payment success:', response);
        onSuccess?.(response);
      },
      onClose: () => {
        console.log('Paystack payment cancelled');
        onCancel?.();
      },
      ...(callback_url ? { callback_url } : {}),
      ...(metadata ? { metadata } : {}),
    });

    handler.openIframe();
  } catch (error) {
    console.error('Paystack payment error:', error);
    onError?.(error as Error);
  }
}

/**
 * Calculate payment amount for a school
 * @param learnerCount Number of learners
 * @param terms Number of terms (default: 1)
 * @returns Amount in KES (NOT multiplied by 100)
 */
export function calculatePaymentAmount(learnerCount: number, terms: number = 1): number {
  const RATE_PER_LEARNER_PER_TERM = 50; // Ksh 50
  return learnerCount * RATE_PER_LEARNER_PER_TERM * terms;
}

/**
 * Generate a unique payment reference
 * @param schoolId School identifier
 * @returns Unique reference string
 */
export function generatePaymentReference(schoolId: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `KIM_${schoolId}_${timestamp}_${random}`;
}

/**
 * Verify a Paystack transaction
 * NOTE: This should be called via a Supabase Edge Function to keep the secret key secure
 * @param reference Payment reference
 * @returns Verification response
 */
export async function verifyTransaction(reference: string): Promise<any> {
  // Call your Supabase Edge Function for verification
  const { data, error } = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
  }).then(r => r.json());
  
  if (error) throw new Error(error);
  return data;
}

export { PAYSTACK_PUBLIC_KEY };
