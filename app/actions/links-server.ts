/**
 * Server-side smart link generator for use in API routes
 * This is a non-action version that can be imported in non-React contexts
 */

import { supabaseAdmin } from "@/lib/supabase";

// Characters for short ID (excludes confusing ones: 0, O, 1, l, I)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateShortId(length: number = 6): string {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return result;
}

/**
 * Creates a tracked smart link for booking (server-side version)
 * For use in API routes, webhooks, and other non-action contexts
 */
export async function createSmartLinkServer(
    merchantId: string,
    contactId?: string,
    customUrl?: string
): Promise<string> {
    // Get business profile with booking URL and slug
    const { data: profile } = await supabaseAdmin
        .from("business_profiles")
        .select("master_booking_url, slug")
        .eq("merchant_id", merchantId)
        .single();

    const targetUrl = customUrl || profile?.master_booking_url;
    const slug = profile?.slug;

    if (!targetUrl) {
        throw new Error("No booking URL configured");
    }

    if (!slug) {
        throw new Error("No URL slug configured");
    }

    // Generate unique short ID
    const linkId = generateShortId(6);

    // Insert smart link
    const { error: insertError } = await supabaseAdmin
        .from("smart_links")
        .insert({
            id: linkId,
            merchant_id: merchantId,
            contact_id: contactId || null,
            target_url: targetUrl
        });

    if (insertError) {
        console.error("Failed to create smart link:", insertError);
        throw new Error("Failed to create booking link");
    }

    // Build the full tracked URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${appUrl}/go/${slug}/${linkId}`;
}
