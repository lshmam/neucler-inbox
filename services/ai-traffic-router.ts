/**
 * AI Traffic Router Service
 * 
 * Classifies incoming customer messages (SMS/Email) and routes them to:
 * 1. Pipeline (Deals) - For sales opportunities
 * 2. Service Desk (Tickets) - For complex questions or complaints
 * 
 * Also triggers auto-reply for simple informational queries.
 */

import { supabaseAdmin } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============= TYPES =============

export type MessageIntent =
    | "BOOKING_REQUEST"
    | "PRICING_QUERY"
    | "TECHNICAL_ISSUE"
    | "COMPLAINT"
    | "GENERAL_CHAT";

export interface MessageAnalysis {
    intent: MessageIntent;
    commercial_intent_score: number; // 0-100
    is_complex: boolean;
    summary: string;
}

export interface RoutingResult {
    action: "PIPELINE" | "ESCALATE" | "AUTO_REPLY" | "NO_ACTION";
    dealId?: string;
    ticketId?: string;
    note: string;
}

// ============= CONSTANTS =============

const COMMERCIAL_THRESHOLD_HIGH = 80;
const COMMERCIAL_THRESHOLD_LOW = 20;

const SYSTEM_PROMPT = `You are an AI message classifier for an auto repair shop.

Analyze the customer message and output JSON with exactly these fields:
{
    "intent": "BOOKING_REQUEST" | "PRICING_QUERY" | "TECHNICAL_ISSUE" | "COMPLAINT" | "GENERAL_CHAT",
    "commercial_intent_score": 0-100,
    "is_complex": boolean,
    "summary": "Brief 1-line summary of what customer wants"
}

Intent Classification:
- BOOKING_REQUEST: Customer wants to schedule an appointment, bring in their car, book service
- PRICING_QUERY: Customer asking about prices, quotes, estimates, "how much for X?"
- TECHNICAL_ISSUE: Customer describing car problems, strange noises, dashboard lights, diagnostic questions
- COMPLAINT: Customer expressing dissatisfaction, frustration, demanding resolution
- GENERAL_CHAT: Simple questions (hours, location), thank you messages, acknowledgments

Commercial Intent Score (0-100):
- 90-100: Explicit buying signals ("I need this done today", "Book me in", "Let's do it")
- 70-89: High interest ("How much for X?", "Do you do Y?", "Can you fix Z?")
- 40-69: Moderate interest (describing a problem, asking if you service their car)
- 20-39: Low interest (general questions, information gathering)
- 0-19: No commercial intent (confirmations, location questions, thank you)

is_complex (boolean):
- true if: Vague descriptions ("weird noise"), multiple symptoms, diagnosis needed, custom requests
- true if: Customer sounds frustrated or emotional
- true if: Question requires business policy knowledge
- false if: Standard service, clear request, simple booking

Output ONLY valid JSON, no markdown or explanation.`;

// ============= GEMINI CLIENT =============

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ============= MAIN ROUTER FUNCTION =============

/**
 * Routes an incoming message to the appropriate system
 * 
 * @param message - The raw customer message text
 * @param customerId - UUID of the customer in your database
 * @param ticketId - Optional existing ticket ID if message is part of thread
 * @param merchantId - UUID of the merchant/shop
 * @returns RoutingResult with action taken and any created IDs
 */
export async function routeIncomingMessage(
    message: string,
    customerId: string,
    merchantId: string,
    ticketId?: string
): Promise<RoutingResult> {
    try {
        // Step 1: Analyze the message with AI
        const analysis = await analyzeMessage(message);
        console.log("[AI Router] Analysis:", analysis);

        // Step 2: Apply routing logic
        return await applyRoutingLogic(analysis, customerId, merchantId, ticketId);

    } catch (error) {
        console.error("[AI Router] Error:", error);
        // On error, default to escalation for safety
        return {
            action: "ESCALATE",
            note: "🤖 AI routing error -> Escalated to human for review."
        };
    }
}

// ============= AI ANALYSIS =============

async function analyzeMessage(message: string): Promise<MessageAnalysis> {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-001",
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3, // Lower temp for consistent classification
            maxOutputTokens: 200
        }
    });

    const prompt = `${SYSTEM_PROMPT}\n\nCustomer message:\n"${message}"`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    if (!content) {
        throw new Error("No response from Gemini");
    }

    const parsed = JSON.parse(content) as MessageAnalysis;

    // Validate required fields
    if (!parsed.intent || typeof parsed.commercial_intent_score !== "number") {
        throw new Error("Invalid AI response format");
    }

    return parsed;
}

