import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const from = data.get("From") as string; // Customer phone
        const to = data.get("To") as string;     // Your AI Number
        const body = data.get("Body") as string; // The Message

        console.log(`📩 Incoming SMS from ${from} to ${to}: ${body}`);

        // 1. Try to find the Merchant based on the AI Number
        const { data: agent } = await supabaseAdmin
            .from("ai_agents")
            .select("merchant_id")
            .eq("phone_number", to)
            .single();

        let merchantId = agent?.merchant_id;

        // FALLBACK: If no agent found, use the first merchant (for development)
        if (!merchantId) {
            console.warn(`⚠️ No agent found for ${to}, using fallback merchant lookup`);
            const { data: firstMerchant } = await supabaseAdmin
                .from("merchants")
                .select("platform_merchant_id")
                .limit(1)
                .single();

            merchantId = firstMerchant?.platform_merchant_id;

            if (!merchantId) {
                console.error(`❌ No merchant found at all!`);
                return new NextResponse("<Response></Response>", {
                    headers: { "Content-Type": "text/xml" }
                });
            }
        }

        // 2. Save the message to DB
        const { data: message, error } = await supabaseAdmin.from("messages").insert({
            merchant_id: merchantId,
            customer_phone: from,
            direction: "inbound",
            body: body,
            status: "received",
            created_at: new Date().toISOString()
        }).select();

        if (error) {
            console.error("❌ Error saving message:", error);
        } else {
            console.log(`✅ Message saved to database:`, message);
        }

        // 3. Return XML (Twilio expects XML response)
        return new NextResponse("<Response></Response>", {
            headers: { "Content-Type": "text/xml" }
        });

    } catch (error) {
        console.error("❌ SMS Handler Error:", error);
        return new NextResponse("Error", { status: 500 });
    }
}