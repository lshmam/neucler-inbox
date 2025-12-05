import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;
    if (!merchantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { type, config, is_active } = body;

        const { error } = await supabaseAdmin
            .from("web_widgets")
            .upsert({
                merchant_id: merchantId,
                widget_type: type,
                config: config,
                is_active: is_active
            }, { onConflict: "merchant_id, widget_type" });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Widget Save Error:", error);
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
}