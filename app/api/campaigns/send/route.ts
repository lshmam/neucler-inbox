import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { mg, DOMAIN } from "@/lib/mailgun";

export async function POST(request: Request) {
    console.log("🚀 [API] Starting Email Send Process...");

    // Get authenticated user using new auth system
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error("❌ [API] Auth error:", authError);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;
    console.log(`👤 [API] Authenticated Merchant ID: ${merchantId}`);

    try {
        const body = await request.json();
        const { subject, content, audience, title } = body;
        const fromEmail = process.env.NEXT_PUBLIC_FROM_EMAIL;

        if (!fromEmail || !DOMAIN) {
            console.error("❌ [API] Missing Config: FROM_EMAIL or DOMAIN");
            return NextResponse.json({ error: "Server config error" }, { status: 500 });
        }

        // --- STEP 1: CREATE CAMPAIGN IN DB FIRST ---
        console.log("📝 [API] Step 1: Creating Campaign Record...");
        const { data: campaign, error: insertError } = await supabaseAdmin
            .from("email_campaigns")
            .insert({
                merchant_id: merchantId,
                name: title,
                subject: subject,
                body: content,
                audience: audience,
                status: "sending",
                sent_count: 0
            })
            .select()
            .single();

        if (insertError) {
            console.error("❌ [API] DB Insert Error:", insertError);
            throw new Error("Could not create campaign record in database.");
        }
        console.log(`✅ [API] Campaign Created. ID: ${campaign.id}`);

        // --- STEP 2: Fetch Merchant Info ---
        const { data: merchant } = await supabaseAdmin
            .from("merchants")
            .select("business_name, email")
            .eq("id", merchantId)
            .single();

        if (!merchant) throw new Error("Merchant not found");

        // --- STEP 3: Fetch Audience ---
        console.log("👥 [API] Step 3: Fetching Audience...");
        let query = supabaseAdmin
            .from("customers")
            .select("id, email, first_name")
            .eq("merchant_id", merchantId)
            .neq("email", null)
            .or('is_subscribed.is.null,is_subscribed.eq.true');

        if (audience === "vip") {
            query = query.gt("total_spend_cents", 50000);
        }

        const { data: customers } = await query;

        if (!customers || customers.length === 0) {
            console.warn("⚠️ [API] No recipients found.");
            await supabaseAdmin.from("email_campaigns").update({ status: 'failed', sent_count: 0 }).eq('id', campaign.id);
            return NextResponse.json({ error: "No subscribed recipients found." }, { status: 400 });
        }
        console.log(`✅ [API] Found ${customers.length} recipients.`);

        // --- STEP 4: Prepare Mailgun Data ---
        const recipients: string[] = [];
        const recipientVariables: Record<string, any> = {};

        // Prepare data for our new table
        const recipientLogData: {
            merchant_id: string;
            campaign_id: any;
            customer_id: any;
            customer_email: string;
        }[] = [];

        customers.forEach(c => {
            if (c.email) {
                recipients.push(c.email);
                recipientVariables[c.email] = { name: c.first_name || "there" };

                recipientLogData.push({
                    merchant_id: merchantId,
                    campaign_id: campaign.id,
                    customer_id: c.id,
                    customer_email: c.email
                });
            }
        });

        const replyToAddress = `reply-${merchantId}@mail.neucler.com`;

        const messageData = {
            from: `${merchant.business_name} <hello@mail.neucler.com>`,
            to: recipients,
            'recipient-variables': JSON.stringify(recipientVariables),
            'h:Reply-To': replyToAddress,
            subject: subject,
            // CRITICAL DEBUG: Verify these values in your terminal when you send!
            'v:campaign_id': campaign.id,
            'o:tracking': 'yes',
            'o:tracking-opens': 'yes',
            'o:tracking-clicks': 'yes',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; color: #333; line-height: 1.6;">
                    <p>Hi %recipient.name%,</p> 
                    <div style="margin: 20px 0; white-space: pre-wrap; font-size: 16px;">${content}</div>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #888;">
                      Sent by ${merchant.business_name} • Powered by Neucler
                      <br/>
                      <a href="%unsubscribe_url%" style="color: #888; text-decoration: underline;">Unsubscribe</a>
                    </p>
                </div>
            `
        };

        // --- STEP 5: Send via Mailgun ---
        console.log("📨 [API] Sending to Mailgun with Config:", {
            from: messageData.from,
            replyTo: messageData['h:Reply-To'],
            campaignId: messageData['v:campaign_id'], // This MUST NOT be undefined
            tracking: messageData['o:tracking']
        });

        // Store the result to log it
        const msgResult = await mg.messages.create(DOMAIN, messageData as any);
        console.log("✅ [API] Mailgun Accepted Request:", msgResult);

        // --- STEP 6: Update Campaign Status and Count ---
        await supabaseAdmin
            .from("email_campaigns")
            .update({ status: 'sent', sent_count: recipients.length })
            .eq('id', campaign.id);

        // --- NEW STEP 7: Save Recipient Log ---
        if (recipientLogData.length > 0) {
            const { error: logError } = await supabaseAdmin
                .from("campaign_recipients")
                .insert(recipientLogData);

            if (logError) console.error("❌ [API] Failed to log recipients:", logError);
            else console.log("✅ [API] Recipients Logged to DB.");
        }

        return NextResponse.json({ success: true, count: recipients.length });

    } catch (error: any) {
        console.error("💥 [API] Critical Email Error:", error);
        return NextResponse.json({ error: error.message || "Failed to send" }, { status: 500 });
    }
}