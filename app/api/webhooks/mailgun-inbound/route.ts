import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateAIReply, isAutoReplyEnabled } from "@/lib/gemini-chat";
import { mg, DOMAIN } from "@/lib/mailgun";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const from = formData.get('from') as string;
        const recipient = formData.get('recipient') as string;
        const subject = formData.get('subject') as string;
        const bodyPlain = formData.get('body-plain') as string;
        const bodyHtml = formData.get('body-html') as string;

        // Extract merchant ID from recipient (reply-{merchantId}@domain.com)
        const localPart = recipient.split('@')[0];
        const merchantId = localPart.replace('reply-', '');

        if (!merchantId) {
            console.error("Could not extract merchantId from recipient:", recipient);
            return NextResponse.json({ error: "Invalid recipient format" }, { status: 400 });
        }

        console.log(`📧 Incoming email from ${from} for merchant ${merchantId}`);

        // Clean the email to match in DB
        const cleanEmail = from.match(/<(.+)>/)?.[1] || from;

        // Find customer
        const { data: customer } = await supabaseAdmin
            .from("customers")
            .select("id, first_name")
            .eq("merchant_id", merchantId)
            .eq("email", cleanEmail)
            .single();

        // Save inbound email
        const { error } = await supabaseAdmin.from("inbound_emails").insert({
            merchant_id: merchantId,
            customer_id: customer?.id || null,
            customer_email: from,
            subject: subject,
            body_plain: bodyPlain,
            body_html: bodyHtml,
        });

        if (error) {
            console.error("Error saving email:", error);
            throw error;
        }

        console.log("✅ Inbound email saved");

        // Check if AI Auto-Reply is enabled
        const autoReplyEnabled = await isAutoReplyEnabled(merchantId, 'email');

        if (autoReplyEnabled && bodyPlain) {
            console.log(`🤖 AI Auto-Reply (email) enabled for ${merchantId}`);

            // Generate AI reply
            const aiResult = await generateAIReply(merchantId, bodyPlain, [], 'email');

            if (aiResult.success && aiResult.reply) {
                // Get merchant info for email
                const { data: merchant } = await supabaseAdmin
                    .from("merchants")
                    .select("business_name")
                    .eq("id", merchantId)
                    .single();

                const { data: profile } = await supabaseAdmin
                    .from("business_profiles")
                    .select("ai_name")
                    .eq("merchant_id", merchantId)
                    .single();

                const aiName = profile?.ai_name || "Support";
                const businessName = merchant?.business_name || "Our Team";

                // Send reply via Mailgun
                try {
                    await mg.messages.create(DOMAIN!, {
                        from: `${aiName} <reply-${merchantId}@${DOMAIN}>`,
                        to: cleanEmail,
                        subject: `Re: ${subject}`,
                        text: aiResult.reply,
                        html: `
                            <div style="font-family: -apple-system, system-ui, sans-serif; color: #333; line-height: 1.6;">
                                <p>${aiResult.reply.replace(/\n/g, '<br>')}</p>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                                <p style="color: #666; font-size: 12px;">
                                    ${aiName} - ${businessName}
                                </p>
                            </div>
                        `
                    });

                    console.log(`✅ AI email reply sent to ${cleanEmail}`);
                } catch (mailError) {
                    console.error("❌ Mailgun send error:", mailError);
                }
            } else if (aiResult.limitReached) {
                console.log(`⚠️ AI reply limit reached for ${merchantId}`);
            }
        }

        return NextResponse.json({ status: "success" });
    } catch (error) {
        console.error("Mailgun Inbound Error:", error);
        return NextResponse.json({ error: "Failed to process inbound email" }, { status: 500 });
    }
}