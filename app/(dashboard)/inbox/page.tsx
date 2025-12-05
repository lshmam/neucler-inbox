import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { InboxClient } from "./inbox-client"; // Your existing client component
import { getMerchantId } from "@/lib/auth-helpers"; // Your helper for getting the merchant ID

export default async function UnifiedInboxPage() {
    const merchantId = await getMerchantId();

    // --- STEP 1: Fetch the single, unified feed from the database ---
    // The database function does all the hard work of combining SMS, calls, and emails.
    const { data: allInteractions, error: rpcError } = await supabaseAdmin
        .rpc('get_unified_inbox', { p_merchant_id: merchantId });

    // Handle potential errors from the database function
    if (rpcError) {
        console.error("Critical Error: Failed to fetch unified inbox from database.", rpcError);
        // Render the inbox empty, but it will still be functional
        return <InboxClient initialConversations={[]} merchantId={merchantId} />;
    }

    // --- STEP 2: Fetch all customers for name/profile mapping ---
    // This is efficient because it's one simple query.
    const { data: customers } = await supabaseAdmin
        .from("customers")
        .select("id, first_name, last_name, phone_number, email")
        .eq("merchant_id", merchantId);

    // --- STEP 3: Group the unified feed into conversations ---
    // This JavaScript logic is now much simpler because the data is clean.
    const conversationsMap = new Map();

    for (const interaction of allInteractions) {
        // Find the associated customer profile. This is our "source of truth".
        const customer = customers?.find(c =>
            (c.id && c.id === interaction.customer_id) ||
            (c.phone_number && c.phone_number === interaction.contact_point) ||
            (c.email && c.email === interaction.contact_point)
        );

        // The key for a conversation is always the permanent customer ID if it exists.
        const conversationKey = customer?.id || interaction.contact_point;

        if (!conversationKey) continue; // Skip orphaned interactions

        // If this is the first message for this conversation, create the conversation object.
        if (!conversationsMap.has(conversationKey)) {
            conversationsMap.set(conversationKey, {
                customer_id: customer?.id || conversationKey, // Use the permanent ID
                display_name: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : interaction.contact_point,
                contact_point: interaction.contact_point,
                tags: [], // You can add tag logic later
                messages: []
            });
        }

        // Add the current interaction to this conversation's message list
        const conversation = conversationsMap.get(conversationKey);
        conversation.messages.push(interaction);
    }

    // --- STEP 4: Finalize conversation objects with latest message details ---
    const conversations = Array.from(conversationsMap.values()).map(convo => {
        // The last message in the array is the most recent because our SQL function sorts by date.
        const lastMessage = convo.messages[convo.messages.length - 1];

        return {
            ...convo,
            last_message_preview: lastMessage.content.substring(0, 100),
            last_message_at: lastMessage.created_at,
            last_channel: lastMessage.channel,
            // You can add logic here to determine the status, e.g., if the last message was inbound.
            status: 'needs_attention',
        };
    });

    // Sort the entire conversation list so the most recent ones are at the top.
    conversations.sort((a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    // --- STEP 5: Pass the complete, unified data to your existing client component ---
    return <InboxClient initialConversations={conversations} merchantId={merchantId} />;
}