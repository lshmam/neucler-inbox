import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { twilioClient } from "@/lib/twilio";

export async function POST(request: Request) {
    const data = await request.formData();
    const dialStatus = data.get("DialCallStatus");
    const callerNumber = data.get("From") as string;
    const twilioNumber = data.get("To") as string;

    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");

    if (!merchantId) return new NextResponse("OK");

    if (dialStatus === "no-answer" || dialStatus === "busy" || dialStatus === "failed" || dialStatus === "canceled") {

        const { data: automation } = await supabaseAdmin
            .from("automations")
            .select("is_active, config")
            .eq("merchant_id", merchantId)
            .eq("type", "missed_call_sms")
            .single();

        if (automation?.is_active) {
            const { data: merchant } = await supabaseAdmin.from("merchants").select("business_name").eq("platform_merchant_id", merchantId).single();
            const businessName = merchant?.business_name || "Us";

            try {
                const message = automation.config?.message || "Sorry we missed your call! How can we help?";
                const fullMessage = `Hi, this is ${businessName}. ${message}`;

                // 1. Send SMS
                await twilioClient.messages.create({
                    body: fullMessage,
                    from: twilioNumber,
                    to: callerNumber
                });

                // 2. NEW: Save to Messages Table (For Inbox Visibility)
                await supabaseAdmin.from("messages").insert({
                    merchant_id: merchantId,
                    customer_phone: callerNumber,
                    direction: "outbound",
                    body: fullMessage,
                    status: "sent"
                });

                console.log("✅ Sent and Logged Missed Call SMS");
            } catch (error) {
                console.error("SMS Failed:", error);
            }
        }
    }

    return new NextResponse("OK");
}