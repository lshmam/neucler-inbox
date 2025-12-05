import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

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
            .select("id, merchant_id, retell_agent_id");

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

        if (eventType === "call_analyzed" && body.call_analysis) {
            console.log("\n📊 Processing call_analyzed event");
            const analysis = body.call_analysis;
            dataToUpdate.summary = analysis.call_summary || "No summary provided.";
            dataToUpdate.in_voicemail = analysis.in_voicemail;
            dataToUpdate.user_sentiment = analysis.user_sentiment;
            dataToUpdate.call_successful = analysis.call_successful;
            console.log("Analysis data:", dataToUpdate);
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