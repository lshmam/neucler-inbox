"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { twilioClient } from "@/lib/twilio";

export async function sendSmsReply(merchantId: string, to: string, body: string) {
    // 1. Get the Sender Number (Agent Number)
    const { data: agent } = await supabaseAdmin
        .from("ai_agents")
        .select("phone_number")
        .eq("merchant_id", merchantId)
        .single();

    if (!agent?.phone_number) throw new Error("No phone number configured");

    // 2. Send via Twilio
    await twilioClient.messages.create({
        body: body,
        from: agent.phone_number,
        to: to
    });

    // 3. Log to DB
    await supabaseAdmin.from("messages").insert({
        merchant_id: merchantId,
        customer_phone: to,
        direction: "outbound",
        body: body,
        status: "sent"
    });
}