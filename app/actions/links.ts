'use server';

import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// Characters for short ID (excludes confusing ones: 0, O, 1, l, I)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateShortId(length: number = 6): string {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return result;
}

interface CreateSmartLinkOptions {
    contactId?: string;
    customUrl?: string; // Override master URL if needed
}

/**
 * Creates a tracked smart link for booking
 * @param options - contactId and optional custom URL
 * @returns The full tracked URL: https://[APP_URL]/go/[slug]/[id]
 */
export async function createSmartLink(options: CreateSmartLinkOptions = {}): Promise<string> {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error("Unauthorized");
    }

    // Get merchant's profile with booking URL and slug
    const { data: merchant } = await supabaseAdmin
        .from("merchants")
        .select("platform_merchant_id")
        .eq("id", user.id)
        .single();

    let merchantId = merchant?.platform_merchant_id;

    // Check team membership if not direct owner
    if (!merchantId) {
        const { data: team } = await supabaseAdmin
            .from("team_members")
            .select("merchant_id")
            .eq("user_id", user.id)
            .single();
        merchantId = team?.merchant_id;
    }

    if (!merchantId) {
        throw new Error("No merchant access");
    }

    // Get business profile with booking URL and slug
    const { data: profile } = await supabaseAdmin
        .from("business_profiles")
        .select("master_booking_url, slug")
        .eq("merchant_id", merchantId)
        .single();

    const targetUrl = options.customUrl || profile?.master_booking_url;
    const slug = profile?.slug;

    if (!targetUrl) {
        throw new Error("No booking URL configured. Please set one in Settings.");
    }

    if (!slug) {
        throw new Error("No URL slug configured. Please set one in Settings.");
    }

    // Generate unique short ID
    const linkId = generateShortId(6);

    // Insert smart link
    const { error: insertError } = await supabaseAdmin
        .from("smart_links")
        .insert({
            id: linkId,
            merchant_id: merchantId,
            contact_id: options.contactId || null,
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

/**
 * Get smart links analytics for a merchant
 */
export async function getSmartLinksAnalytics(merchantId: string) {
    const { data, error } = await supabaseAdmin
        .from("smart_links")
        .select("id, clicked_at, created_at, contact_id")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
        console.error("Failed to fetch smart links:", error);
        return { total: 0, clicked: 0, links: [] };
    }

    const clicked = data?.filter(l => l.clicked_at).length || 0;
    return {
        total: data?.length || 0,
        clicked,
        clickRate: data?.length ? Math.round((clicked / data.length) * 100) : 0,
        links: data || []
    };
}
