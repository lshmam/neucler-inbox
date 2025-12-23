import { getMerchantId } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { ServiceDeskClient } from "./service-desk-client";

export default async function ServiceDeskPage() {
    const merchantId = await getMerchantId();

    // Use the same approach as inbox - use the unified inbox RPC
    const { data: allInteractions, error: rpcError } = await supabaseAdmin
        .rpc('get_unified_inbox', { p_merchant_id: merchantId });

    if (rpcError) {
        console.error("[Service Desk] RPC Error:", rpcError);
    }

    // Fetch ALL customers for this merchant (including tags and vehicle info)
    const { data: customers } = await supabaseAdmin
        .from("customers")
        .select("id, first_name, last_name, phone_number, total_spend_cents, last_visit_date, tags, vehicle_year, vehicle_make, vehicle_model, service_requested")
        .eq("merchant_id", merchantId);

    const phoneToCustomerMap = new Map<string, any>();
    for (const c of (customers || [])) {
        if (c.phone_number) {
            phoneToCustomerMap.set(c.phone_number, c);
        }
    }

    console.log(`[Service Desk] Fetched ${customers?.length || 0} customers`);
    console.log(`[Service Desk] Fetched ${allInteractions?.length || 0} interactions from RPC`);

    // Fetch tickets for status info
    const { data: tickets } = await supabaseAdmin
        .from("tickets")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });

    // Fetch deals to associate with conversations
    const { data: deals } = await supabaseAdmin
        .from("deals")
        .select("id, customer_id, customer_phone, status, value, title")
        .eq("merchant_id", merchantId);

    // Fetch call logs for summaries and transcripts
    const { data: callLogs } = await supabaseAdmin
        .from("call_logs")
        .select("id, customer_phone, summary, transcript, created_at, direction, status")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });

    console.log(`[Service Desk] Fetched ${callLogs?.length || 0} call logs`);

    // Log a sample to understand the data
    if (callLogs && callLogs.length > 0) {
        const sample = callLogs[0];
        console.log(`[Service Desk] Sample call log:`, {
            id: sample.id,
            phone: sample.customer_phone,
            hasSummary: !!sample.summary,
            hasTranscript: !!sample.transcript,
            transcriptType: typeof sample.transcript,
            transcriptLength: Array.isArray(sample.transcript) ? sample.transcript.length : 'not array'
        });
    }

    // Build call logs map by customer_phone (most recent call per phone)
    const callLogsByPhone = new Map<string, any[]>();
    for (const cl of (callLogs || [])) {
        if (cl.customer_phone) {
            if (!callLogsByPhone.has(cl.customer_phone)) {
                callLogsByPhone.set(cl.customer_phone, []);
            }
            callLogsByPhone.get(cl.customer_phone)!.push(cl);
        }
    }

    console.log(`[Service Desk] Call logs by phone - ${callLogsByPhone.size} unique phones`);
    // Build deals map by customer_phone for quick lookup
    const dealsByPhone = new Map<string, any>();
    for (const d of (deals || [])) {
        if (d.customer_phone && !dealsByPhone.has(d.customer_phone)) {
            dealsByPhone.set(d.customer_phone, d);
        }
    }

    // Build tickets map by customer_id
    const ticketsByCustomerId = new Map<string, any>();
    for (const t of (tickets || [])) {
        if (t.customer_id && !ticketsByCustomerId.has(t.customer_id)) {
            ticketsByCustomerId.set(t.customer_id, t);
        }
    }


    // GROUP ALL INTERACTIONS BY PHONE/CONTACT POINT
    const conversationsMap = new Map<string, any>();
    const phoneChannels = new Set<string>();
    for (const interaction of (allInteractions || [])) {
        const phone = interaction.contact_point;
        if (!phone) continue;

        if (!conversationsMap.has(phone)) {
            const customer = phoneToCustomerMap.get(phone);
            conversationsMap.set(phone, {
                contact_point: phone,
                customer_id: customer?.id || interaction.customer_id,
                customer_name: customer
                    ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Unknown"
                    : "Unknown",
                customer_phone: phone,
                messages: [],
                channels: new Set<string>()
            });
        }

        const convo = conversationsMap.get(phone);

        // Determine message type based on direction and channel
        let msgType: "customer" | "agent" | "system" = "customer";
        if (interaction.direction === "outbound") {
            msgType = "agent";
        } else if (interaction.channel === "phone") {
            msgType = "system";
        }

        // For phone calls, find the matching call log to get summary and transcript
        let callSummary: string | undefined;
        let callTranscript: any[] | undefined;

        // Check if this interaction IS a call log (by matching ID)
        const customerCallLogs = callLogsByPhone.get(phone) || [];

        // First try to match by ID (in case the RPC returns call_log IDs directly)
        let matchingCallLog = customerCallLogs.find(cl => cl.id === interaction.id);

        // If no ID match and it's a phone channel, try time-based matching
        if (!matchingCallLog && interaction.channel === "phone") {
            const interactionTime = new Date(interaction.created_at).getTime();
            matchingCallLog = customerCallLogs.find(cl => {
                const callTime = new Date(cl.created_at).getTime();
                return Math.abs(callTime - interactionTime) < 10 * 60 * 1000; // 10 minute window
            });
        }

        // If we found a matching call log, populate summary/transcript
        if (matchingCallLog) {
            callSummary = matchingCallLog.summary;
            callTranscript = matchingCallLog.transcript;
            msgType = "system"; // It's a call, so display as system message
            console.log(`[Service Desk] ✅ Matched call ${interaction.id.substring(0, 8)} to call log: summary=${!!callSummary}, transcript=${!!callTranscript}`);
        }

        convo.messages.push({
            id: interaction.id,
            type: msgType,
            content: matchingCallLog
                ? `📞 Call ${matchingCallLog.direction === 'inbound' ? 'received' : 'made'}`
                : (interaction.content || `📞 Call ${interaction.direction === 'inbound' ? 'received' : 'made'}`),
            sender_name: interaction.direction === "inbound" ? convo.customer_name : "Shop",
            created_at: interaction.created_at,
            channel: matchingCallLog ? "phone" : interaction.channel,
            callSummary,
            callTranscript
        });
        convo.channels.add(matchingCallLog ? "phone" : interaction.channel);
        if (matchingCallLog || interaction.channel === 'phone') {
            phoneChannels.add(phone);
        }
    }

    console.log(`[Service Desk] Phone interactions from: ${Array.from(phoneChannels).join(', ') || 'none'}`);
    console.log(`[Service Desk] Call logs available for: ${Array.from(callLogsByPhone.keys()).join(', ') || 'none'}`);

    // Also inject call_logs directly if they weren't captured via unified_inbox
    // This ensures we don't miss any calls with transcripts
    console.log(`[Service Desk] Injecting call logs. ConversationsMap has phones: ${Array.from(conversationsMap.keys()).join(', ') || 'none'}`);

    for (const [phone, callLogs] of callLogsByPhone.entries()) {
        console.log(`[Service Desk] Processing call logs for ${phone}: ${callLogs.length} calls. Conversation exists: ${conversationsMap.has(phone)}`);

        if (!conversationsMap.has(phone)) {
            // Create a new conversation for this phone
            const customerData = phoneToCustomerMap.get(phone);
            console.log(`[Service Desk] Creating new conversation for ${phone}. Customer data: ${customerData ? customerData.first_name : 'not found'}`);
            conversationsMap.set(phone, {
                contact_point: phone,
                customer_id: customerData?.id || `temp-${phone}`,
                customer_name: customerData
                    ? `${customerData.first_name || ""} ${customerData.last_name || ""}`.trim() || "Unknown"
                    : "Unknown Caller",
                customer_phone: phone,
                messages: [],
                channels: new Set<string>()
            });
        }

        const convo = conversationsMap.get(phone);
        console.log(`[Service Desk] Convo for ${phone} has ${convo.messages.length} messages. Sample channels: ${convo.messages.slice(0, 3).map((m: any) => m.channel).join(', ')}`);

        // Check if each call log is already represented in messages
        for (const cl of callLogs) {
            const callTime = new Date(cl.created_at).getTime();
            // Check if this call already exists by ID or by timestamp proximity
            let existReason = '';
            const alreadyExists = convo.messages.some((m: any) => {
                if (m.id === cl.id || m.id === `calllog-${cl.id}`) {
                    existReason = `ID match: ${m.id}`;
                    return true;
                }
                if (m.channel !== 'phone') return false;
                const msgTime = new Date(m.created_at).getTime();
                if (Math.abs(msgTime - callTime) < 10 * 60 * 1000) {
                    existReason = `Time match: ${Math.abs(msgTime - callTime)}ms`;
                    return true;
                }
                return false;
            });

            console.log(`[Service Desk] Call ${cl.id.substring(0, 8)}: alreadyExists=${alreadyExists}, reason=${existReason}, hasSummary=${!!cl.summary}, hasTranscript=${!!cl.transcript}`);

            if (!alreadyExists && (cl.summary || cl.transcript)) {
                // Use a prefixed ID to ensure uniqueness
                convo.messages.push({
                    id: `calllog-${cl.id}`,
                    type: "system" as const,
                    content: `📞 Call ${cl.direction === 'inbound' ? 'received' : 'made'}`,
                    sender_name: cl.direction === "inbound" ? convo.customer_name : "Shop",
                    created_at: cl.created_at,
                    channel: "phone",
                    callSummary: cl.summary,
                    callTranscript: cl.transcript
                });
                convo.channels.add("phone");
                console.log(`[Service Desk] ✅ Injected call log for ${phone} with summary/transcript`);
            }
        }
    }

    // Build final conversations array
    const enrichedTickets = Array.from(conversationsMap.values()).map(convo => {
        // Sort messages by time
        convo.messages.sort((a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const lastMessage = convo.messages[convo.messages.length - 1];
        const firstMessage = convo.messages[0];

        // Get associated ticket for status
        const customer = convo.customer_id ? phoneToCustomerMap.get(convo.customer_phone) : null;
        const ticket = convo.customer_id ? ticketsByCustomerId.get(convo.customer_id) : null;
        const deal = dealsByPhone.get(convo.customer_phone);

        // Determine primary channel
        const channels = Array.from(convo.channels) as string[];
        const primaryChannel = channels.includes("phone") ? "phone" : "sms";

        // Determine if unread (last message is from customer)
        const isUnread = lastMessage?.type === "customer";

        return {
            id: ticket?.id || `convo-${convo.contact_point}`,
            customerId: convo.customer_id || `cust-${convo.contact_point}`,
            customerName: convo.customer_name,
            customerPhone: convo.customer_phone,
            vehicle: ticket?.vehicle_year ? {
                year: ticket.vehicle_year,
                make: ticket.vehicle_make,
                model: ticket.vehicle_model,
                color: ticket.vehicle_color,
                vin: ticket.vehicle_vin
            } : undefined,
            vehicleYear: customer?.vehicle_year,
            vehicleMake: customer?.vehicle_make,
            vehicleModel: customer?.vehicle_model,
            serviceRequested: customer?.service_requested,
            ltv: customer?.total_spend_cents ? Math.round(customer.total_spend_cents / 100) : undefined,
            lastVisit: customer?.last_visit_date
                ? new Date(customer.last_visit_date).toLocaleDateString()
                : undefined,
            unread: isUnread,
            lastMessageAt: lastMessage?.created_at || new Date().toISOString(),
            ticket: ticket ? {
                id: ticket.id,
                number: ticket.ticket_number || 1,
                subject: ticket.title,
                status: ticket.status,
                priority: ticket.priority,
                assignee: ticket.assigned_to,
                createdAt: ticket.created_at
            } : undefined,
            messages: convo.messages.map((m: any) => ({
                id: m.id,
                type: m.type,
                content: m.content,
                sender: m.sender_name,
                timestamp: m.created_at,
                callSummary: m.callSummary,
                callTranscript: m.callTranscript
            })),
            deal: deal ? {
                id: deal.id,
                title: deal.title || `Deal with ${convo.customer_name}`,
                stage: deal.status as "new_inquiry" | "quote_sent" | "follow_up" | "booked",
                value: deal.value || 0
            } : undefined,
            tags: customer?.tags || [],
            pastTickets: []
        };
    });

    // Sort by most recent message
    enrichedTickets.sort((a, b) => {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    console.log(`[Service Desk] ${enrichedTickets.length} unique conversations`);

    return (
        <div className="h-screen overflow-hidden">
            <ServiceDeskClient initialTickets={enrichedTickets} merchantId={merchantId} />
        </div>
    );
}
