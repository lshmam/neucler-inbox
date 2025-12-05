import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { makeOutboundCall } from "@/lib/retell";

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;
    if (!merchantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { to_number } = body;

        // 1. Get the Agent ID from DB
        const { data: agent } = await supabaseAdmin
            .from("ai_agents")
            .select("retell_agent_id")
            .eq("merchant_id", merchantId)
            .single();

        if (!agent || !agent.retell_agent_id) {
            return NextResponse.json({ error: "Agent not configured. Please save settings first." }, { status: 400 });
        }

        // 2. Trigger Call
        await makeOutboundCall(to_number, agent.retell_agent_id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Call Failed:", error);
        return NextResponse.json({ error: error.message || "Call Failed" }, { status: 500 });
    }
}