import { getMerchantId } from "@/lib/auth-helpers";
import { getRetellCallLogs } from "@/lib/retell";
import { supabaseAdmin } from "@/lib/supabase";
import { CommunicationsClient } from "./client-view";

export default async function CommunicationsPage() {
    const merchantId = await getMerchantId();

    // 1. Fetch SMS & Web Chats (From DB)
    const { data: dbMessages } = await supabaseAdmin
        .from("messages")
        .select("*, customers(first_name, last_name, phone_number, email)")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(50);

    // 2. Fetch AI Calls (From Retell API)
    const retellCalls = await getRetellCallLogs(20);

    // 3. Fetch Sent Emails (From DB)
    const { data: emails } = await supabaseAdmin
        .from("email_campaigns")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(20);

    // 4. NORMALIZE DATA (The Magic Step)
    // We convert everything into a standard "Interaction" format for the UI

    const interactions = [
        // Process DB Messages (SMS/Web)
        ...(dbMessages || []).map((msg: any) => ({
            id: msg.id,
            type: msg.channel || 'sms', // 'sms' or 'web_chat'
            direction: msg.direction, // 'inbound' or 'outbound'
            customer: msg.customers?.first_name ? `${msg.customers.first_name} ${msg.customers.last_name}` : msg.customer_id || "Unknown",
            contact_info: msg.customers?.phone_number || "Unknown",
            timestamp: msg.created_at,
            content: msg.content,
            status: msg.status,
            summary: null,
            recording: null
        })),

        // Process Retell Calls
        ...retellCalls.map((call: any) => ({
            id: call.call_id,
            type: 'voice',
            direction: 'inbound', // Retell calls are usually inbound to the agent
            customer: "Caller", // You'd look this up by phone number in a real app
            contact_info: call.customer_phone,
            timestamp: new Date(call.start_timestamp).toISOString(),
            content: call.transcript || "No transcript available",
            status: call.call_status,
            summary: call.call_analysis?.call_summary || "AI is processing summary...", // Retell provides this!
            recording: call.recording_url,
            duration: Math.round(call.duration_ms / 1000)
        })),

        // Process Emails
        ...(emails || []).map((email: any) => ({
            id: email.id,
            type: 'email',
            direction: 'outbound',
            customer: email.audience === 'all' ? 'All Customers' : 'Segment',
            contact_info: `${email.sent_count} Recipients`,
            timestamp: email.created_at,
            content: email.body, // HTML body
            subject: email.subject,
            status: email.status,
            summary: `Campaign: ${email.name}`
        }))
    ];

    // Sort combined list by date (newest first)
    interactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return <CommunicationsClient initialData={interactions} />;
}