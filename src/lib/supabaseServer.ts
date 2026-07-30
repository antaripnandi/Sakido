import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client initialized with the secret key (service_role/secret).
 * MUST ONLY be called in server-side routes (e.g., Express handlers).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !secretKey) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SECRET_KEY in server environment variables.'
      );
    }

    supabaseAdminInstance = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseAdminInstance;
}
