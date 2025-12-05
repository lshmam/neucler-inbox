import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;
    if (!merchantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { id, name, voice_id, system_prompt, opening_greeting, desired_area_code, type } = body;

        console.log("------------------------------------------------");
        console.log(`🤖 Agent Save Request for: ${merchantId}`);
        console.log(`Action: ${id ? "UPDATE Existing" : "CREATE New"}`);

        // SCENARIO 1: UPDATE
        if (id) {
            const { error } = await supabaseAdmin
                .from("ai_agents")
                .update({ name, voice_id, system_prompt, opening_greeting, type })
                .eq("id", id)
                .eq("merchant_id", merchantId);

            if (error) throw error;
            console.log("✅ Update Successful");
        }

        // SCENARIO 2: CREATE (The Pending One)
        else {
            const payload = {
                merchant_id: merchantId,
                name: name || "New Agent Request",
                voice_id: voice_id,
                system_prompt: system_prompt,
                opening_greeting: opening_greeting,
                desired_area_code: desired_area_code,
                type: type || 'inbound',
                provisioning_status: 'pending_provision', // <--- This triggers the yellow card
                retell_agent_id: null, // Must be allowed by DB
                phone_number: null     // Must be allowed by DB
            };

            console.log("Payload:", payload);

            const { data, error } = await supabaseAdmin
                .from("ai_agents")
                .insert(payload)
                .select(); // Select returns the created row so we can see it

            if (error) {
                console.error("❌ DB Insert Failed:", error);
                // Return the specific DB error to the frontend for debugging
                return NextResponse.json({ error: `Database Error: ${error.message}` }, { status: 500 });
            }

            console.log("✅ Insert Successful:", data);
        }

        console.log("------------------------------------------------");
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: error.message || "Failed to save agent" }, { status: 500 });
    }
}