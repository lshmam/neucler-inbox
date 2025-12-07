import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Plan limits for AI replies per month
const PLAN_LIMITS: Record<string, number> = {
    'trialing': 50,
    'active': 500,
    'pro': -1, // Unlimited
};

interface AIReplyResult {
    success: boolean;
    reply?: string;
    error?: string;
    limitReached?: boolean;
}

/**
 * Check if merchant has reached their AI reply limit
 */
async function checkUsageLimit(merchantId: string): Promise<{ allowed: boolean; remaining: number }> {
    // 1. Get merchant's subscription status
    const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('subscription_status, subscription_tier')
        .eq('id', merchantId)
        .single();

    const status = merchant?.subscription_tier || merchant?.subscription_status || 'trialing';
    const limit = PLAN_LIMITS[status] ?? PLAN_LIMITS['trialing'];

    // Unlimited plan
    if (limit === -1) {
        return { allowed: true, remaining: -1 };
    }

    // 2. Get current month's usage
    const monthYear = new Date().toISOString().slice(0, 7); // "2024-12"

    const { data: usage } = await supabaseAdmin
        .from('ai_reply_usage')
        .select('reply_count')
        .eq('merchant_id', merchantId)
        .eq('month_year', monthYear)
        .single();

    const currentCount = usage?.reply_count || 0;
    const remaining = limit - currentCount;

    return {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining)
    };
}

/**
 * Increment the AI reply usage counter
 */
async function incrementUsage(merchantId: string): Promise<void> {
    const monthYear = new Date().toISOString().slice(0, 7);

    // Try RPC first, fallback to manual upsert
    try {
        const { error } = await supabaseAdmin.rpc('increment_ai_usage', {
            p_merchant_id: merchantId,
            p_month_year: monthYear
        });

        if (error) throw error;
    } catch {
        // Fallback: manual upsert
        const { data: existing } = await supabaseAdmin
            .from('ai_reply_usage')
            .select('id, reply_count')
            .eq('merchant_id', merchantId)
            .eq('month_year', monthYear)
            .single();

        if (existing) {
            await supabaseAdmin
                .from('ai_reply_usage')
                .update({ reply_count: existing.reply_count + 1, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            await supabaseAdmin
                .from('ai_reply_usage')
                .insert({ merchant_id: merchantId, month_year: monthYear, reply_count: 1 });
        }
    }
}

/**
 * Fetch Knowledge Base context for the merchant
 */
async function getKnowledgeBaseContext(merchantId: string): Promise<string> {
    // Fetch articles
    const { data: articles } = await supabaseAdmin
        .from('knowledge_base_articles')
        .select('title, content, category')
        .eq('merchant_id', merchantId)
        .eq('is_published', true)
        .limit(10);

    // Fetch business profile
    const { data: profile } = await supabaseAdmin
        .from('business_profiles')
        .select('services_summary, business_hours, ai_tone, ai_name')
        .eq('merchant_id', merchantId)
        .single();

    // Fetch business name
    const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('business_name')
        .eq('id', merchantId)
        .single();

    // Build context string
    let context = '';

    if (merchant?.business_name) {
        context += `Business Name: ${merchant.business_name}\n`;
    }

    if (profile?.services_summary) {
        context += `\nServices: ${profile.services_summary}\n`;
    }

    if (profile?.business_hours) {
        let hours = profile.business_hours;
        if (typeof hours === 'string') {
            try { hours = JSON.parse(hours); } catch { }
        }
        if (Array.isArray(hours)) {
            context += `\nBusiness Hours:\n${hours.join('\n')}\n`;
        }
    }

    if (articles && articles.length > 0) {
        context += '\n\nKnowledge Base Q&A:\n';
        articles.forEach(a => {
            context += `Q: ${a.title}\nA: ${a.content}\n\n`;
        });
    }

    return context;
}

/**
 * Generate an AI reply using Gemini with Knowledge Base context
 */
export async function generateAIReply(
    merchantId: string,
    customerMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    channel: 'sms' | 'email' | 'widget' = 'sms'
): Promise<AIReplyResult> {
    try {
        // 1. Check usage limit
        const { allowed, remaining } = await checkUsageLimit(merchantId);
        if (!allowed) {
            console.log(`⚠️ [AI Reply] Merchant ${merchantId} has reached their limit`);
            return { success: false, limitReached: true, error: 'Monthly AI reply limit reached' };
        }

        // 2. Get KB context
        const kbContext = await getKnowledgeBaseContext(merchantId);

        // 3. Build system prompt
        const { data: profile } = await supabaseAdmin
            .from('business_profiles')
            .select('ai_tone, ai_name')
            .eq('merchant_id', merchantId)
            .single();

        const aiName = profile?.ai_name || 'Alex';
        const aiTone = profile?.ai_tone || 'friendly and professional';

        const channelInstructions = {
            sms: 'Keep responses SHORT (under 160 characters if possible). Be concise.',
            email: 'Be professional. Include a greeting and sign-off.',
            widget: 'Be helpful and conversational. Keep responses concise.'
        };

        const systemPrompt = `You are ${aiName}, a ${aiTone} AI assistant for this business.

${kbContext}

INSTRUCTIONS:
- Answer customer questions based on the knowledge base above
- If you don't know something, politely say you'll have someone follow up
- ${channelInstructions[channel]}
- Never make up information not in the knowledge base
- Be warm and helpful`;

        // 4. Build messages
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const chatHistory = conversationHistory.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: `System Instructions: ${systemPrompt}` }] },
                { role: 'model', parts: [{ text: 'Understood. I am ready to help customers.' }] },
                ...chatHistory
            ],
            generationConfig: {
                maxOutputTokens: channel === 'sms' ? 100 : 300,
                temperature: 0.7,
            },
        });

        // 5. Generate reply
        const result = await chat.sendMessage(customerMessage);
        const reply = result.response.text();

        // 6. Increment usage
        await incrementUsage(merchantId);

        console.log(`✅ [AI Reply] Generated for ${merchantId} (${remaining - 1} remaining)`);

        return { success: true, reply };

    } catch (error: any) {
        console.error('❌ [AI Reply] Generation Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if AI auto-reply is enabled for a merchant
 */
export async function isAutoReplyEnabled(merchantId: string, channel: 'sms' | 'email' | 'widget'): Promise<boolean> {
    const { data: automation } = await supabaseAdmin
        .from('automations')
        .select('is_active, config')
        .eq('merchant_id', merchantId)
        .eq('type', 'ai_auto_reply')
        .single();

    if (!automation?.is_active) return false;

    // Check if this channel is enabled in config
    const config = automation.config || {};
    const channels = config.channels || ['sms', 'email', 'widget'];

    return channels.includes(channel);
}
