/**
 * Quality Scoring Service
 * 
 * Analyzes ticket transcripts using Google Gemini AI to score
 * customer service agent performance across 5 dimensions.
 * Also detects call outcomes and determines if human review is needed.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Confidence threshold for auto-resolving tickets
const AUTO_RESOLVE_CONFIDENCE_THRESHOLD = 80;

// Valid outcomes
export const TICKET_OUTCOMES = [
    'appointment_booked',
    'sale_completed',
    'issue_resolved',
    'escalated',
    'no_action_needed',
    'customer_dropped',
    'needs_review'
] as const;

export type TicketOutcome = typeof TICKET_OUTCOMES[number];

// Outcomes that should auto-resolve the ticket
const TERMINAL_OUTCOMES: TicketOutcome[] = [
    'appointment_booked',
    'sale_completed',
    'issue_resolved',
    'no_action_needed',
    'customer_dropped'
];

interface ScoreBreakdown {
    quickness: number;
    knowledge: number;
    hospitality: number;
    intro: number;
    cta: number;
}

// Booking details structure for shop management software integration
interface BookingDetails {
    customer: {
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
        email: string | null;
    };
    vehicle: {
        year: string | null;
        make: string | null;
        model: string | null;
        vin: string | null;
        license_plate: string | null;
        mileage: string | null;
    };
    service: {
        primary_complaint: string | null;
        requested_service: string | null;
        notes: string | null;
    };
    logistics: {
        date: string | null;
        time: string | null;
        is_drop_off: boolean | null;
        needs_shuttle: boolean | null;
    };
    missing_info: string[];
}

interface AnalysisResult {
    scores: ScoreBreakdown;
    total_score: number;
    feedback_summary: string;
    outcome: TicketOutcome;
    outcome_confidence: number;
    outcome_reasoning: string;
    booking_details?: BookingDetails;
}

interface TicketComment {
    id: string;
    content: string;
    author_id: string;
    author_name: string;
    is_internal: boolean;
    created_at: string;
}

interface Ticket {
    id: string;
    merchant_id: string;
    customer_id: string | null;
    assigned_to: string | null;
    title: string;
    description: string | null;
    created_at: string;
    first_response_at: string | null;
    resolved_at: string | null;
}

/**
 * Calculate average response time between customer and agent messages
 * Returns the average time in minutes
 */
function calculateAvgResponseTime(comments: TicketComment[], agentId: string | null): number {
    if (comments.length < 2) {
        return 0;
    }

    // Filter out internal notes - only analyze customer-facing replies
    const publicComments = comments.filter(c => !c.is_internal);

    if (publicComments.length < 2) {
        return 0;
    }

    const responseTimes: number[] = [];

    for (let i = 0; i < publicComments.length - 1; i++) {
        const current = publicComments[i];
        const next = publicComments[i + 1];

        // Check if current is from customer (not agent) and next is from agent
        const currentIsCustomer = current.author_id !== agentId;
        const nextIsAgent = next.author_id === agentId;

        if (currentIsCustomer && nextIsAgent) {
            const currentTime = new Date(current.created_at).getTime();
            const nextTime = new Date(next.created_at).getTime();
            const diffMinutes = (nextTime - currentTime) / (1000 * 60);

            // Only count reasonable response times (up to 24 hours)
            if (diffMinutes > 0 && diffMinutes < 24 * 60) {
                responseTimes.push(diffMinutes);
            }
        }
    }

    if (responseTimes.length === 0) {
        // No direct customer->agent response pairs found
        // Fall back to average gap between any messages
        let totalGap = 0;
        for (let i = 1; i < publicComments.length; i++) {
            const prev = new Date(publicComments[i - 1].created_at).getTime();
            const curr = new Date(publicComments[i].created_at).getTime();
            totalGap += (curr - prev) / (1000 * 60);
        }
        return publicComments.length > 1 ? totalGap / (publicComments.length - 1) : 0;
    }

    return responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
}

/**
 * Format ticket transcript for AI analysis
 */
function formatTranscript(comments: TicketComment[], agentId: string | null): string {
    const publicComments = comments.filter(c => !c.is_internal);

    if (publicComments.length === 0) {
        return 'No conversation transcript available.';
    }

    return publicComments.map(c => {
        const role = c.author_id === agentId ? 'AGENT' : 'CUSTOMER';
        const timestamp = new Date(c.created_at).toLocaleString();
        return `[${timestamp}] ${role} (${c.author_name}): ${c.content}`;
    }).join('\n\n');
}

/**
 * Format a call transcript from Retell for AI analysis
 */
