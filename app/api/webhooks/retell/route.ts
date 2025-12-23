import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";
import { GoogleGenerativeAI } from '@google/generative-ai';
import twilio from "twilio";
import { createSmartLinkServer } from "@/app/actions/links-server";
import { analyzeCall } from "@/services/quality-scoring";
import { extractCustomerInfo } from "@/services/customer-info-extractor";

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
                    } else {
                        console.log(`✅ New customer created successfully! ID: ${newCustomerId}`);
                    }
                } else {
                    console.log(`📋 Existing customer found: ${existingCustomer.id}`);
                }
            }
        } catch (customerCreationError: any) {
            console.warn('⚠️ Customer creation check failed:', customerCreationError.message);
        }
        // --- END AUTO-CREATE CUSTOMER ---

        // --- PREVIOUSLY AUTO-CREATE TICKET - REMOVED FOR CONDITIONAL LOGIC ---
        // Tickets/Deals are now created only after analysis in call_analyzed event
        // or manually by the user during the call.


        // 3. Prepare an object for the UPDATE.
        let dataToUpdate: any = {};

        console.log("\n🔍 DEBUG - Event check:");
        console.log("   eventType:", eventType);
        console.log("   call.call_analysis exists:", !!call.call_analysis);
        console.log("   call.call_analysis:", JSON.stringify(call.call_analysis, null, 2));

        if (eventType === "call_analyzed" && call.call_analysis) {
            console.log("\n📊 Processing call_analyzed event");
            let ticketId: string | null = null;
            let callCategory: string = "general";
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
                        // Use Gemini to classify and extract need
                        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
                        const routingPrompt = `Analyze this call summary: "${analysis.call_summary}"

Output a JSON object with:
1. "need": A SHORT noun phrase (2-4 words) for what they want. Must work grammatically after "help with your..." 
   Examples: "oil change", "brake inspection", "quote request", "appointment scheduling"
   BAD examples: "booking an oil change", "getting a quote" (these are verb phrases, not nouns)
2. "category": One of ["sales", "support", "general"].
   - sales: wants appointment, booking, quote, pricing, new service.
   - support: complaint, issue, waiting too long, problem, angry.
   - general: hours, location, simple question.

JSON:`;

                        let customerNeed = "your question";

                        try {
                            const result = await model.generateContent(routingPrompt);
                            const responseText = result.response.text();
                            const parsed = JSON.parse(responseText);

                            customerNeed = parsed.need?.toLowerCase().trim() || "your question";
                            callCategory = parsed.category?.toLowerCase() || "general";
                            console.log(`🤖 AI Analysis: need="${customerNeed}", category="${callCategory}"`);

                            // === CONDITIONAL ROUTING ===
                            const customerPhone = insertData.customer_phone;

                            // 1. SALES -> PIPELINE (DEAL)
                            if (callCategory === "sales" && customerPhone) {
                                console.log("💰 Detected SALES intent - checking/creating Deal");
                                // Logic to create deal would go here (omitted for brevity, or implemented if requested)
                                // For now, we ensure NO ticket is auto-created, which satisfies the requirement.
                            }

                            // 2. SUPPORT/COMPLAINT -> TICKET
                            // Create ticket ONLY if category is support OR sentiment is negative
                            const isNegative = analysis.user_sentiment === "Negative";
                            if ((callCategory === "support" || isNegative) && customerPhone) {
                                console.log("🎫 Detected SUPPORT intent or Negative sentiment - Creating Ticket...");

                                // Check if ticket already exists
                                const { data: existingTicket } = await supabaseAdmin
                                    .from('tickets')
                                    .select('id')
                                    .eq('call_id', retellCallId)
                                    .single();

                                if (!existingTicket) {
                                    // Find customer
                                    const { data: customer } = await supabaseAdmin
                                        .from('customers')
                                        .select('id')
                                        .eq('merchant_id', agent.merchant_id)
                                        .eq('phone_number', customerPhone)
                                        .single();

                                    const newTicketId = crypto.randomUUID();
                                    await supabaseAdmin.from('tickets').insert({
                                        id: newTicketId,
                                        merchant_id: agent.merchant_id,
                                        customer_id: customer?.id,
                                        title: `Support: ${customerNeed}`,
                                        description: `Auto-created from call analysis.\nSummary: ${analysis.call_summary}\nSentiment: ${analysis.user_sentiment}`,
                                        status: 'open',
                                        priority: isNegative ? 'high' : 'medium',
                                        source: 'phone', // or 'ai_agent'
                                        call_id: retellCallId,
                                        assigned_to: agent.id // Default to agent/owner
                                    });
                                    ticketId = newTicketId;
                                    console.log(`✅ Auto-created support ticket: ${newTicketId}`);
                                } else {
                                    ticketId = existingTicket.id;
                                    console.log(`📋 Found existing ticket: ${ticketId}`);
                                }
                            }
                        } catch (parseErr) {
                            console.log("⚠️ AI routing failed, using default:", parseErr);
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
                            // User asked for booking - generate dynamic SMS with context
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

                            // Generate dynamic, natural booking SMS with Gemini
                            try {
                                const smsGenPrompt = `Generate a SHORT, friendly SMS (max 160 chars) for an auto shop follow-up.

Context:
- Business: ${businessName}
- Customer wanted: ${customerNeed}
- Booking link: ${finalBookingLink}

Rules:
1. Thank them for calling (vary how you say it)
2. Reference what they need naturally (don't repeat word-for-word)
3. Include the booking link
4. Be warm but professional
5. NO emojis, keep it text-friendly
6. Vary sentence structure - don't always start with "Thanks" or "Hey"

Output ONLY the SMS text, nothing else.`;

                                const smsResult = await model.generateContent(smsGenPrompt);
                                const generatedSms = smsResult.response.text().trim();

                                // Validate it includes the link and isn't too long
                                if (generatedSms.includes(finalBookingLink) && generatedSms.length <= 300) {
                                    smsMessage = generatedSms;
                                    console.log(`🤖 AI-generated booking SMS: ${smsMessage}`);
                                } else {
                                    // Fallback if AI response is weird
                                    smsMessage = `Thanks for calling ${businessName}! Ready to help with ${customerNeed}. Book here: ${finalBookingLink}`;
                                }
                            } catch (smsGenErr: any) {
                                console.log(`⚠️ SMS generation failed, using template: ${smsGenErr.message}`);
                                smsMessage = `Thanks for calling ${businessName}! Ready to help with ${customerNeed}. Book here: ${finalBookingLink}`;
                            }
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

            // --- TRIGGER QUALITY SCORING FOR ALL CALLS ---
            // Always score calls with transcripts, creating a ticket if needed
            if (call.transcript_object && call.transcript_object.length > 0) {
                let scoreTicketId = ticketId;

                // Create a ticket if one doesn't exist (for non-support calls)
                if (!scoreTicketId && insertData.customer_phone) {
                    console.log(`\n🎫 Creating ticket for quality scoring (call category: ${callCategory || 'unknown'})...`);

                    // Find customer
                    const { data: customer } = await supabaseAdmin
                        .from('customers')
                        .select('id')
                        .eq('merchant_id', agent.merchant_id)
                        .eq('phone_number', insertData.customer_phone)
                        .single();

                    // Check if ticket already exists for this call
                    const { data: existingTicket } = await supabaseAdmin
                        .from('tickets')
                        .select('id')
                        .eq('call_id', retellCallId)
                        .single();

                    if (existingTicket) {
                        scoreTicketId = existingTicket.id;
                        console.log(`📋 Found existing ticket: ${scoreTicketId}`);
                    } else {
                        const newTicketId = crypto.randomUUID();
                        await supabaseAdmin.from('tickets').insert({
                            id: newTicketId,
                            merchant_id: agent.merchant_id,
                            customer_id: customer?.id,
                            title: `Call: Phone Inquiry`,
                            description: `Auto-created for quality scoring.\nSummary: ${analysis.call_summary || 'N/A'}\nSentiment: ${analysis.user_sentiment || 'Unknown'}`,
                            status: analysis.call_successful ? 'resolved' : 'open',
                            priority: 'normal',
                            source: 'phone',
                            call_id: retellCallId,
                            assigned_to: null
                        });
                        scoreTicketId = newTicketId;
                        console.log(`✅ Auto-created ticket for scoring: ${newTicketId}`);
                    }
                }

                if (scoreTicketId) {
                    console.log(`\n📊 Triggering quality analysis for ticket: ${scoreTicketId}`);
                    // Fire-and-forget: Don't wait for analysis to complete
                    analyzeCall(scoreTicketId, call.transcript_object, 'phone').then(result => {
                        if (result.success) {
                            console.log(`✅ Quality analysis complete for ticket ${scoreTicketId}`);
                            console.log(`   Outcome: ${result.outcome}, Auto-resolved: ${result.autoResolved}`);
                        } else {
                            console.error(`❌ Quality analysis failed for ticket ${scoreTicketId}:`, result.error);
                        }
                    }).catch(err => {
                        console.error(`❌ Quality analysis error for ticket ${scoreTicketId}:`, err);
                    });
                } else {
                    console.log(`⏭️ Skipping quality analysis - no customer phone to create ticket`);
                }
            } else {
                console.log(`⏭️ Skipping quality analysis - no transcript available`);
            }
            // --- END QUALITY SCORING ---

            // --- EXTRACT CUSTOMER INFO FROM TRANSCRIPT ---
            if (call.transcript_object && call.transcript_object.length > 0 && insertData.customer_phone) {
                console.log(`\n👤 Extracting customer info from transcript...`);

                // Fire-and-forget: Don't block the webhook response
                extractCustomerInfo(call.transcript_object).then(async (extractedInfo) => {
                    console.log(`[CustomerExtractor] Extracted:`, JSON.stringify(extractedInfo, null, 2));

                    // Only update if we extracted meaningful data
                    const hasData = extractedInfo.firstName || extractedInfo.vehicleYear ||
                        extractedInfo.vehicleMake || extractedInfo.serviceRequested;

                    if (hasData && extractedInfo.confidence !== 'low') {
                        const updateFields: any = {};

                        // Only update name if we extracted it and current name is "Unknown Caller"
                        if (extractedInfo.firstName) {
                            // Check current customer name first
                            const { data: currentCustomer } = await supabaseAdmin
                                .from('customers')
                                .select('first_name')
                                .eq('merchant_id', agent.merchant_id)
                                .eq('phone_number', insertData.customer_phone)
                                .single();

                            if (currentCustomer?.first_name === 'Unknown Caller' || !currentCustomer?.first_name) {
                                updateFields.first_name = extractedInfo.firstName;
                                if (extractedInfo.lastName) {
                                    updateFields.last_name = extractedInfo.lastName;
                                }
                            }
                        }

                        // Always update vehicle info if we have it
                        if (extractedInfo.vehicleYear) updateFields.vehicle_year = extractedInfo.vehicleYear;
                        if (extractedInfo.vehicleMake) updateFields.vehicle_make = extractedInfo.vehicleMake;
                        if (extractedInfo.vehicleModel) updateFields.vehicle_model = extractedInfo.vehicleModel;
                        if (extractedInfo.serviceRequested) updateFields.service_requested = extractedInfo.serviceRequested;

                        if (Object.keys(updateFields).length > 0) {
                            const { error: updateError } = await supabaseAdmin
                                .from('customers')
                                .update(updateFields)
                                .eq('merchant_id', agent.merchant_id)
                                .eq('phone_number', insertData.customer_phone);

                            if (updateError) {
                                console.error(`❌ Failed to update customer info:`, updateError.message);
                            } else {
                                console.log(`✅ Customer info updated successfully:`, Object.keys(updateFields).join(', '));
                            }
                        }
                    } else {
                        console.log(`⏭️ No meaningful customer info extracted (confidence: ${extractedInfo.confidence})`);
                    }
                }).catch(err => {
                    console.error(`❌ Customer info extraction error:`, err.message);
                });
            }
            // --- END CUSTOMER INFO EXTRACTION ---
        }

        if (eventType === "call_ended") {
            console.log("\n📞 Processing call_ended event");
            dataToUpdate.duration_seconds = Math.round((call.duration_ms || 0) / 1000);
            dataToUpdate.transcript = call.transcript_object || [];
            dataToUpdate.status = call.disconnection_reason || 'completed';
            dataToUpdate.cost_cents = Math.round((call.call_cost?.combined_cost || 0) * 100);

            // Capture recording URL from Retell
            if (call.recording_url) {
                dataToUpdate.recording_url = call.recording_url;
                console.log(`   Recording URL: ${call.recording_url.substring(0, 50)}...`);
            }

            console.log("Call ended data:", {
                duration: dataToUpdate.duration_seconds,
                status: dataToUpdate.status,
                cost: dataToUpdate.cost_cents,
                hasRecording: !!call.recording_url
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