import { createClient } from '@supabase/supabase-js';

// This client is for SERVER-SIDE Admin tasks only (like saving the token)
// It uses the SERVICE_ROLE_KEY which has full access to the DB.
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);