import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const eventType = body.event;
        const call = body.call;

        if (!call || !call.call_id || !call.agent_id) {
            return NextResponse.json({ status: "ignored_missing_data" });
        }

        const { call_id: retellCallId, agent_id: retellAgentId } = call;

        // --- FIX #1: THE HARDENED AGENT LOOKUP ---
        // Fetch all agents and then find the match in code, trimming whitespace.
        const { data: allAgents } = await supabaseAdmin
            .from("ai_agents")
            .select("id, merchant_id, retell_agent_id");

        const agent = allAgents?.find(
            (a) => a.retell_agent_id && a.retell_agent_id.trim() === retellAgentId.trim()
        );
        // -----------------------------------------

        if (!agent) {
            console.error(`- Webhook failed: No agent found with a trimmed retell_agent_id matching: ${retellAgentId}`);
            console.log("DB Agents Checked:", allAgents?.map(a => a.retell_agent_id));
            return NextResponse.json({ status: "error_agent_not_found" });
        }

        console.log(`[Webhook] Matched Retell Agent ${retellAgentId} to Supabase Agent UUID: ${agent.id}`);

        // --- FIX #2: THE RELIABLE INSERT/UPDATE LOGIC ---
        // 2. Always try to INSERT the base record first.
        const { error: insertError } = await supabaseAdmin
            .from("call_logs")
            .insert({
                retell_call_id: retellCallId,
                merchant_id: agent.merchant_id,
                agent_id: agent.id,
                direction: call.direction,
                customer_phone: call.direction === 'inbound' ? call.from_number : call.to_number,
                status: 'in-progress'
            });

        if (insertError && insertError.code !== '23505') { // Ignore "duplicate key" error
            console.error("💥 SUPABASE INSERT FAILED:", insertError);
            throw new Error(`Supabase INSERT error: ${insertError.message}`);
        }

        // 3. Prepare an object for the UPDATE.
        let dataToUpdate: any = {};

        if (eventType === "call_analyzed" && body.call_analysis) {
            const analysis = body.call_analysis;
            dataToUpdate.summary = analysis.call_summary || "No summary provided.";
            dataToUpdate.in_voicemail = analysis.in_voicemail;
            dataToUpdate.user_sentiment = analysis.user_sentiment;
            dataToUpdate.call_successful = analysis.call_successful;
        }

        if (eventType === "call_ended") {
            dataToUpdate.duration_seconds = Math.round((call.duration_ms || 0) / 1000);
            dataToUpdate.transcript = call.transcript_object || [];
            dataToUpdate.status = call.disconnection_reason || 'completed';
            dataToUpdate.cost_cents = Math.round((call.call_cost?.combined_cost || 0) * 100);
        }

        // 4. If there's data to update, perform the UPDATE.
        if (Object.keys(dataToUpdate).length > 0) {
            const { error: updateError } = await supabaseAdmin
                .from("call_logs")
                .update(dataToUpdate)
                .eq('retell_call_id', retellCallId);

            if (updateError) {
                console.error("💥 SUPABASE UPDATE FAILED:", updateError);
                throw new Error(`Supabase UPDATE error: ${updateError.message}`);
            }
        }

        console.log(`✅ Data for call ${retellCallId} (Event: ${eventType}) was successfully processed.`);
        return NextResponse.json({ status: "success" });

    } catch (error: any) {
        console.error("💥 FULL WEBHOOK ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}