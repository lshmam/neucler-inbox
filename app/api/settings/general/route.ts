import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get merchant ID
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
            return NextResponse.json({ error: "No merchant access" }, { status: 403 });
        }

        const body = await request.json();
        const { name, masterBookingUrl, slug } = body;

        // Update merchants table (business name)
        if (name) {
            await supabaseAdmin
                .from("merchants")
                .update({ business_name: name })
                .eq("platform_merchant_id", merchantId);
        }

        // Update business_profiles table - only booking fields
        const { error: profileError } = await supabaseAdmin
            .from("business_profiles")
            .update({
                master_booking_url: masterBookingUrl || null,
                slug: slug || null
            })
            .eq("merchant_id", merchantId);

        if (profileError) {
            console.error("Profile update error:", profileError);
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Settings save error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
