import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

interface CreateUserInput {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  school_id?: string | null;
  metadata?: Record<string, unknown>;
}

interface CreateUserResult {
  user: {
    id: string;
    email: string;
  };
  message?: string;
}

export async function createScopedUser(input: CreateUserInput): Promise<CreateUserResult> {
  const { data, error } = await supabase.functions.invoke<CreateUserResult>('create-user', {
    body: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      first_name: input.first_name || '',
      last_name: input.last_name || '',
      role: input.role,
      school_id: input.school_id || null,
      metadata: input.metadata || {},
    },
  });

  if (error) {
    throw new Error(error.message || 'Unable to create user account.');
  }

  if (!data?.user?.id) {
    throw new Error('User account was not created by the provisioning service.');
  }

  return data;
}