export function formatCallTranscript(transcriptObject: any[]): string {
    if (!transcriptObject || transcriptObject.length === 0) {
        return 'No call transcript available.';
    }

    return transcriptObject.map(turn => {
        const role = turn.role === 'agent' ? 'AGENT' : 'CUSTOMER';
        return `${role}: ${turn.content}`;
    }).join('\n\n');
}

/**
 * Calculate resolution metrics for a ticket
 */
function calculateMetrics(ticket: Ticket): {
    timeToFirstResponse: number | null;
    timeToResolution: number | null;
} {
    const createdAt = new Date(ticket.created_at).getTime();

    let timeToFirstResponse: number | null = null;
    if (ticket.first_response_at) {
        const firstResponseAt = new Date(ticket.first_response_at).getTime();
        timeToFirstResponse = (firstResponseAt - createdAt) / (1000 * 60); // in minutes
    }

    let timeToResolution: number | null = null;
    if (ticket.resolved_at) {
        const resolvedAt = new Date(ticket.resolved_at).getTime();
        timeToResolution = (resolvedAt - createdAt) / (1000 * 60); // in minutes
    }

    return { timeToFirstResponse, timeToResolution };
}

/**
 * Main function to analyze a ticket and store scores
 */
export async function analyzeTicket(ticketId: string, options?: {
    channel?: 'phone' | 'sms' | 'email' | 'chat' | 'manual';
    callTranscript?: any[]; // For direct call analysis
}): Promise<{
    success: boolean;
    scoreId?: string;
    outcome?: TicketOutcome;
    autoResolved?: boolean;
    error?: string;
}> {
    console.log(`🔍 [Quality Scoring] Starting analysis for ticket: ${ticketId}`);

    try {
        // 1. Fetch the ticket
        const { data: ticket, error: ticketError } = await supabaseAdmin
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (ticketError || !ticket) {
            console.error('❌ [Quality Scoring] Failed to fetch ticket:', ticketError);
            return { success: false, error: 'Ticket not found' };
        }

        // 2. Get transcript - either from call or from comments
        let transcript: string;
        let avgResponseTime = 0;

        if (options?.callTranscript && options.callTranscript.length > 0) {
            // Use provided call transcript
            transcript = formatCallTranscript(options.callTranscript);
            console.log(`📞 [Quality Scoring] Using call transcript (${options.callTranscript.length} turns)`);
        } else {
            // Fetch ticket comments as transcript
            const { data: comments, error: commentsError } = await supabaseAdmin
                .from('ticket_comments')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (commentsError) {
                console.error('❌ [Quality Scoring] Failed to fetch comments:', commentsError);
                return { success: false, error: 'Failed to fetch transcript' };
            }

            if (!comments || comments.length === 0) {
                console.log('⚠️ [Quality Scoring] No comments found for ticket, skipping analysis');
                return { success: false, error: 'No transcript available' };
            }

            transcript = formatTranscript(comments, ticket.assigned_to);
            avgResponseTime = calculateAvgResponseTime(comments, ticket.assigned_to);
        }

        console.log(`⏱️ [Quality Scoring] Average response time: ${avgResponseTime.toFixed(2)} minutes`);

        // 3. Build the prompt for Gemini with outcome detection AND booking details extraction
        const systemPrompt = `You are a Quality Assurance Manager for an Auto Shop. Your job is to analyze customer service transcripts, score agent performance, determine the outcome, AND extract booking details for shop management software.

SCORING CRITERIA:

1. **Quickness (0-20)**: Based on the provided "Calculated Avg Response Time"
   - < 2 minutes = 20 points
   - 2-5 minutes = 15-19 points
   - 5-10 minutes = 10-14 points
   - > 10 minutes = 5-9 points
   - Deduct points if the tone seems slow or unresponsive

2. **Knowledge (0-20)**: Confidence in mechanical/pricing answers
   - Did the agent provide accurate, detailed information?
   - Were technical questions answered confidently?

3. **Hospitality (0-20)**: Warmth, empathy, and personalization
   - Did the agent use the customer's name?
   - Was the tone friendly and empathetic?

4. **Intro (0-20)**: Professional greeting
   - Did the agent properly introduce themselves?
   - Was the opening professional and welcoming?

5. **CTA (0-20)**: Call-to-Action
   - Did the agent explicitly ask for an appointment?
   - Did they attempt to close a sale or next step?

OUTCOME CLASSIFICATION:

Determine the outcome of this interaction:
- **appointment_booked**: Customer confirmed/scheduled an appointment
- **sale_completed**: A sale or transaction was completed
- **issue_resolved**: Customer's question/problem was fully answered
- **escalated**: Issue needs to be escalated to a human or specialist
- **no_action_needed**: Just an inquiry, no follow-up required
- **customer_dropped**: Customer hung up, left, or conversation ended abruptly
- **needs_review**: Complex scenario, unclear outcome, requires human review

CONFIDENCE SCORING:
- Give a confidence score (0-100) for your outcome classification
- 80-100: Very clear outcome, AI should auto-resolve
- 50-79: Somewhat clear, but human should verify
- 0-49: Unclear or complex, definitely needs human review

BOOKING DETAILS EXTRACTION:

Extract any booking/appointment details mentioned in the conversation. This data will be copy-pasted into shop management software like Tekmetric or Mitchell. Extract only what was explicitly mentioned - use null for unknown fields.

IMPORTANT: You MUST respond with valid JSON only. No additional text or markdown.

OUTPUT FORMAT (strict JSON):
{
  "scores": {
    "quickness": <number 0-20>,
    "knowledge": <number 0-20>,
    "hospitality": <number 0-20>,
    "intro": <number 0-20>,
    "cta": <number 0-20>
  },
  "total_score": <number 0-100>,
  "feedback_summary": "<2-3 sentence coaching tip for improvement>",
  "outcome": "<one of: appointment_booked, sale_completed, issue_resolved, escalated, no_action_needed, customer_dropped, needs_review>",
  "outcome_confidence": <number 0-100>,
  "outcome_reasoning": "<1 sentence explaining why you chose this outcome>",
  "booking_details": {
    "customer": {
      "first_name": "<string or null>",
      "last_name": "<string or null>",
      "phone": "<string or null>",
      "email": "<string or null>"
    },
    "vehicle": {
      "year": "<string or null>",
      "make": "<string or null>",
      "model": "<string or null>",
      "vin": "<string or null>",
      "license_plate": "<string or null>",
      "mileage": "<string or null>"
    },
    "service": {
      "primary_complaint": "<string describing what is wrong, or null>",
      "requested_service": "<string e.g. Oil Change, Brake Inspection, or null>",
      "notes": "<any additional notes mentioned, or null>"
    },
    "logistics": {
      "date": "<string in YYYY-MM-DD format or natural language like 'next Monday', or null>",
      "time": "<string like '9:00 AM' or null>",
      "is_drop_off": <boolean or null>,
      "needs_shuttle": <boolean or null>
    },
    "missing_info": ["<array of CRITICAL fields not captured, e.g. 'Vehicle Year', 'Customer Phone'>"]
  }
}`;

        const userPrompt = `Analyze the following customer service transcript:

**Ticket Title:** ${ticket.title}
**Calculated Avg Response Time:** ${avgResponseTime.toFixed(2)} minutes

**TRANSCRIPT:**
${transcript}

Provide your quality score analysis and outcome classification as JSON.`;

        // 4. Call Gemini API with JSON response mode
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3,
            },
        });

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: userPrompt }
        ]);

        const responseText = result.response.text();
        console.log(`📝 [Quality Scoring] Raw AI response: ${responseText.substring(0, 300)}...`);

        // 5. Parse the JSON response
        let analysis: AnalysisResult;
        try {
            analysis = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ [Quality Scoring] Failed to parse AI response:', parseError);
            return { success: false, error: 'Failed to parse AI response' };
        }

        // Validate the response structure
        if (!analysis.scores || typeof analysis.total_score !== 'number' || !analysis.outcome) {
            console.error('❌ [Quality Scoring] Invalid response structure:', analysis);
            return { success: false, error: 'Invalid AI response structure' };
        }

        // Ensure scores are within bounds
        const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
        const scores = {
            quickness: clamp(analysis.scores.quickness || 0, 0, 20),
            knowledge: clamp(analysis.scores.knowledge || 0, 0, 20),
            hospitality: clamp(analysis.scores.hospitality || 0, 0, 20),
            intro: clamp(analysis.scores.intro || 0, 0, 20),
            cta: clamp(analysis.scores.cta || 0, 0, 20),
        };
        const totalScore = clamp(analysis.total_score || 0, 0, 100);
        const outcomeConfidence = clamp(analysis.outcome_confidence || 0, 0, 100);

        // Validate outcome
        const outcome: TicketOutcome = TICKET_OUTCOMES.includes(analysis.outcome as TicketOutcome)
            ? analysis.outcome as TicketOutcome
            : 'needs_review';

        // 6. Calculate resolution metrics
        const metrics = calculateMetrics(ticket);

        // 7. Determine if we should auto-resolve
        const shouldAutoResolve =
            outcomeConfidence >= AUTO_RESOLVE_CONFIDENCE_THRESHOLD &&
            TERMINAL_OUTCOMES.includes(outcome);

        console.log(`🎯 [Quality Scoring] Outcome: ${outcome} (confidence: ${outcomeConfidence}%)`);
        console.log(`   Reasoning: ${analysis.outcome_reasoning}`);
        console.log(`   Should auto-resolve: ${shouldAutoResolve}`);

        // 8. Update the ticket with outcome, description, booking details, and transcript
        const ticketUpdates: any = {
            outcome,
            outcome_confidence: outcomeConfidence,
            resolution_channel: options?.channel || ticket.source || 'manual',
            description: analysis.feedback_summary || `Call analyzed: ${outcome}`,
            booking_details: analysis.booking_details || null,
            transcript: transcript,
        };

        if (shouldAutoResolve) {
            ticketUpdates.status = 'resolved';
            ticketUpdates.resolved_at = new Date().toISOString();
        }

        // Log booking details extraction
        if (analysis.booking_details) {
            console.log(`📋 [Quality Scoring] Extracted booking details:`);
            if (analysis.booking_details.vehicle?.make) {
                console.log(`   🚗 Vehicle: ${analysis.booking_details.vehicle.year || '?'} ${analysis.booking_details.vehicle.make} ${analysis.booking_details.vehicle.model || ''}`);
            }
            if (analysis.booking_details.service?.requested_service) {
                console.log(`   🔧 Service: ${analysis.booking_details.service.requested_service}`);
            }
            if (analysis.booking_details.missing_info?.length > 0) {
                console.log(`   ⚠️ Missing: ${analysis.booking_details.missing_info.join(', ')}`);
            }
        }

        await supabaseAdmin
            .from('tickets')
            .update(ticketUpdates)
            .eq('id', ticketId);

        // 9. Insert the scores into the database
        const { data: scoreRecord, error: insertError } = await supabaseAdmin
            .from('ticket_scores')
            .upsert({
                ticket_id: ticketId,
                agent_id: ticket.assigned_to,
                quickness_score: scores.quickness,
                knowledge_score: scores.knowledge,
                hospitality_score: scores.hospitality,
                intro_score: scores.intro,
                cta_score: scores.cta,
                total_score: totalScore,
                feedback_summary: analysis.feedback_summary || '',
                avg_response_time_minutes: avgResponseTime,
                outcome,
                resolution_channel: options?.channel || ticket.source || 'manual',
                time_to_first_response_minutes: metrics.timeToFirstResponse,
                time_to_resolution_minutes: shouldAutoResolve
                    ? ((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60))
                    : metrics.timeToResolution,
            }, {
                onConflict: 'ticket_id'
            })
            .select()
            .single();

        if (insertError) {
            console.error('❌ [Quality Scoring] Failed to insert scores:', insertError);
            return { success: false, error: 'Failed to save scores' };
        }

        console.log(`✅ [Quality Scoring] Analysis complete for ticket ${ticketId}`);
        console.log(`   📊 Scores: Q=${scores.quickness}, K=${scores.knowledge}, H=${scores.hospitality}, I=${scores.intro}, C=${scores.cta}`);
        console.log(`   📈 Total: ${totalScore}/100`);
        console.log(`   🎯 Outcome: ${outcome} (${outcomeConfidence}% confidence)`);
        console.log(`   ${shouldAutoResolve ? '✅ Auto-resolved' : '⏳ Needs human review'}`);

        return {
            success: true,
            scoreId: scoreRecord.id,
            outcome,
            autoResolved: shouldAutoResolve
        };

    } catch (error: any) {
        console.error('❌ [Quality Scoring] Unexpected error:', error);
        return { success: false, error: error.message || 'Unexpected error' };
    }
}

