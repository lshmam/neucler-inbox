import { getMerchantId } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";
import { ServiceDeskClient } from "./service-desk-client";

export default async function ServiceDeskPage() {
    const merchantId = await getMerchantId();
    const supabase = await createClient();

    // Fetch ALL customers for this merchant
    const { data: customers } = await supabase
        .from("customers")
        .select("id, first_name, last_name, phone_number, total_spend_cents, last_visit_date")
        .eq("merchant_id", merchantId);

    const customersMap = new Map<string, any>();
    const phoneToCustomerMap = new Map<string, any>();

    for (const c of (customers || [])) {
        customersMap.set(c.id, c);
        if (c.phone_number) {
            phoneToCustomerMap.set(c.phone_number, c);
        }
    }

    console.log(`[Service Desk] Fetched ${customers?.length || 0} customers`);

    // Fetch ALL messages (SMS)
    const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: true })
        .limit(500);

    console.log(`[Service Desk] Fetched ${messages?.length || 0} SMS messages`);

    // Fetch ALL call logs
    const { data: callLogs } = await supabase
        .from("call_logs")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: true })
        .limit(200);

    console.log(`[Service Desk] Fetched ${callLogs?.length || 0} call logs`);

    // Fetch tickets for status info
    const { data: tickets } = await supabase
        .from("tickets")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });

    // Build tickets map by customer_id
    const ticketsByCustomerId = new Map<string, any>();
    for (const t of (tickets || [])) {
        if (t.customer_id && !ticketsByCustomerId.has(t.customer_id)) {
            ticketsByCustomerId.set(t.customer_id, t);
        }
    }

    // GROUP ALL INTERACTIONS BY PHONE NUMBER (like Inbox does)
    const conversationsMap = new Map<string, any>();

    // Process SMS messages
    for (const msg of (messages || [])) {
        const phone = msg.customer_phone;
        if (!phone) continue;

        if (!conversationsMap.has(phone)) {
            const customer = phoneToCustomerMap.get(phone);
            conversationsMap.set(phone, {
                contact_point: phone,
                customer_id: customer?.id,
                customer_name: customer
                    ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Unknown Message"
                    : "Unknown Message",
                customer_phone: phone,
                messages: [],
                channels: new Set<string>()
            });
        }

        const convo = conversationsMap.get(phone);
        convo.messages.push({
            id: msg.id,
            type: msg.direction === "inbound" ? "customer" : "agent",
            content: msg.body,
            sender_name: msg.direction === "inbound" ? convo.customer_name : "Shop",
            created_at: msg.created_at,
            channel: "sms"
        });
        convo.channels.add("sms");
    }

    // Process call logs
    for (const call of (callLogs || [])) {
        const phone = call.customer_phone;
        if (!phone) continue;

        if (!conversationsMap.has(phone)) {
            const customer = phoneToCustomerMap.get(phone);
            conversationsMap.set(phone, {
                contact_point: phone,
                customer_id: customer?.id,
                customer_name: customer
                    ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Unknown Caller"
                    : "Unknown Caller",
                customer_phone: phone,
                messages: [],
                channels: new Set<string>()
            });
        }

        const convo = conversationsMap.get(phone);

        // Add call as a system message
        const duration = call.duration_seconds
            ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
            : 'unknown duration';

        convo.messages.push({
            id: `call-${call.id}`,
            type: "system",
            content: `📞 Phone Call ${call.direction === 'inbound' ? 'received' : 'made'} (${duration})`,
            sender_name: "System",
            created_at: call.created_at,
            channel: "phone"
        });

        // Add call summary if exists
        if (call.summary) {
            convo.messages.push({
                id: `call-summary-${call.id}`,
                type: "system",
                content: `📋 Call Summary: ${call.summary}`,
                sender_name: "AI",
                created_at: call.created_at,
                channel: "phone"
            });
        }

        convo.channels.add("phone");
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
        const customer = convo.customer_id ? customersMap.get(convo.customer_id) : null;
        const ticket = convo.customer_id ? ticketsByCustomerId.get(convo.customer_id) : null;

        // Determine primary channel
        const channels = Array.from(convo.channels) as string[];
        const primaryChannel = channels.includes("phone") ? "phone" : "sms";

        return {
            id: ticket?.id || `convo-${convo.contact_point}`,
            customer_id: convo.customer_id,
            customer_name: convo.customer_name,
            customer_phone: convo.customer_phone,
            vehicle: ticket?.vehicle_year ? {
                year: ticket.vehicle_year,
                make: ticket.vehicle_make,
                model: ticket.vehicle_model,
                color: ticket.vehicle_color,
                vin: ticket.vehicle_vin
            } : undefined,
            title: ticket?.title || `Conversation with ${convo.customer_phone}`,
            preview: lastMessage?.content || "No messages",
            status: ticket?.priority === "urgent" ? "urgent" :
                ticket?.status === "resolved" || ticket?.status === "closed" ? "resolved" :
                    ticket?.status === "pending" ? "waiting" : "open",
            priority: ticket?.priority || "medium",
            channel: primaryChannel,
            created_at: firstMessage?.created_at || new Date().toISOString(),
            ltv: customer?.total_spend_cents ? Math.round(customer.total_spend_cents / 100) : undefined,
            last_visit: customer?.last_visit_date
                ? new Date(customer.last_visit_date).toLocaleDateString()
                : undefined,
            messages: convo.messages,
            // Ticket status for Open Tickets panel
            hasTicket: ticket && ticket.status !== 'resolved' && ticket.status !== 'closed',
            ticketId: ticket?.id
        };
    });

    // Sort by most recent message
    enrichedTickets.sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.created_at || a.created_at;
        const bLast = b.messages[b.messages.length - 1]?.created_at || b.created_at;
        return new Date(bLast).getTime() - new Date(aLast).getTime();
    });

    console.log(`[Service Desk] ${enrichedTickets.length} unique conversations`);

    return (
        <div className="h-screen overflow-hidden">
            <ServiceDeskClient initialTickets={enrichedTickets} merchantId={merchantId} />
        </div>
    );
}
