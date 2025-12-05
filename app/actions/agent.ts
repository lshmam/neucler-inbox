"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function saveAgentConfig(merchantId: string, config: any, agentId?: string) {
    try {
        console.log(`💾 Saving Agent Config for ${merchantId}`);

        // 1. Fetch Business Profile (for context in prompt)
        const { data: profile } = await supabaseAdmin
            .from("business_profiles")
            .select("*")
            .eq("merchant_id", merchantId)
            .single();

        const businessName = profile?.business_name || "the business";

        // 2. Construct the AI System Prompt (The "Brain")
        // We still put everything here for the AI to read, but we ALSO save to columns below.
        const constructedPrompt = `
            You are ${config.name}, the AI receptionist for ${businessName}.
            LANGUAGE: ${config.language || 'en-US'}
            TONE: ${config.voiceVibe || 'friendly'}
            
            ## INSTRUCTIONS
            ${config.specialInstructions || "Be helpful and brief."}
            
            ## HANDOFF
            If you cannot help, transfer to: ${config.handoffNumber}
            
            ## BUSINESS INFO
            Hours: ${JSON.stringify(profile?.business_hours || {})}
        `;

        // 3. Prepare Database Payload
        const payload = {
            merchant_id: merchantId,
            name: config.name,
            voice_id: config.voiceId,
            opening_greeting: config.openingGreeting,
            pickup_behavior: "immediate",
            system_prompt: constructedPrompt,
            phone_mode: "dedicated", // Default for new requests
            type: config.type || "inbound", // 'inbound' or 'outbound'

            // --- NEW STRUCTURED COLUMNS ---
            language: config.language,
            voice_gender: config.voiceGender,
            voice_vibe: config.voiceVibe,
            handoff_number: config.handoffNumber,
            desired_area_code: config.areaCode, // Maps Wizard 'areaCode' to DB 'desired_area_code'

            // --- PENDING STATUS ---
            provisioning_status: 'pending_provision',
            status: 'active'
        };

        let result;

        if (agentId) {
            // Update existing
            result = await supabaseAdmin
                .from("ai_agents")
                .update(payload)
                .eq("id", agentId)
                .select()
                .single();
        } else {
            // Create new
            result = await supabaseAdmin
                .from("ai_agents")
                .insert({
                    ...payload,
                    retell_agent_id: null,
                    retell_llm_id: null,
                    phone_number: null,
                })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        revalidatePath("/ai-agent");
        return { success: true, agentId: result.data.id };

    } catch (error: any) {
        console.error("Agent Save Failed:", error);
        return { success: false, error: error.message };
    }
}