/**
 * Analyze a call directly from transcript (for Retell webhook)
 */
export async function analyzeCall(
    ticketId: string,
    callTranscript: any[],
    channel: 'phone' = 'phone'
): Promise<{
    success: boolean;
    scoreId?: string;
    outcome?: TicketOutcome;
    autoResolved?: boolean;
    error?: string;
}> {
    return analyzeTicket(ticketId, { channel, callTranscript });
}

/**
 * Get the score for a specific ticket
 */
export async function getTicketScore(ticketId: string): Promise<{
    success: boolean;
    score?: any;
    error?: string;
}> {
    const { data: score, error } = await supabaseAdmin
        .from('ticket_scores')
        .select('*')
        .eq('ticket_id', ticketId)
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, score };
}

/**
 * Get all scores for a specific agent
 */
export async function getAgentScores(agentId: string, limit = 50): Promise<{
    success: boolean;
    scores?: any[];
    averageScore?: number;
    error?: string;
}> {
    const { data: scores, error } = await supabaseAdmin
        .from('ticket_scores')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        return { success: false, error: error.message };
    }

    const averageScore = scores && scores.length > 0
        ? scores.reduce((sum, s) => sum + s.total_score, 0) / scores.length
        : 0;

    return { success: true, scores, averageScore };
}
