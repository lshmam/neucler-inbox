import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { syncCustomers } from "@/lib/square";

export async function POST(request: NextRequest) {
    // 1. Auth Check
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;

    if (!merchantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Get Token
    const { data: merchant } = await supabaseAdmin
        .from("merchants")
        .select("access_token")
        .eq("platform_merchant_id", merchantId)
        .single();

    if (!merchant) return NextResponse.json({ error: "No token found" }, { status: 401 });

    try {
        // 3. Run the Sync
        const count = await syncCustomers(merchantId, merchant.access_token);
        return NextResponse.json({ success: true, count });
    } catch (error) {
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}