import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

/**
 * Server-side helper to get the current authenticated user's ID
 * This is used as the merchant_id throughout the system
 */
export async function getMerchantId(): Promise<string> {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error } = await supabase.auth.getUser();

    // If no user or error, redirect to login
    if (error || !user) {
        console.log('[getMerchantId] No user found, redirecting to login');
        redirect('/login');
    }

    // Return the user.id directly as the merchant_id
    // This simplifies the system by removing the platform_merchant_id layer
    return user.id;
}
