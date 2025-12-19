import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import twilio from "twilio";
import { analyzeTicket } from "@/services/quality-scoring";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

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
        if (!accountSid || !authToken) {
            console.error("❌ Missing Twilio credentials");
            return NextResponse.json({ error: "Twilio not configured" }, { status: 500 });
        }

        // Look up merchant's phone number from ai_agents table (MULTI-TENANT)
        const { data: agent } = await supabaseAdmin
            .from("ai_agents")
            .select("phone_number")
            .eq("merchant_id", merchantId)
            .single();

        const fromNumber = agent?.phone_number || process.env.TWILIO_PHONE_NUMBER;

        if (!fromNumber) {
            console.error("❌ No phone number configured for merchant:", merchantId);
            return NextResponse.json({ error: "No phone number configured. Please set up your AI Agent first." }, { status: 400 });
        }

        // Initialize Twilio client
        const client = twilio(accountSid, authToken);

        // Send SMS via Twilio using merchant's number
        console.log(`📤 Sending SMS from ${fromNumber} to ${phone}: ${message}`);
        const twilioMessage = await client.messages.create({
            from: fromNumber,
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

        // Update SMS ticket with first_response_at if this is the first reply
        // Find the customer first
        const { data: customer } = await supabaseAdmin
            .from("customers")
            .select("id")
            .eq("merchant_id", merchantId)
            .eq("phone_number", phone)
            .single();

        if (customer) {
            // Find open SMS ticket for this customer
            const { data: openTicket } = await supabaseAdmin
                .from("tickets")
                .select("id, first_response_at, status")
                .eq("merchant_id", merchantId)
                .eq("customer_id", customer.id)
                .eq("source", "sms")
                .in("status", ["open", "in_progress", "pending"])
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (openTicket) {
                // Update first_response_at if not set
                const updates: any = { updated_at: new Date().toISOString() };
                if (!openTicket.first_response_at) {
                    updates.first_response_at = new Date().toISOString();
                    console.log(`📋 Updating SMS ticket ${openTicket.id} with first_response_at`);
                }

                await supabaseAdmin
                    .from("tickets")
                    .update(updates)
                    .eq("id", openTicket.id);

                // Trigger async analysis of the SMS conversation
                // Fire-and-forget to not block the response
                analyzeTicket(openTicket.id, { channel: 'sms' })
                    .then(result => {
                        if (result.success) {
                            console.log(`✅ SMS ticket ${openTicket.id} analyzed:`, result.outcome, result.autoResolved ? '(auto-resolved)' : '');
                        }
                    })
                    .catch(err => console.error(`❌ SMS analysis failed:`, err.message));
            }
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