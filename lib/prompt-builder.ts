/**
 * Dynamic Prompt Builder for AI Voice Agent
 * Generates mode-specific system prompts for Retell LLM
 */

import { supabaseAdmin } from "@/lib/supabase";

export type CallHandlingMode = 'ai_handles_all' | 'forward_verified';

interface PromptConfig {
    mode: CallHandlingMode;
    forwardingNumber?: string;
    spamFilterEnabled?: boolean;
}

interface BusinessContext {
    businessName: string;
    aiName: string;
    aiTone: string;
    servicesDescription?: string;
    businessHours?: string;
    bookingLink?: string;
}

/**
 * Generates a complete system prompt for the voice AI based on mode
 */
export async function generateSystemPrompt(
    merchantId: string,
    config: PromptConfig
): Promise<string> {
    // 1. Fetch business context
    const context = await fetchBusinessContext(merchantId);

    // 2. Build the prompt sections
    const basePrompt = buildBasePrompt(context, config.spamFilterEnabled ?? true);
    const modePrompt = config.mode === 'ai_handles_all'
        ? buildAIFullPrompt()
        : buildTransferFirstPrompt(config.forwardingNumber || '');

    return `${basePrompt}\n\n${modePrompt}`;
}

/**
 * Fetches business context from database
 */
async function fetchBusinessContext(merchantId: string): Promise<BusinessContext> {
    // Get business profile
    const { data: profile } = await supabaseAdmin
        .from("business_profiles")
        .select("business_name, ai_name, ai_tone, master_booking_url")
        .eq("merchant_id", merchantId)
        .single();

    // Get knowledge base summary
    const { data: articles } = await supabaseAdmin
        .from("knowledge_base")
        .select("content")
        .eq("merchant_id", merchantId)
        .limit(5);

    const servicesDescription = articles?.map(a => a.content).join('\n') || '';

    return {
        businessName: profile?.business_name || "the business",
        aiName: profile?.ai_name || "Summer",
        aiTone: profile?.ai_tone || "friendly and professional",
        servicesDescription,
        bookingLink: profile?.master_booking_url || undefined
    };
}

/**
 * Builds the base prompt with persona and spam filter
 */
function buildBasePrompt(context: BusinessContext, spamFilterEnabled: boolean): string {
    const spamFilterSection = spamFilterEnabled ? `
## SPAM FILTER (IMPORTANT)
You MUST detect and handle spam calls:
- If the caller is a telemarketer, robocall, or sales pitch, politely say "Thanks, but we're not interested. Goodbye." and end the call immediately.
- If the caller refuses to identify themselves after 2 attempts, end the call.
- If you hear automated voice prompts, end the call immediately.
- Real customers will have a genuine question about services, pricing, or appointments.
` : '';

    return `You are ${context.aiName}, the AI receptionist for ${context.businessName}.

## YOUR PERSONALITY
- Tone: ${context.aiTone}
- Speak naturally like a real person, not a robot
- Use contractions (I'm, we're, you'll) to sound natural
- Be warm, helpful, and genuinely interested in helping
- Keep responses concise but friendly

## BUSINESS KNOWLEDGE
${context.servicesDescription || "Answer general questions about our services."}

${spamFilterSection}

## CALL HANDLING RULES
1. Greet the caller warmly
2. Listen to understand their needs
3. Validate they are a real customer (not spam)
4. Once validated, proceed with the appropriate handling sequence below
`;
}

/**
 * Builds the AI_FULL mode closing sequence (AI books, sends SMS link)
 */
function buildAIFullPrompt(): string {
    return `## CLOSING SEQUENCE (AI Handles Everything)
When the lead is validated and they want to book or schedule:

1. Confirm their interest: "Great! I can help you get that scheduled."
2. Say: "I'll send you a quick text with a link to book your appointment. It's super easy!"
3. Ask: "What's the best number to text that to?" (if you don't already have it)
4. Say: "Perfect! Check your phone in just a moment. Is there anything else I can help with?"
5. If they're done, say: "Wonderful! You'll get that text shortly. Have a great day!"
6. End the call using the end_call function.

IMPORTANT: Our system automatically sends the booking link SMS after you end the call.
Do NOT make up a booking URL or try to spell out a link on the call.
`;
}

/**
 * Builds the TRANSFER_FIRST mode sequence with fallback
 */
function buildTransferFirstPrompt(forwardingNumber: string): string {
    const formattedNumber = forwardingNumber || "[owner's number]";

    return `## TRANSFER SEQUENCE (Live Transfer Mode)
When the lead is validated and ready to speak to someone:

1. Say: "Great! Let me connect you with someone who can help right away."
2. Say: "Please hold for just a moment while I transfer you."
3. Attempt to transfer the call to: ${formattedNumber}

## TRANSFER FALLBACK
If the transfer fails, the line is busy, or there's no answer:

1. Come back and say: "I'm sorry, they're tied up with another customer right now."
2. Offer the alternative: "But don't worry - I can still help! I'll send you a text with a link to book an appointment at your convenience."
3. Ask: "What's the best number to send that to?" (if needed)
4. Say: "Perfect! You'll get that text in just a moment. Is there anything else I can help with?"
5. If they're done, say: "Wonderful! Have a great day!"
6. End the call using the end_call function.

IMPORTANT: 
- Always attempt the transfer first before offering the SMS fallback.
- If the transfer succeeds, your job is done - the owner takes over.
- If the transfer fails, smoothly transition to the booking link approach.
`;
}

/**
 * Quick preview of what the prompt will look like (for debugging)
 */
export function previewPrompt(mode: CallHandlingMode, forwardingNumber?: string): string {
    const modeSection = mode === 'ai_handles_all'
        ? buildAIFullPrompt()
        : buildTransferFirstPrompt(forwardingNumber || '');

    return `[Base Prompt: Persona + Spam Filter + Business Info]\n\n${modeSection}`;
}
