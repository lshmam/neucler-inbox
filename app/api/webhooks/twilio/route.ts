import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const from = formData.get("From") as string;
        const body = formData.get("Body") as string;

        console.log(`📩 Inbound SMS from ${from}: ${body}`);

        // 1. Find Merchant (Improved Logic)
        // In Prod: Look up by Twilio Number. 
        // In Dev: Just grab the first merchant found to ensure it works.
        const { data: merchant } = await supabaseAdmin
            .from("merchants")
            .select("id, platform_merchant_id")
            .limit(1)
            .single();

        if (!merchant) {
            console.error("❌ No merchant found in DB to attach message to.");
            return NextResponse.json({ error: "No merchant" }, { status: 404 });
        }

        // 2. Find or Create Customer
        let { data: customer } = await supabaseAdmin
            .from("customers")
            .select("id")
            .eq("merchant_id", merchant.id)
            .eq("phone_number", from)
            .single();

        if (!customer) {
            // Create new customer
            const { data: newCustomer } = await supabaseAdmin
                .from("customers")
                .insert({
                    merchant_id: merchant.id,
                    phone_number: from,
                    first_name: "SMS",
                    last_name: "Contact"
                })
                .select("id")
                .single();
            customer = newCustomer;
            console.log(`👤 Created new customer for ${from}: ${customer?.id}`);
        }

        // 3. Save Message
        const { error } = await supabaseAdmin.from("messages").insert({
            merchant_id: merchant.platform_merchant_id,
            customer_id: customer?.id || null,
            direction: "inbound", // <--- Important: Marks it as gray bubble
            channel: "sms",
            content: body,
            status: "received",
            contact_phone: from
        });

        if (error) console.error("DB Insert Error:", error);

        // 4. Create or find ticket for this SMS conversation
        if (customer?.id) {
            // Check if there's an existing open SMS ticket for this customer
            const { data: existingTicket } = await supabaseAdmin
                .from("tickets")
                .select("id")
                .eq("merchant_id", merchant.id)
                .eq("customer_id", customer.id)
                .eq("source", "sms")
                .in("status", ["open", "in_progress", "pending"])
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (existingTicket) {
                console.log(`📋 Found existing SMS ticket: ${existingTicket.id}`);
                // Update ticket to show new activity
                await supabaseAdmin
                    .from("tickets")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", existingTicket.id);
            } else {
                // Create new ticket for this SMS conversation
                const newTicketId = crypto.randomUUID();
                const { error: ticketError } = await supabaseAdmin
                    .from("tickets")
                    .insert({
                        id: newTicketId,
                        merchant_id: merchant.id,
                        customer_id: customer.id,
                        title: `SMS from ${from}`,
                        description: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
                        status: "open",
                        priority: "medium",
                        source: "sms",
                        resolution_channel: "sms"
                    });

                if (ticketError) {
                    console.warn("⚠️ Failed to create SMS ticket:", ticketError.message);
                } else {
                    console.log(`🎫 New SMS ticket created: ${newTicketId}`);
                }
            }
        }

        return new NextResponse("<Response></Response>", {
            headers: { "Content-Type": "text/xml" },
        });

    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}