import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const from = formData.get('from') as string;
        const recipient = formData.get('recipient') as string;
        const subject = formData.get('subject') as string;
        const bodyPlain = formData.get('body-plain') as string;
        const bodyHtml = formData.get('body-html') as string;

        // --- FIX IS HERE: Correctly extract ID containing dashes ---
        // Input: reply-6350d386-2e55-4e8c...@domain.com

        // 1. Get the part before the @
        const localPart = recipient.split('@')[0];

        // 2. Remove the "reply-" prefix. What remains is the full ID.
        const merchantId = localPart.replace('reply-', '');

        if (!merchantId) {
            console.error("Could not extract merchantId from recipient:", recipient);
            return NextResponse.json({ error: "Invalid recipient format" }, { status: 400 });
        }
        // -----------------------------------------------------------

        // Find customer (Clean the email first to match correctly)
        // Mailgun sends "Name <email@domain.com>", we need just the email.
        const cleanEmail = from.match(/<(.+)>/)?.[1] || from;

        const { data: customer } = await supabaseAdmin
            .from("customers")
            .select("id")
            .eq("merchant_id", merchantId)
            .eq("email", cleanEmail)
            .single();

        const { error } = await supabaseAdmin.from("inbound_emails").insert({
            merchant_id: merchantId,
            customer_id: customer?.id || null,
            customer_email: from, // Save full string for display
            subject: subject,
            body_plain: bodyPlain,
            body_html: bodyHtml,
        });

        if (error) throw error;

        return NextResponse.json({ status: "success" });
    } catch (error) {
        console.error("Mailgun Inbound Error:", error);
        return NextResponse.json({ error: "Failed to process inbound email" }, { status: 500 });
    }
}