import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { InboxClient } from "./inbox-client";
import { getMerchantId } from "@/lib/auth-helpers";

export default async function UnifiedInboxPage() {
    const merchantId = await getMerchantId();

    // Fetch AI Auto-Reply status
    const { data: aiAutoReply } = await supabaseAdmin
        .from("automations")
        .select("is_active, config")
        .eq("merchant_id", merchantId)
        .eq("type", "ai_auto_reply")
        .single();

    const isAiEnabled = aiAutoReply?.is_active || false;

    // Fetch the unified feed from the database
    const { data: allInteractions, error: rpcError } = await supabaseAdmin
        .rpc('get_unified_inbox', { p_merchant_id: merchantId });

    if (rpcError) {
        console.error("Critical Error: Failed to fetch unified inbox from database.", rpcError);
        return <InboxClient initialConversations={[]} merchantId={merchantId} isAiEnabled={isAiEnabled} />;
    }

    // Fetch all customers for name/profile/tags mapping
    const { data: customers } = await supabaseAdmin
        .from("customers")
        .select("id, first_name, last_name, phone_number, email, tags, status")
        .eq("merchant_id", merchantId);

    // Group the unified feed into conversations
    const conversationsMap = new Map();

    for (const interaction of allInteractions) {
        const customer = customers?.find(c =>
            (c.id && c.id === interaction.customer_id) ||
            (c.phone_number && c.phone_number === interaction.contact_point) ||
            (c.email && c.email === interaction.contact_point)
        );

        const conversationKey = customer?.id || interaction.contact_point;

        if (!conversationKey) continue;

        if (!conversationsMap.has(conversationKey)) {
            conversationsMap.set(conversationKey, {
                customer_id: customer?.id || conversationKey,
                display_name: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : interaction.contact_point,
                contact_point: interaction.contact_point,
                tags: customer?.tags || [],
                customerStatus: customer?.status || 'new_lead',
                messages: []
            });
        }

        const conversation = conversationsMap.get(conversationKey);
        conversation.messages.push(interaction);
    }

    // Finalize conversation objects with latest message details
    const conversations = Array.from(conversationsMap.values()).map(convo => {
        const lastMessage = convo.messages[convo.messages.length - 1];
        const hasNeedsHumanTag = convo.tags?.includes('needs_human');
        const isResolved = convo.customerStatus === 'resolved';

        // Needs attention if:
        // 1. NOT explicitly resolved
        // 2. AND (last message was from customer OR has 'needs_human' tag OR status is 'needs_attention')
        const needsAttention = !isResolved && (
            lastMessage.direction === 'inbound' ||
            hasNeedsHumanTag ||
            convo.customerStatus === 'needs_attention'
        );

        return {
            ...convo,
            last_message_preview: lastMessage.content.substring(0, 100),
            last_message_at: lastMessage.created_at,
            last_channel: lastMessage.channel,
            status: needsAttention ? 'needs_attention' : 'responded',
        };
    });

    conversations.sort((a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    return (
        <div className="h-full overflow-hidden">
            <InboxClient initialConversations={conversations} merchantId={merchantId} isAiEnabled={isAiEnabled} />
        </div>
    );
}