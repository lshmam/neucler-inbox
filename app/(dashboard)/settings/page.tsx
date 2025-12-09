import { getMerchantId } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { SettingsClient } from "./client";

export default async function SettingsPage() {
    const merchantId = await getMerchantId();

    // Fetch merchant and profile data
    const [{ data: merchant }, { data: profile }] = await Promise.all([
        supabaseAdmin
            .from("merchants")
            .select("business_name")
            .eq("id", merchantId)
            .single(),
        supabaseAdmin
            .from("business_profiles")
            .select("*")
            .eq("merchant_id", merchantId)
            .single()
    ]);

    return (
        <SettingsClient
            merchantId={merchantId}
            businessName={merchant?.business_name || ''}
            profile={profile}
        />
    );
}