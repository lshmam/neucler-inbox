import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from 'crypto';

const SIGNING_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

const verifyMailgunSignature = (token: string, timestamp: string, signature: string) => {
    if (!SIGNING_KEY) {
        console.warn("⚠️ NO SIGNING KEY FOUND");
        return true;
    }
    const encodedToken = crypto.createHmac('sha256', SIGNING_KEY).update(timestamp.concat(token)).digest('hex');
    return encodedToken === signature;
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { signature, 'event-data': eventData } = body;

        console.log(`📧 Webhook received: ${eventData.event} for ${eventData.recipient}`);

        // 1. Verify Security
        if (!verifyMailgunSignature(signature.token, signature.timestamp, signature.signature)) {
            console.error("❌ Invalid Signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // 2. Extract Data
        const campaignId = eventData['user-variables']?.campaign_id;
        const recipientEmail = eventData.recipient;
        const eventType = eventData.event;

        if (!campaignId) {
            console.log("⚠️ No Campaign ID. Ignored.");
            return NextResponse.json({ status: "ignored" });
        }

        // 3. Determine which column to increment
        let columnToIncrement = "";
        let checkUniqueness = false;

        switch (eventType) {
            case 'delivered':
                columnToIncrement = 'delivered_count';
                break;
            case 'opened':
                columnToIncrement = 'open_count';
                checkUniqueness = true;
                break;
            case 'clicked':
                columnToIncrement = 'click_count';
                checkUniqueness = true;
                break;
            case 'failed':
            case 'bounced':
                columnToIncrement = 'failure_count';
                break;
            case 'complained':
                columnToIncrement = 'complaint_count';
                break;
        }

        if (columnToIncrement) {
            // 4. Check for duplicates if needed (for opens/clicks)
            if (checkUniqueness) {
                const { error: logError } = await supabaseAdmin
                    .from('email_events_log')
                    .insert({
                        campaign_id: campaignId,
                        recipient_email: recipientEmail,
                        event_type: eventType
                    });

                if (logError && logError.code === '23505') {
                    console.log(`⚠️ Duplicate ${eventType} for ${recipientEmail} - ignored`);
                    return NextResponse.json({ status: "duplicate_ignored" });
                }
            }

            // 5. Increment the counter directly
            const { data: campaign, error: fetchError } = await supabaseAdmin
                .from('email_campaigns')
                .select(columnToIncrement)
                .eq('id', campaignId)
                .single();

            if (fetchError || !campaign) {
                console.error("❌ Campaign not found:", fetchError);
                return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
            }

            const currentValue = campaign[columnToIncrement] || 0;
            const { error: updateError } = await supabaseAdmin
                .from('email_campaigns')
                .update({ [columnToIncrement]: currentValue + 1 })
                .eq('id', campaignId);

            if (updateError) {
                console.error("❌ Update Error:", updateError);
                return NextResponse.json({ error: "DB Error" }, { status: 500 });
            }

            console.log(`✅ ${eventType}: Incremented ${columnToIncrement} to ${currentValue + 1}`);
        }

        return NextResponse.json({ status: "success" });

    } catch (error) {
        console.error("💥 Webhook Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}