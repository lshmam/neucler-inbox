import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;
    if (!merchantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { name, message, audience, phone } = body;

        // 1. Determine Targets
        let targets = [];

        if (phone) {
            // Direct single message (Reply)
            // We try to find the customer to link the ID, but proceed even if not found
            const { data: c } = await supabaseAdmin.from("customers").select("*").eq("phone_number", phone).single();
            targets = [{
                phone_number: phone,
                first_name: c?.first_name || "Customer",
                id: c?.id || null
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
        const promises = targets.map(async (c) => {
            const personalizedMsg = message.replace("{name}", c.first_name);

            // A. Send Text
            try {
                await client.messages.create({
                    body: personalizedMsg,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: c.phone_number
                });
            } catch (err) {
                console.error(`Twilio failed for ${c.phone_number}`, err);
                return; // Skip DB insert if send failed
            }

            // B. Save to Chat History (The Missing Piece!)
            await supabaseAdmin.from("messages").insert({
                merchant_id: merchantId,
                customer_id: c.id, // Link to specific customer
                direction: "outbound",
                channel: "sms",
                content: personalizedMsg,
                status: "sent"
            });
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

        return NextResponse.json({ success: true, count: targets.length });

    } catch (error) {
        console.error("SMS Error:", error);
        return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
    }
}