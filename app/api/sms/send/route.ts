import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import twilio from "twilio";
import { createClient } from "@/lib/supabase-server";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;

    try {
        const body = await request.json();
        const {
            name,
            message,
            audience,
            phone,
            includePaymentLink = false,
            callLogId,
            customerId
        } = body;

        // Look up merchant's phone number from ai_agents table (MULTI-TENANT)
        const { data: agent } = await supabaseAdmin
            .from("ai_agents")
            .select("phone_number")
            .eq("merchant_id", merchantId)
            .single();

        const fromNumber = agent?.phone_number || process.env.TWILIO_PHONE_NUMBER;

        if (!fromNumber) {
            return NextResponse.json({ error: "No phone number configured for this account" }, { status: 400 });
        }

        // 1. Determine Targets
        let targets = [];
        let isSingleMessage = false;

        if (phone) {
            // Direct single message (Reply or Call Follow-up)
            isSingleMessage = true;
            const { data: c } = await supabaseAdmin.from("customers").select("*").eq("phone_number", phone).single();
            targets = [{
                phone_number: phone,
                first_name: c?.first_name || "Customer",
                id: c?.id || customerId || null
            }];
        } else {
            // Bulk Campaign
            let query = supabaseAdmin.from("customers").select("id, phone_number, first_name").eq("merchant_id", merchantId);
            if (audience === "vip") query = query.gt("total_spend_cents", 50000);
            else if (audience === "recent") { /* Add date logic here */ }

            const { data: customers } = await query;
            if (!customers || customers.length === 0) return NextResponse.json({ error: "No audience found" }, { status: 400 });
            targets = customers.filter(c => c.phone_number && c.phone_number.length > 9);
        }

        // 2. Send via Twilio AND Save to DB
        let smsLogId = null;
        const promises = targets.map(async (c) => {
            let personalizedMsg = message.replace("{name}", c.first_name);

            // Add payment link if requested
            if (includePaymentLink) {
                const paymentLink = `${process.env.PAYMENT_LINK_BASE_URL || 'https://pay.example.com'}/${merchantId}`;
                personalizedMsg += `\n\nPay securely here: ${paymentLink}`;
            }

            // Add unsubscribe message (required for compliance)
            personalizedMsg += "\n\nReply STOP to unsubscribe.";

            // A. Send Text using merchant's phone number
            let twilioSid = null;
            let status = 'sent';
            try {
                const twilioMessage = await client.messages.create({
                    body: personalizedMsg,
                    from: fromNumber,
                    to: c.phone_number
                });
                twilioSid = twilioMessage.sid;
                status = twilioMessage.status === 'queued' || twilioMessage.status === 'sent' ? 'sent' : twilioMessage.status;
            } catch (err) {
                console.error(`Twilio failed for ${c.phone_number}`, err);
                status = 'failed';
            }

            // B. Save to appropriate table based on context
            if (isSingleMessage && callLogId) {
                // Save to sms_logs for call-related messages
                const { data: smsLog } = await supabaseAdmin.from("sms_logs").insert({
                    merchant_id: merchantId,
                    customer_id: c.id,
                    call_log_id: callLogId,
                    to_phone: c.phone_number,
                    message: personalizedMsg,
                    status: status,
                    twilio_sid: twilioSid,
                    included_payment_link: includePaymentLink
                }).select().single();

                if (smsLog) smsLogId = smsLog.id;
            } else {
                // Save to messages table for general chat history
                await supabaseAdmin.from("messages").insert({
                    merchant_id: merchantId,
                    customer_id: c.id,
                    direction: "outbound",
                    channel: "sms",
                    content: personalizedMsg,
                    status: status
                });
            }
        });

        await Promise.all(promises);

        // 3. Log Campaign (Only for bulk)
        if (!phone) {
            await supabaseAdmin.from("sms_campaigns").insert({
                merchant_id: merchantId,
                name: name,
                message_body: message,
                audience: audience,
                recipient_count: targets.length,
                status: "sent",
            });
        }

        return NextResponse.json({
            success: true,
            count: targets.length,
            smsLogId: smsLogId
        });

    } catch (error) {
        console.error("SMS Error:", error);
        return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
    }
}