import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;
    if (!merchantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { persona } = await request.json();
        if (!persona) {
            return NextResponse.json({ error: "Persona is required." }, { status: 400 });
        }

        // Use upsert to either create a new agent record or update an existing one.
        // This is safe whether it's the user's first time or they are re-configuring.
        const { error } = await supabaseAdmin
            .from("ai_agents")
            .upsert({
                merchant_id: merchantId,
                agent_persona: persona,
                is_configured: true // This is the crucial flag that unlocks the dashboard view!
            }, {
                onConflict: "merchant_id" // Use the merchant_id as the unique key for the upsert
            });

        if (error) {
            console.error("Persona save error:", error);
            throw error;
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to save agent persona." }, { status: 500 });
    }
}