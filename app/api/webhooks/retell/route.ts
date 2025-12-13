import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";
import { GoogleGenerativeAI } from '@google/generative-ai';
import twilio from "twilio";
import { createSmartLinkServer } from "@/app/actions/links-server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const eventType = body.event;

        // Extract call data based on event type
        let call;
        if (eventType === "call_inbound") {
            call = body.call_inbound;
        } else {
            call = body.call;
        }

        // === DETAILED LOGGING START ===
        console.log("\n========================================");
        console.log("📞 RETELL WEBHOOK RECEIVED");
        console.log("========================================");
        console.log("Event Type:", eventType);
        console.log("Full Payload:", JSON.stringify(body, null, 2));
        console.log("Call Object:", JSON.stringify(call, null, 2));
        console.log("========================================\n");

        // For call_inbound, we only have agent_id (no call_id yet)
        if (eventType === "call_inbound") {
            if (!call || !call.agent_id) {
                console.log("⚠️ EARLY EXIT: Missing required call_inbound data");
                console.log("- call exists:", !!call);
                console.log("- agent_id exists:", !!call?.agent_id);
                return NextResponse.json({ status: "ignored_missing_data" });
            }
            // For inbound calls, we don't have a call_id yet, so just log and return
            console.log("✅ call_inbound received for agent:", call.agent_id);
            console.log("   From:", call.from_number, "To:", call.to_number);
            return NextResponse.json({ status: "call_inbound_received" });
        }

        // For other events, we need both call_id and agent_id
        if (!call || !call.call_id || !call.agent_id) {
            console.log("⚠️ EARLY EXIT: Missing required call data");
            console.log("- call exists:", !!call);
            console.log("- call_id exists:", !!call?.call_id);
            console.log("- agent_id exists:", !!call?.agent_id);
            return NextResponse.json({ status: "ignored_missing_data" });
        }

        const { call_id: retellCallId, agent_id: retellAgentId } = call;
        console.log(`\n🔍 Looking for agent with retell_agent_id: "${retellAgentId}"`);

        // --- FIX #1: THE HARDENED AGENT LOOKUP ---
        // Fetch all agents and then find the match in code, trimming whitespace.
        const { data: allAgents } = await supabaseAdmin
            .from("ai_agents")
            .select("id, merchant_id, retell_agent_id, phone_number");

        console.log(`📊 Found ${allAgents?.length || 0} agents in database:`);
        allAgents?.forEach((a, idx) => {
            console.log(`  [${idx}] ID: ${a.id}, retell_agent_id: "${a.retell_agent_id}", merchant: ${a.merchant_id}`);
        });

        const agent = allAgents?.find(
            (a) => a.retell_agent_id && a.retell_agent_id.trim() === retellAgentId.trim()
        );
        // -----------------------------------------

        if (!agent) {
            console.error(`\n❌ AGENT NOT FOUND`);
            console.error(`Looking for: "${retellAgentId}"`);
            console.error("Available agent IDs in DB:", allAgents?.map(a => `"${a.retell_agent_id}"`));
            return NextResponse.json({ status: "error_agent_not_found" });
        }

        console.log(`✅ Matched! Agent UUID: ${agent.id}, Merchant: ${agent.merchant_id}\n`);

        // --- FIX #2: THE RELIABLE INSERT/UPDATE LOGIC ---
        console.log(`💾 Attempting INSERT for call: ${retellCallId}`);
        const insertData = {
            retell_call_id: retellCallId,
            merchant_id: agent.merchant_id,
            agent_id: agent.id,
            direction: call.direction,
            customer_phone: call.direction === 'inbound' ? call.from_number : call.to_number,
            status: 'in-progress'
        };
        console.log("Insert Data:", JSON.stringify(insertData, null, 2));

        const { error: insertError } = await supabaseAdmin
            .from("call_logs")
            .insert(insertData);

        if (insertError) {
            if (insertError.code === '23505') {
                console.log("⚠️ Duplicate key (expected for updates) - continuing...");
            } else {
                console.error("💥 SUPABASE INSERT FAILED:", insertError);
                throw new Error(`Supabase INSERT error: ${insertError.message}`);
            }
        } else {
            console.log("✅ INSERT successful!");
        }

        // --- AUTO-CREATE CUSTOMER IF NEW CALLER ---
        try {
            const customerPhone = insertData.customer_phone;

            if (customerPhone) {
                console.log(`\n👤 Checking if customer exists: ${customerPhone}`);

                // Check if customer already exists
                const { data: existingCustomer } = await supabaseAdmin
                    .from('customers')
                    .select('id')
                    .eq('merchant_id', agent.merchant_id)
                    .eq('phone_number', customerPhone)
                    .single();

                if (!existingCustomer) {
                    console.log(`📝 Customer not found. Creating new customer...`);

                    // Create new customer
                    const newCustomerId = crypto.randomUUID();
                    const { error: customerError } = await supabaseAdmin
                        .from('customers')
                        .insert({
                            id: newCustomerId,
                            merchant_id: agent.merchant_id,
                            phone_number: customerPhone,
                            first_name: 'Unknown Caller',
                            last_name: '',
                            email: null,
                            created_at: new Date().toISOString(),
                            total_spend_cents: 0,
                            visit_count: 1,
                            is_subscribed: true
                        });

                    if (customerError) {
                        console.warn('⚠️ Failed to create customer:', customerError.message);
                        // Don't throw - continue processing the call even if customer creation fails
                    } else {
                        console.log(`✅ New customer created successfully! ID: ${newCustomerId}`);
                    }
                } else {
                    console.log(`📋 Existing customer found: ${existingCustomer.id}`);
                }
            }
        } catch (customerCreationError: any) {
            console.warn('⚠️ Customer creation check failed:', customerCreationError.message);
            // Don't throw - continue processing webhook even if customer creation fails
        }
        // --- END AUTO-CREATE CUSTOMER ---

        // 3. Prepare an object for the UPDATE.
        let dataToUpdate: any = {};

        console.log("\n🔍 DEBUG - Event check:");
        console.log("   eventType:", eventType);
        console.log("   call.call_analysis exists:", !!call.call_analysis);
        console.log("   call.call_analysis:", JSON.stringify(call.call_analysis, null, 2));

        if (eventType === "call_analyzed" && call.call_analysis) {
            console.log("\n📊 Processing call_analyzed event");
            const analysis = call.call_analysis;
            dataToUpdate.summary = analysis.call_summary || "No summary provided.";
            dataToUpdate.in_voicemail = analysis.in_voicemail;
            dataToUpdate.user_sentiment = analysis.user_sentiment;
            dataToUpdate.call_successful = analysis.call_successful;
            console.log("Analysis data:", dataToUpdate);

            // --- POST-CALL SMS FOLLOW-UP ---
            // Check if we already sent SMS for this call (prevent duplicates)
            const { data: existingLog } = await supabaseAdmin
                .from("call_logs")
                .select("sms_sent")
                .eq("retell_call_id", retellCallId)
                .single();

            const alreadySentSms = existingLog?.sms_sent === true;
            console.log(`   alreadySentSms: ${alreadySentSms}`);

            // Send SMS if call was successful OR if user talked back (from custom_analysis_data)
            // BUT only if we haven't already sent SMS for this call
            const userTalkedBack = analysis.custom_analysis_data?.user_talked_back === true;
            const shouldSendSms = !alreadySentSms && (analysis.call_successful === true || userTalkedBack) && insertData.customer_phone;

            console.log("\n🔍 DEBUG - SMS decision:");
            console.log("   analysis.call_successful:", analysis.call_successful);
            console.log("   analysis.custom_analysis_data:", JSON.stringify(analysis.custom_analysis_data));
            console.log("   userTalkedBack:", userTalkedBack);
            console.log("   insertData.customer_phone:", insertData.customer_phone);
            console.log("   alreadySentSms:", alreadySentSms);
            console.log("   shouldSendSms:", shouldSendSms);

            if (shouldSendSms) {
                try {
                    console.log("\n📱 Sending post-call follow-up SMS...");
                    console.log(`   Reason: call_successful=${analysis.call_successful}, user_talked_back=${userTalkedBack}`);

                    // Get merchant info
                    const { data: merchant } = await supabaseAdmin
                        .from("merchants")
                        .select("business_name")
                        .eq("id", agent.merchant_id)
                        .single();

                    const { data: profile } = await supabaseAdmin
                        .from("business_profiles")
                        .select("booking_link, master_booking_url")
                        .eq("merchant_id", agent.merchant_id)
                        .single();

                    const businessName = merchant?.business_name || "us";
                    // Use booking_link first, then master_booking_url as fallback
                    const bookingLink = profile?.booking_link || profile?.master_booking_url || null;

                    let smsMessage: string;

                    // Check if we have a valid summary to work with
                    const hasSummary = analysis.call_summary && analysis.call_summary.trim().length > 10;

                    // FIXED: Only use call_successful to determine if call was cut short
                    // duration_ms is not reliable in call_analyzed event
                    const callCutShort = analysis.call_successful === false;

                    console.log(`   hasSummary: ${hasSummary}`);
                    console.log(`   call_successful: ${analysis.call_successful}`);
                    console.log(`   callCutShort: ${callCutShort}`);

                    if (callCutShort) {
                        // Call was cut short - apologize and invite them to continue via text
                        console.log("📱 Call was NOT successful, sending apology message");
                        smsMessage = `Hey! Sorry our call got cut short. Was there anything I could help you with? Feel free to text me back anytime. - ${businessName}`;
                    } else if (hasSummary) {
                        // Use Gemini to extract the main purpose/need from the call
                        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                        const summaryPrompt = `From this call summary, extract what the customer was asking about in 2-5 casual words. Do NOT use quotes, apostrophes, or dashes. Just plain words.

Call summary: "${analysis.call_summary}"

Examples of good responses:
- getting a haircut
- your pricing
- scheduling an appointment
- your services
- booking a consultation`;

                        let customerNeed = "your question";
                        try {
                            const result = await model.generateContent(summaryPrompt);
                            // Clean the response - remove quotes, dashes, and extra punctuation
                            customerNeed = result.response.text()
                                .trim()
                                .replace(/["'`\-—]/g, '')
                                .replace(/^\.+|\.+$/g, '')
                                .toLowerCase();
                        } catch {
                            console.log("⚠️ AI summary failed, using default");
                        }

                        // Check if caller wants to book/schedule - expanded keywords
                        const bookingKeywords = [
                            'book', 'booking', 'schedule', 'appointment', 'consult',
                            'visit', 'coming in', 'reservation', 'link', 'estimate',
                            'quote', 'pricing', 'available', 'slot', 'time'
                        ];
                        const summaryLower = (analysis.call_summary || '').toLowerCase();
                        const wantsBooking = bookingKeywords.some(k => customerNeed.includes(k)) ||
                            bookingKeywords.some(k => summaryLower.includes(k));

                        console.log(`   Checking keywords in customerNeed: "${customerNeed}"`);

                        console.log(`   wantsBooking: ${wantsBooking} (keywords found in need or summary)`);

                        // Default booking link fallback
                        const DEFAULT_BOOKING_LINK = "https://neucler.com/book";

                        if (wantsBooking) {
                            // User asked for booking - send JUST the link, keep it simple
                            let finalBookingLink = DEFAULT_BOOKING_LINK;

                            try {
                                console.log(`🔗 Attempting to generate smart booking link...`);
                                finalBookingLink = await createSmartLinkServer(agent.merchant_id);
                                console.log(`✅ Generated smart booking link: ${finalBookingLink}`);
                            } catch (linkErr: any) {
                                console.log(`⚠️ Smart link failed: ${linkErr.message}`);
                                // Use configured booking link or default
                                finalBookingLink = bookingLink || DEFAULT_BOOKING_LINK;
                                console.log(`📎 Using fallback: ${finalBookingLink}`);
                            }

                            // Simple, direct message with just the link
                            smsMessage = `Here's your booking link: ${finalBookingLink}`;
                        } else {
                            // Normal follow-up message without booking link
                            smsMessage = `Hey! Thanks for calling ${businessName}. Happy to help with ${customerNeed}! Feel free to text me back if you have any questions. 😊`;
                        }
                    } else {
                        // No summary available - send friendly fallback
                        console.log("⚠️ No summary available, using fallback SMS message");
                        smsMessage = `Hey! Thanks for calling ${businessName}. Was there anything I could help you with? Feel free to text me back anytime!`;
                    }

                    // Send via Twilio
                    const fromNumber = agent.phone_number || call.to_number;
                    console.log(`\n📱 Sending post-call SMS via Twilio:`);
                    console.log(`   From: ${fromNumber}`);
                    console.log(`   To: ${insertData.customer_phone}`);
                    console.log(`   Message (${smsMessage.length} chars): ${smsMessage.substring(0, 100)}...`);

                    await twilioClient.messages.create({
                        body: smsMessage,
                        from: fromNumber,
                        to: insertData.customer_phone
                    });

                    console.log(`✅ Post-call SMS SENT successfully to ${insertData.customer_phone}`);

                    // Mark this call as SMS sent to prevent duplicates
                    await supabaseAdmin
                        .from("call_logs")
                        .update({ sms_sent: true })
                        .eq("retell_call_id", retellCallId);
                    console.log(`📝 Marked call ${retellCallId} as sms_sent=true`);

                    // Save to messages table
                    await supabaseAdmin.from("messages").insert({
                        merchant_id: agent.merchant_id,
                        customer_phone: insertData.customer_phone,
                        direction: "outbound",
                        body: smsMessage,
                        channel: "sms",
                        status: "sent",
                        created_at: new Date().toISOString()
                    });

                } catch (smsError: any) {
                    console.error("❌ Post-call SMS failed:", smsError.message);
                    // Don't throw - continue processing
                }
            }
            // --- END POST-CALL SMS ---
        }

        if (eventType === "call_ended") {
            console.log("\n📞 Processing call_ended event");
            dataToUpdate.duration_seconds = Math.round((call.duration_ms || 0) / 1000);
            dataToUpdate.transcript = call.transcript_object || [];
            dataToUpdate.status = call.disconnection_reason || 'completed';
            dataToUpdate.cost_cents = Math.round((call.call_cost?.combined_cost || 0) * 100);
            console.log("Call ended data:", {
                duration: dataToUpdate.duration_seconds,
                status: dataToUpdate.status,
                cost: dataToUpdate.cost_cents
            });
        }

        // 4. If there's data to update, perform the UPDATE.
        if (Object.keys(dataToUpdate).length > 0) {
            console.log(`\n🔄 Updating call log with ${Object.keys(dataToUpdate).length} fields`);
            console.log("Update data:", JSON.stringify(dataToUpdate, null, 2));

            const { error: updateError } = await supabaseAdmin
                .from("call_logs")
                .update(dataToUpdate)
                .eq('retell_call_id', retellCallId);

            if (updateError) {
                console.error("💥 SUPABASE UPDATE FAILED:", updateError);
                throw new Error(`Supabase UPDATE error: ${updateError.message}`);
            }
            console.log("✅ UPDATE successful!");
        } else {
            console.log("\n⏭️ No update data for this event type");
        }

        console.log(`\n✅ SUCCESS: Call ${retellCallId} (Event: ${eventType}) processed`);
        console.log("========================================\n");
        return NextResponse.json({ status: "success" });

    } catch (error: any) {
        console.error("\n💥 FULL WEBHOOK ERROR:", error);
        console.error("Stack:", error.stack);
        console.error("========================================\n");
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}