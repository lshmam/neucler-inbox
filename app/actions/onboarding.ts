'use server'

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// Define the shape of data coming from your form
interface OnboardingData {
    business_name: string;
    address: string;
    phone: string;
    website: string;
    business_hours: string[];
    services: string[];
}

export async function saveOnboardingData(data: OnboardingData) {
    const supabase = await createClient();

    // 1. Get current logged-in user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    // 2. Generate a custom Platform Merchant ID
    // We clean the UUID to look more like a merchant ID (e.g., m_12345...)
    const platformMerchantId = `m_${user.id.replace(/-/g, '')}`;

    // 3. Insert into MERCHANTS table
    // We use the User ID as the Primary Key so it links 1:1 with Auth
    const { error: merchantError } = await supabase
        .from('merchants')
        .insert({
            id: user.id, // Link to Supabase Auth
            platform_merchant_id: platformMerchantId,
            email: user.email,
            business_name: data.business_name,
            subscription_status: 'trialing',
            access_token: 'pending_generation' // Placeholder requirement from your schema
        });

    if (merchantError) {
        console.error("Merchant Insert Error:", merchantError);
        throw new Error("Failed to create merchant account");
    }

    // 4. Insert into BUSINESS_PROFILES table
    // This uses the platform_merchant_id as the Foreign Key
    const { error: profileError } = await supabase
        .from('business_profiles')
        .insert({
            merchant_id: platformMerchantId,
            address: data.address,
            phone: data.phone,
            website: data.website,
            business_hours: JSON.stringify(data.business_hours), // Convert array to JSONB
            // services_summary: data.services.join(', '), // Optional: Map services if needed
            is_onboarding_completed: true
        });

    if (profileError) {
        console.error("Profile Insert Error:", profileError);
        // Ideally, rollback merchant creation here, but for now we throw
        throw new Error("Failed to save business profile details");
    }

    // 5. Return success (Controller will handle redirect)
    return { success: true };
}