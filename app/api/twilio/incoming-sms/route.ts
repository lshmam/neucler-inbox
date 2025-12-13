import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateAIReply, isAutoReplyEnabled } from "@/lib/gemini-chat";
import twilio from "twilio";

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: Request) {
    console.log("\n========================================");
    console.log("📩 INCOMING SMS WEBHOOK");
    console.log("========================================");

    try {
        const data = await request.formData();
        const from = data.get("From") as string; // Customer phone
        const to = data.get("To") as string;     // Your AI Number
        const body = data.get("Body") as string; // The Message

        console.log(`📩 SMS Details:`);
        console.log(`   From: ${from}`);
        console.log(`   To: ${to}`);
        console.log(`   Body: ${body}`);

        // 1. Try to find the Merchant based on the AI Number
        console.log(`\n🔍 Looking for agent with phone_number: "${to}"`);

        const { data: agent, error: agentError } = await supabaseAdmin
            .from("ai_agents")
            .select("merchant_id, phone_number")
            .eq("phone_number", to)
            .single();

        console.log(`   Agent found: ${!!agent}`);
        if (agentError) console.log(`   Agent lookup error: ${agentError.message}`);
        if (agent) console.log(`   Agent merchant_id: ${agent.merchant_id}`);

        let merchantId = agent?.merchant_id;

        // FALLBACK: If no agent found, use the first merchant (for development)
        if (!merchantId) {
            console.warn(`⚠️ No agent found for ${to}, using fallback merchant lookup`);
            const { data: firstMerchant } = await supabaseAdmin
                .from("merchants")
                .select("id")
                .limit(1)
                .single();

            merchantId = firstMerchant?.id;

            if (!merchantId) {
                console.error(`❌ No merchant found at all!`);
                return new NextResponse("<Response></Response>", {
                    headers: { "Content-Type": "text/xml" }
                });
            }
        }

        // 2. Find or create customer
        let customerId: string | null = null;
        const { data: existingCustomer } = await supabaseAdmin
            .from("customers")
            .select("id")
            .eq("merchant_id", merchantId)
            .eq("phone_number", from)
            .single();

        if (existingCustomer) {
            customerId = existingCustomer.id;
        } else {
            // Create new customer
            const { data: newCustomer } = await supabaseAdmin
                .from("customers")
                .insert({
                    id: crypto.randomUUID(),
                    merchant_id: merchantId,
                    phone_number: from,
                    first_name: "Unknown",
                    last_name: "Caller"
                })
                .select("id")
                .single();
            customerId = newCustomer?.id || null;
        }

        // 3. Save the inbound message to DB
        const { error } = await supabaseAdmin.from("messages").insert({
            merchant_id: merchantId,
            customer_id: customerId,
            customer_phone: from,
            direction: "inbound",
            body: body,
            channel: "sms",
            status: "received",
            created_at: new Date().toISOString()
        });

        if (error) {
            console.error("❌ Error saving message:", error);
        } else {
            console.log(`✅ Inbound SMS saved to database`);
        }

        // 4. Check if AI Auto-Reply is enabled
        console.log(`\n🤖 Checking AI Auto-Reply status for merchant: ${merchantId}`);
        const autoReplyEnabled = await isAutoReplyEnabled(merchantId, 'sms');
        console.log(`   Auto-reply enabled: ${autoReplyEnabled}`);

        if (autoReplyEnabled) {
            console.log(`✅ AI Auto-Reply IS ENABLED - proceeding with reply generation`);
        } else {
            console.log(`⚠️ AI Auto-Reply is DISABLED or not configured`);
            console.log(`   To enable: Go to Inbox and toggle 'AI Auto-Reply' switch ON`);
        }

        if (autoReplyEnabled) {

            // Get recent conversation history (last 5 messages)
            const { data: recentMessages } = await supabaseAdmin
                .from("messages")
                .select("direction, body")
                .eq("merchant_id", merchantId)
                .eq("customer_phone", from)
                .order("created_at", { ascending: false })
                .limit(5);

            const history = (recentMessages || []).reverse().map(m => ({
                role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
                content: m.body
            }));

            // Generate AI reply
            const aiResult = await generateAIReply(merchantId, body, history, 'sms');

            if (aiResult.success && aiResult.reply) {
                // Get the merchant's Twilio number
                const { data: agentData } = await supabaseAdmin
                    .from("ai_agents")
                    .select("phone_number")
                    .eq("merchant_id", merchantId)
                    .single();

                const fromNumber = agentData?.phone_number || to;

                // Send via Twilio
                try {
                    await twilioClient.messages.create({
                        body: aiResult.reply,
                        from: fromNumber,
                        to: from
                    });
                    console.log(`✅ AI reply sent to ${from}`);

                    // Save the outbound message
                    await supabaseAdmin.from("messages").insert({
                        merchant_id: merchantId,
                        customer_id: customerId,
                        customer_phone: from,
                        direction: "outbound",
                        body: aiResult.reply,
                        channel: "sms",
                        status: "sent",
                        created_at: new Date().toISOString()
                    });

                    // If AI needs human help, add tag to customer
                    if (aiResult.needsHuman && customerId) {
                        const { data: customer } = await supabaseAdmin
                            .from("customers")
                            .select("tags")
                            .eq("id", customerId)
                            .single();

                        const currentTags = customer?.tags || [];
                        if (!currentTags.includes('needs_human')) {
                            await supabaseAdmin
                                .from("customers")
                                .update({
                                    tags: [...currentTags, 'needs_human'],
                                    status: 'needs_attention'
                                })
                                .eq("id", customerId);
                            console.log(`🏷️ Added 'needs_human' tag to customer ${customerId}`);
                        }
                    }
                } catch (twilioError) {
                    console.error("❌ Twilio send error:", twilioError);
                }
            } else if (aiResult.limitReached) {
                console.log(`⚠️ AI reply limit reached for ${merchantId}`);
            }
        }

        // 5. Return XML (Twilio expects XML response)
        console.log(`\n✅ SMS webhook completed successfully`);
        console.log("========================================\n");
        return new NextResponse("<Response></Response>", {
            headers: { "Content-Type": "text/xml" }
        });

    } catch (error) {
        console.error("❌ SMS Handler Error:", error);
        return new NextResponse("Error", { status: 500 });
    }
}