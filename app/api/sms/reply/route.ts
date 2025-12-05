import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

export async function POST(request: Request) {
    try {
        const { phone, message } = await request.json();

        if (!phone || !message) {
            return NextResponse.json({ error: "Missing phone or message" }, { status: 400 });
        }

        // Get authenticated merchant using new auth system
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error("Auth error:", authError);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const merchantId = user.id; // Using user.id directly

        // Validate Twilio credentials
        if (!accountSid || !authToken || !twilioNumber) {
            console.error("❌ Missing Twilio credentials");
            return NextResponse.json({ error: "Twilio not configured" }, { status: 500 });
        }

        // Initialize Twilio client
        const client = twilio(accountSid, authToken);

        // Send SMS via Twilio
        console.log(`📤 Sending SMS to ${phone}: ${message}`);
        const twilioMessage = await client.messages.create({
            from: twilioNumber,
            to: phone,
            body: message
        });

        console.log(`✅ SMS sent via Twilio: ${twilioMessage.sid}`);

        // Save outbound message to database using supabaseAdmin to bypass RLS
        const { data: savedMessage, error: dbError } = await supabaseAdmin
            .from("messages")
            .insert({
                merchant_id: merchantId,
                customer_phone: phone,
                direction: "outbound",
                body: message,
                status: "sent",
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (dbError) {
            console.error("❌ Error saving message to DB:", dbError);
            // Still return success since Twilio sent it
        } else {
            console.log(`✅ Message saved to database:`, savedMessage);
        }

        return NextResponse.json({
            success: true,
            twilioSid: twilioMessage.sid,
            message: savedMessage
        });

    } catch (error: any) {
        console.error("❌ Error sending SMS:", error);
        return NextResponse.json({
            error: error.message || "Failed to send SMS"
        }, { status: 500 });
    }
}