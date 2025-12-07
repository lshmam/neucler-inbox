import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateAIReply } from "@/lib/gemini-chat";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { merchantId, message, history, leadInfo } = body;

        if (!merchantId || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let customerId: string | null = null;

        // 1. If leadInfo provided, find or create customer
        if (leadInfo?.phone) {
            let normalizedPhone = leadInfo.phone.replace(/\D/g, "");
            if (normalizedPhone.length === 10) {
                normalizedPhone = "+1" + normalizedPhone;
            } else if (!normalizedPhone.startsWith("+")) {
                normalizedPhone = "+" + normalizedPhone;
            }

            // Check if customer exists
            const { data: existingCustomer } = await supabaseAdmin
                .from("customers")
                .select("id")
                .eq("merchant_id", merchantId)
                .eq("phone_number", normalizedPhone)
                .single();

            if (existingCustomer) {
                customerId = existingCustomer.id;
            } else {
                // Create new customer
                const nameParts = (leadInfo.fullName || "").trim().split(" ");
                const firstName = nameParts[0] || "Unknown";
                const lastName = nameParts.slice(1).join(" ") || "";

                const { data: newCustomer, error: createError } = await supabaseAdmin
                    .from("customers")
                    .insert({
                        id: crypto.randomUUID(),
                        merchant_id: merchantId,
                        phone_number: normalizedPhone,
                        email: leadInfo.email || null,
                        first_name: firstName,
                        last_name: lastName,
                        created_at: new Date().toISOString()
                    })
                    .select("id")
                    .single();

                if (createError) {
                    console.error("Failed to create customer:", createError);
                } else {
                    customerId = newCustomer?.id || null;
                }
            }
        }

        // 2. Build conversation history
        const previousMessages = Array.isArray(history) ? history.slice(-5) : [];
        const formattedHistory = previousMessages.map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        }));

        // 3. Generate AI reply using Gemini
        const aiResult = await generateAIReply(merchantId, message, formattedHistory, 'widget');

        let reply = "I'm sorry, I'm having trouble responding right now. Please try again shortly.";

        if (aiResult.success && aiResult.reply) {
            reply = aiResult.reply;
        } else if (aiResult.limitReached) {
            reply = "Thanks for your message! Our team will get back to you shortly.";
            console.log(`⚠️ Widget AI limit reached for ${merchantId}`);
        }

        // 4. Save messages to database
        if (customerId && leadInfo?.phone) {
            let normalizedPhone = leadInfo.phone.replace(/\D/g, "");
            if (normalizedPhone.length === 10) {
                normalizedPhone = "+1" + normalizedPhone;
            } else if (!normalizedPhone.startsWith("+")) {
                normalizedPhone = "+" + normalizedPhone;
            }

            // Save user message
            const userMsgData = {
                merchant_id: merchantId,
                customer_id: customerId,
                customer_phone: normalizedPhone,
                direction: "inbound",
                body: message,
                channel: "widget",
                status: "received",
                session_id: leadInfo.sessionId || null
            };

            let { error: userMsgErr } = await supabaseAdmin.from("messages").insert(userMsgData);

            if (userMsgErr) {
                console.error("❌ Failed to save user message (attempt 1):", userMsgErr);
                const { session_id, ...retryData } = userMsgData;
                const { error: retryErr } = await supabaseAdmin.from("messages").insert(retryData);
                userMsgErr = retryErr;

                if (userMsgErr) console.error("❌ Failed to save user message (attempt 2):", userMsgErr);
                else console.log("✅ Saved user widget message (retry success)");
            } else {
                console.log("✅ Saved user widget message");
            }

            // Save AI reply
            if (reply) {
                const aiMsgData = {
                    merchant_id: merchantId,
                    customer_id: customerId,
                    customer_phone: normalizedPhone,
                    direction: "outbound",
                    body: reply,
                    channel: "widget",
                    status: "sent",
                    session_id: leadInfo.sessionId || null
                };

                let { error: aiMsgErr } = await supabaseAdmin.from("messages").insert(aiMsgData);

                if (aiMsgErr) {
                    console.error("❌ Failed to save AI message (attempt 1):", aiMsgErr);
                    const { session_id, ...retryData } = aiMsgData;
                    const { error: retryErr } = await supabaseAdmin.from("messages").insert(retryData);
                    aiMsgErr = retryErr;

                    if (aiMsgErr) console.error("❌ Failed to save AI message (attempt 2):", aiMsgErr);
                    else console.log("✅ Saved AI widget message (retry success)");
                }
            }
        }

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error("❌ Chat API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
