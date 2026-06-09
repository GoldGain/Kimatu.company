import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://naihzzlszvrkxrxogsuz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5haWh6emxzenZya3hyeG9nc3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTI1NDIsImV4cCI6MjA5NDg4ODU0Mn0.aMqkjlgMAWxXqAJ1hkCiE9NldaoqNO3oid8CV7xUgTM';

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
let supabaseUntypedInstance: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

function getSupabaseUntyped() {
  if (!supabaseUntypedInstance) {
    supabaseUntypedInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseUntypedInstance;
}

// Typed client for regular queries
export const supabase = getSupabase();

// Untyped client for complex relational queries (fixes build errors)
export const supabaseUntyped = getSupabaseUntyped();

export default supabase;