import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { twilioClient } from "@/lib/twilio"; // Ensure this matches your file structure

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;
    if (!merchantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { name, audience, message } = await request.json();

        // 1. Get Sender Number (From AI Agent Config)
        const { data: agent } = await supabaseAdmin
            .from("ai_agents")
            .select("phone_number")
            .eq("merchant_id", merchantId)
            .single();

        if (!agent?.phone_number) {
            return NextResponse.json({ error: "No SMS number found. Please configure your AI Agent first." }, { status: 400 });
        }

        // 2. Get Merchant Name (For Prefix)
        const { data: merchant } = await supabaseAdmin
            .from("merchants")
            .select("business_name")
            .eq("platform_merchant_id", merchantId)
            .single();

        // 3. Fetch Audience
        let query = supabaseAdmin
            .from("customers")
            .select("phone_number, first_name")
            .eq("merchant_id", merchantId)
            .neq("phone_number", null); // Ensure not null

        if (audience === "vip") {
            // Check if you actually have this column in your DB, otherwise remove this line
            query = query.gt("total_spend_cents", 50000);
        }

        const { data: customers } = await query;

        if (!customers || customers.length === 0) {
            return NextResponse.json({ error: "No valid customers found for this audience." }, { status: 400 });
        }

        // 4. Construct Message
        const businessName = merchant?.business_name || "Us";
        const prefix = `Hi %Name%, this is ${businessName}.`;
        const suffix = `\nReply STOP to opt out.`; // Good compliance practice
        const fullTemplate = `${prefix} ${message} ${suffix}`;

        // 5. Send Loop
        // Filter out bad numbers first
        const validCustomers = customers.filter(c => c.phone_number && c.phone_number.length >= 10);
        let sentCount = 0;

        const promises = validCustomers.map(async (c) => {
            const personalizedBody = fullTemplate.replace("%Name%", c.first_name || "there");

            try {
                await twilioClient.messages.create({
                    body: personalizedBody,
                    from: agent.phone_number,
                    to: c.phone_number
                });

                // Log to Messages table (So it shows in Inbox)
                await supabaseAdmin.from("messages").insert({
                    merchant_id: merchantId,
                    customer_phone: c.phone_number,
                    direction: "outbound",
                    body: personalizedBody,
                    status: "sent",
                    created_at: new Date().toISOString()
                });

                sentCount++;
            } catch (err) {
                console.error(`Failed to send to ${c.phone_number}`, err);
            }
        });

        await Promise.all(promises);

        // 6. Log Campaign & RETURN IT (Crucial Step)
        const { data: campaign, error: insertError } = await supabaseAdmin
            .from("sms_campaigns")
            .insert({
                merchant_id: merchantId,
                name: name,
                message_body: message, // Log original message
                audience: audience,
                status: "sent",
                recipient_count: sentCount,
                created_at: new Date().toISOString()
            })
            .select() // <--- THIS IS REQUIRED to get the ID back
            .single();

        if (insertError) {
            console.error("DB Insert Error:", insertError);
            // Even if DB log fails, messages were sent, so returns success but no campaign object
            return NextResponse.json({ success: true, count: sentCount });
        }

        // Return 'campaign' so the frontend can update the list immediately
        return NextResponse.json({ success: true, campaign });

    } catch (error: any) {
        console.error("Broadcast Error:", error);
        return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 });
    }
}