// ============= ROUTING LOGIC =============

async function applyRoutingLogic(
    analysis: MessageAnalysis,
    customerId: string,
    merchantId: string,
    ticketId?: string
): Promise<RoutingResult> {

    // ROUTE 1: High commercial intent -> Pipeline (Deals)
    if (analysis.commercial_intent_score >= COMMERCIAL_THRESHOLD_HIGH) {
        return await routeToPipeline(analysis, customerId, merchantId, ticketId);
    }

    // ROUTE 2: Complex or Complaint -> Escalate to Human
    if (analysis.is_complex || analysis.intent === "COMPLAINT") {
        return await escalateToHuman(analysis, customerId, merchantId, ticketId);
    }

    // ROUTE 3: Low commercial intent -> Auto-reply (simple questions)
    if (analysis.commercial_intent_score <= COMMERCIAL_THRESHOLD_LOW) {
        return await triggerAutoReply(analysis, customerId, merchantId, ticketId);
    }

    // ROUTE 4: Mid-range - Let AI continue handling, no special routing
    return {
        action: "NO_ACTION",
        note: "🤖 AI handling conversation - moderate interest detected."
    };
}

// ============= ROUTE HANDLERS =============

/**
 * Route to Pipeline: Create a deal for sales opportunity
 */
async function routeToPipeline(
    analysis: MessageAnalysis,
    customerId: string,
    merchantId: string,
    ticketId?: string
): Promise<RoutingResult> {

    // Check if an open deal already exists for this customer
    const { data: existingDeal } = await supabaseAdmin
        .from("deals")
        .select("id, status")
        .eq("merchant_id", merchantId)
        .eq("customer_id", customerId)
        .in("status", ["new_inquiry", "quote_sent", "follow_up"])
        .maybeSingle();

    let dealId = existingDeal?.id;

    // Create new deal if none exists
    if (!existingDeal) {
        const { data: customer } = await supabaseAdmin
            .from("customers")
            .select("first_name, last_name, phone_number")
            .eq("id", customerId)
            .single();

        const customerName = customer
            ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Unknown"
            : "Unknown";

        const { data: newDeal, error: dealError } = await supabaseAdmin
            .from("deals")
            .insert({
                merchant_id: merchantId,
                customer_id: customerId,
                customer_name: customerName,
                title: analysis.summary || "New Inquiry",
                status: "new_inquiry",
                source: "ai_router",
                value: 0,
                created_at: new Date().toISOString()
            })
            .select("id")
            .single();

        if (dealError) {
            console.error("[AI Router] Failed to create deal:", dealError);
            throw dealError;
        }

        dealId = newDeal.id;
    }

    // Add system note to ticket if exists
    if (ticketId) {
        await addSystemNote(
            ticketId,
            `🤖 AI detected sales opportunity (Score: ${analysis.commercial_intent_score}/100)\n→ Added to Pipeline as Deal ${dealId}\nIntent: ${analysis.intent}`
        );
    }

    return {
        action: "PIPELINE",
        dealId,
        ticketId,
        note: `🤖 AI detected sales opportunity -> Added to Pipeline (Score: ${analysis.commercial_intent_score}).`
    };
}

/**
 * Escalate to Human: Mark ticket as high priority, needs human attention
 */
async function escalateToHuman(
    analysis: MessageAnalysis,
    customerId: string,
    merchantId: string,
    ticketId?: string
): Promise<RoutingResult> {

    // If no ticket exists, create one
    if (!ticketId) {
        const { data: newTicket, error } = await supabaseAdmin
            .from("tickets")
            .insert({
                merchant_id: merchantId,
                customer_id: customerId,
                title: analysis.summary || "Escalated Inquiry",
                status: "open",
                priority: "high",
                category: analysis.intent === "COMPLAINT" ? "complaint" : "general",
                source: "ai_router",
                created_at: new Date().toISOString()
            })
            .select("id")
            .single();

        if (error) {
            console.error("[AI Router] Failed to create ticket:", error);
            throw error;
        }

        ticketId = newTicket.id;
    } else {
        // Update existing ticket to escalated state
        await supabaseAdmin
            .from("tickets")
            .update({
                status: "open",
                priority: "high",
                updated_at: new Date().toISOString()
            })
            .eq("id", ticketId);
    }

    // Add system note explaining escalation
    const reason = analysis.intent === "COMPLAINT"
        ? "Customer complaint detected"
        : analysis.is_complex
            ? "Complex inquiry requiring human attention"
            : "Escalated by AI";

    await addSystemNote(
        ticketId,
        `🤖 AI could not fully resolve -> Escalated to Human\nReason: ${reason}\nIntent: ${analysis.intent}\nComplexity: ${analysis.is_complex ? "High" : "Normal"}`
    );

    return {
        action: "ESCALATE",
        ticketId,
        note: `🤖 AI escalated to human -> ${reason}.`
    };
}

