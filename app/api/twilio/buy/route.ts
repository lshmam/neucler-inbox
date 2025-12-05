import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;

    // 1. Buy Number
    const { phoneNumber } = await request.json();

    try {
        // WARNING: THIS COSTS MONEY ($1) ON TWILIO. 
        // Uncomment in production:
        // const purchased = await client.incomingPhoneNumbers.create({ phoneNumber });
        // const sid = purchased.sid;

        // Mock success for development
        const sid = "PN_MOCK_" + Math.random().toString(36).substring(7);

        // 2. Save to DB
        await supabaseAdmin.from("ai_agents").update({
            phone_number: phoneNumber,
            twilio_sid: sid
        }).eq("merchant_id", merchantId);

        return NextResponse.json({ success: true });

    } catch (e) {
        return NextResponse.json({ error: "Failed to buy number" }, { status: 500 });
    }
}