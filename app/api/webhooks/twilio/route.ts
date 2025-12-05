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
            .select("platform_merchant_id")
            .limit(1)
            .single();

        if (!merchant) {
            console.error("❌ No merchant found in DB to attach message to.");
            return NextResponse.json({ error: "No merchant" }, { status: 404 });
        }

        // 2. Find Customer
        const { data: customer } = await supabaseAdmin
            .from("customers")
            .select("id")
            .eq("phone_number", from)
            .single();

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

        return new NextResponse("<Response></Response>", {
            headers: { "Content-Type": "text/xml" },
        });

    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}