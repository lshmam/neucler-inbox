import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateSystemPrompt, CallHandlingMode } from "@/lib/prompt-builder";
import { upsertRetellLLM } from "@/lib/retell";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { agentId, mode, forwardingNumber, spamFilterEnabled } = body;

        if (!agentId || !mode) {
            return NextResponse.json({ error: "Missing agentId or mode" }, { status: 400 });
        }

        console.log(`🔧 [Update Prompt] Agent: ${agentId}, Mode: ${mode}`);

        // 1. Get the agent to find merchant_id and retell_llm_id
        const { data: agent, error: agentError } = await supabaseAdmin
            .from("ai_agents")
            .select("merchant_id, retell_llm_id, name")
            .eq("id", agentId)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // 2. Generate the new system prompt based on mode
        const systemPrompt = await generateSystemPrompt(agent.merchant_id, {
            mode: mode as CallHandlingMode,
            forwardingNumber,
            spamFilterEnabled
        });

        console.log(`📝 [Update Prompt] Generated prompt (${systemPrompt.length} chars)`);

        // 3. Update Retell LLM with new prompt
        let retellLlmId = agent.retell_llm_id;

        try {
            const llmResult = await upsertRetellLLM(retellLlmId, systemPrompt);
            retellLlmId = llmResult.llm_id || retellLlmId;
            console.log(`✅ [Update Prompt] Retell LLM updated: ${retellLlmId}`);
        } catch (retellError: any) {
            console.error(`⚠️ [Update Prompt] Retell update failed:`, retellError);
            // Don't fail completely - still save to DB
        }

        // 4. Update the agent in database
        const { error: updateError } = await supabaseAdmin
            .from("ai_agents")
            .update({
                system_prompt: systemPrompt,
                call_handling_mode: mode,
                forwarding_number: mode === 'forward_verified' ? forwardingNumber : null,
                spam_filter_enabled: spamFilterEnabled,
                retell_llm_id: retellLlmId
            })
            .eq("id", agentId);

        if (updateError) {
            console.error(`❌ [Update Prompt] DB update failed:`, updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        console.log(`✅ [Update Prompt] Complete for agent ${agentId}`);

        return NextResponse.json({
            success: true,
            llmId: retellLlmId,
            promptLength: systemPrompt.length
        });

    } catch (error: any) {
        console.error("❌ [Update Prompt] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
