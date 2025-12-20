import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * GET /api/service-desk/tickets
 * Fetches tickets with messages for the Service Desk view
 */
export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // optional filter

    try {
        // Fetch tickets
        let ticketsQuery = supabase
            .from("tickets")
            .select("*")
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: false })
            .limit(50);

        if (status && status !== "all") {
            if (status === "urgent") {
                ticketsQuery = ticketsQuery.eq("priority", "urgent");
            } else if (status === "resolved") {
                ticketsQuery = ticketsQuery.in("status", ["resolved", "closed"]);
            } else {
                ticketsQuery = ticketsQuery.eq("status", status);
            }
        }

        const { data: tickets, error: ticketsError } = await ticketsQuery;

        if (ticketsError) {
            console.error("Error fetching tickets:", ticketsError);
            return NextResponse.json({ error: ticketsError.message }, { status: 500 });
        }

        // Get unique customer IDs
        const customerIds = [...new Set((tickets || [])
            .map(t => t.customer_id)
            .filter(Boolean)
        )];

        // Fetch customers
        let customersMap: Record<string, any> = {};
        if (customerIds.length > 0) {
            const { data: customers } = await supabase
                .from("customers")
                .select("id, first_name, last_name, phone_number, total_spend_cents, last_visit_date, tags")
                .in("id", customerIds);

            if (customers) {
                customersMap = Object.fromEntries(
                    customers.map(c => [c.id, c])
                );
            }
        }

        // Fetch messages for all tickets
        const ticketIds = (tickets || []).map(t => t.id);
        let messagesMap: Record<string, any[]> = {};

        if (ticketIds.length > 0) {
            // Get messages linked by customer_id (SMS conversations)
            const { data: messages } = await supabase
                .from("messages")
                .select("*")
                .eq("merchant_id", merchantId)
                .order("created_at", { ascending: true })
                .limit(200);

            // Also get ticket comments (internal notes, agent replies)
            const { data: comments } = await supabase
                .from("ticket_comments")
                .select("*")
                .in("ticket_id", ticketIds)
                .order("created_at", { ascending: true });

            // Group messages by customer phone (linking to tickets via customer)
            if (messages) {
                for (const msg of messages) {
                    // Find ticket for this customer
                    const ticket = (tickets || []).find(t => {
                        const customer = customersMap[t.customer_id];
                        return customer?.phone_number === msg.customer_phone;
                    });

                    if (ticket) {
                        if (!messagesMap[ticket.id]) messagesMap[ticket.id] = [];
                        messagesMap[ticket.id].push({
                            id: msg.id,
                            type: msg.direction === "inbound" ? "customer" : "agent",
                            content: msg.body,
                            sender_name: msg.direction === "inbound"
                                ? customersMap[ticket.customer_id]?.first_name || "Customer"
                                : "Shop",
                            created_at: msg.created_at
                        });
                    }
                }
            }

            // Add comments to messages
            if (comments) {
                for (const comment of comments) {
                    if (!messagesMap[comment.ticket_id]) messagesMap[comment.ticket_id] = [];
                    messagesMap[comment.ticket_id].push({
                        id: comment.id,
                        type: comment.is_internal ? "internal" : (comment.author_type === "system" ? "system" : "agent"),
                        content: comment.content,
                        sender_name: comment.author_name || "System",
                        created_at: comment.created_at
                    });
                }
            }

            // Sort messages by time
            for (const ticketId of Object.keys(messagesMap)) {
                messagesMap[ticketId].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
            }
        }

        // Build enriched tickets
        const enrichedTickets = (tickets || []).map(ticket => {
            const customer = customersMap[ticket.customer_id];
            const messages = messagesMap[ticket.id] || [];
            const lastMessage = messages[messages.length - 1];

            return {
                id: ticket.id,
                customer_id: ticket.customer_id,
                customer_name: customer
                    ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Unknown"
                    : "Unknown",
                customer_phone: customer?.phone_number,
                vehicle: ticket.vehicle_year ? {
                    year: ticket.vehicle_year,
                    make: ticket.vehicle_make,
                    model: ticket.vehicle_model,
                    color: ticket.vehicle_color,
                    vin: ticket.vehicle_vin
                } : undefined,
                title: ticket.title,
                preview: lastMessage?.content || ticket.description || "No messages",
                status: ticket.priority === "urgent" ? "urgent" :
                    ticket.status === "resolved" || ticket.status === "closed" ? "resolved" :
                        ticket.status === "pending" ? "waiting" : "open",
                priority: ticket.priority || "medium",
                channel: ticket.source || "sms",
                created_at: ticket.created_at,
                ltv: customer?.total_spend_cents ? Math.round(customer.total_spend_cents / 100) : undefined,
                last_visit: customer?.last_visit_date
                    ? new Date(customer.last_visit_date).toLocaleDateString()
                    : undefined,
                messages
            };
        });

        return NextResponse.json({ tickets: enrichedTickets });

    } catch (error: any) {
        console.error("Service desk tickets error:", error);
        return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
    }
}