/**
 * Trigger Auto-Reply: For simple informational queries
 */
async function triggerAutoReply(
    analysis: MessageAnalysis,
    customerId: string,
    merchantId: string,
    ticketId?: string
): Promise<RoutingResult> {

    // Note: This hooks into your existing auto-reply system
    // The actual reply generation happens elsewhere

    // Log this for analytics
    await supabaseAdmin
        .from("ai_routing_logs")
        .insert({
            merchant_id: merchantId,
            customer_id: customerId,
            ticket_id: ticketId,
            action: "AUTO_REPLY",
            intent: analysis.intent,
            commercial_score: analysis.commercial_intent_score,
            summary: analysis.summary,
            created_at: new Date().toISOString()
        })
        .select();

    return {
        action: "AUTO_REPLY",
        ticketId,
        note: `🤖 Simple query detected -> Auto-reply triggered (Score: ${analysis.commercial_intent_score}).`
    };
}

// ============= HELPER FUNCTIONS =============

/**
 * Add a system note to a ticket's comment thread
 */
async function addSystemNote(ticketId: string, content: string): Promise<void> {
    await supabaseAdmin
        .from("ticket_comments")
        .insert({
            ticket_id: ticketId,
            content,
            author_type: "system",
            author_name: "AI Router",
            created_at: new Date().toISOString()
        });
}

// ============= BATCH PROCESSING =============

/**
 * Process a batch of unrouted messages (for backfill or cron jobs)
 */
export async function routeUnprocessedMessages(merchantId: string, limit = 50): Promise<{
    processed: number;
    results: RoutingResult[];
}> {
    // Fetch messages that haven't been routed yet
    const { data: messages, error } = await supabaseAdmin
        .from("messages")
        .select("id, content, customer_id, ticket_id")
        .eq("merchant_id", merchantId)
        .is("ai_routed", null)
        .order("created_at", { ascending: true })
        .limit(limit);

    if (error || !messages) {
        console.error("[AI Router] Failed to fetch messages:", error);
        return { processed: 0, results: [] };
    }

    const results: RoutingResult[] = [];

    for (const msg of messages) {
        const result = await routeIncomingMessage(
            msg.content,
            msg.customer_id,
            merchantId,
            msg.ticket_id
        );
        results.push(result);

        // Mark message as routed
        await supabaseAdmin
            .from("messages")
            .update({ ai_routed: true, ai_routing_action: result.action })
            .eq("id", msg.id);
    }

    return { processed: messages.length, results };
}

// ============= ANALYTICS =============

/**
 * Get routing statistics for a merchant
 */
export async function getRoutingStats(merchantId: string, days = 7): Promise<{
    total: number;
    byAction: Record<string, number>;
    byIntent: Record<string, number>;
    avgCommercialScore: number;
}> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: logs, error } = await supabaseAdmin
        .from("ai_routing_logs")
        .select("action, intent, commercial_score")
        .eq("merchant_id", merchantId)
        .gte("created_at", since.toISOString());

    if (error || !logs) {
        return { total: 0, byAction: {}, byIntent: {}, avgCommercialScore: 0 };
    }

    const byAction: Record<string, number> = {};
    const byIntent: Record<string, number> = {};
    let totalScore = 0;

    for (const log of logs) {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
        byIntent[log.intent] = (byIntent[log.intent] || 0) + 1;
        totalScore += log.commercial_score || 0;
    }

    return {
        total: logs.length,
        byAction,
        byIntent,
        avgCommercialScore: logs.length > 0 ? Math.round(totalScore / logs.length) : 0
    };
}
