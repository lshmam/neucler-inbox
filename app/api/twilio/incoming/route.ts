import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export async function POST(request: Request) {
    const data = await request.formData();
    const calledTwilioNumber = data.get("To") as string;

    // 1. Find the Merchant based on the Twilio Number they called
    const { data: agent } = await supabaseAdmin
        .from("ai_agents")
        .select("merchant_id")
        .eq("phone_number", calledTwilioNumber)
        .single();

    const response = new VoiceResponse();

    if (!agent) {
        response.say("This number is not active.");
        return new NextResponse(response.toString(), { headers: { "Content-Type": "text/xml" } });
    }

    // 2. Get the Business Owner's Real Number
    const { data: profile } = await supabaseAdmin
        .from("business_profiles")
        .select("phone") // This is the 'Forwarding Destination'
        .eq("merchant_id", agent.merchant_id)
        .single();

    if (!profile?.phone) {
        response.say("No forwarding number configured.");
    } else {
        // 3. DIAL THE BUSINESS
        // 'action' tells Twilio to hit the status route when the call ends
        // 'timeout' is how long to ring the business (20s) before giving up
        const dial = response.dial({
            action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status?merchantId=${agent.merchant_id}`,
            timeout: 20,
            callerId: calledTwilioNumber // Shows up as the Business Line on the owner's phone
        });
        dial.number(profile.phone);
    }

    return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" }
    });
}