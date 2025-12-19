import { getMerchantId } from "@/lib/auth-helpers";
import { createClient as supabaseAdmin } from "@supabase/supabase-js";
import { TicketsClient } from "./tickets-client";

// Initialize admin client for server-side data fetching
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

function createClient(url: string, key: string) {
    return supabaseAdmin(url, key);
}

export default async function TicketsPage() {
    const merchantId = await getMerchantId();

    // Fetch tickets without join (no FK relationship with customers)
    const { data: tickets, error } = await adminClient
        .from("tickets")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching tickets:", error);
    }

    // Get unique customer IDs
    const customerIds = [...new Set((tickets || [])
        .map(t => t.customer_id)
        .filter(Boolean)
    )];

    // Fetch customers separately
    let customersMap: Record<string, any> = {};
    if (customerIds.length > 0) {
        const { data: customers } = await adminClient
            .from("customers")
            .select("id, first_name, last_name, email, phone_number")
            .in("id", customerIds);

        if (customers) {
            customersMap = Object.fromEntries(
                customers.map(c => [c.id, c])
            );
        }
    }

    // Fetch ticket scores
    const ticketIds = (tickets || []).map(t => t.id);
    let scoresMap: Record<string, any> = {};
    if (ticketIds.length > 0) {
        const { data: scores } = await adminClient
            .from("ticket_scores")
            .select("ticket_id, total_score, quickness_score, knowledge_score, hospitality_score, intro_score, cta_score, feedback_summary")
            .in("ticket_id", ticketIds);

        if (scores) {
            scoresMap = Object.fromEntries(
                scores.map(s => [s.ticket_id, {
                    total_score: s.total_score,
                    quickness_score: s.quickness_score,
                    knowledge_score: s.knowledge_score,
                    hospitality_score: s.hospitality_score,
                    intro_score: s.intro_score,
                    cta_score: s.cta_score,
                    feedback_summary: s.feedback_summary
                }])
            );
        }
    }

    // Attach customer and score data to tickets
    const ticketsWithCustomers = (tickets || []).map(ticket => ({
        ...ticket,
        customers: ticket.customer_id ? customersMap[ticket.customer_id] || null : null,
        score: scoresMap[ticket.id] || null
    }));

    // Calculate stats
    const allTickets = ticketsWithCustomers;
    const stats = {
        total: allTickets.length,
        open: allTickets.filter(t => t.status === "open").length,
        in_progress: allTickets.filter(t => t.status === "in_progress").length,
        pending: allTickets.filter(t => t.status === "pending").length,
        resolved: allTickets.filter(t => t.status === "resolved").length,
        closed: allTickets.filter(t => t.status === "closed").length,
        urgent: allTickets.filter(t => t.priority === "urgent").length,
        high: allTickets.filter(t => t.priority === "high").length,
        avgResolutionHours: 0
    };

    // Calculate average resolution time
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    allTickets.forEach(ticket => {
        if (ticket.resolved_at && ticket.created_at) {
            const created = new Date(ticket.created_at);
            const resolved = new Date(ticket.resolved_at);
            totalResolutionTime += (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
            resolvedCount++;
        }
    });
    if (resolvedCount > 0) {
        stats.avgResolutionHours = Math.round(totalResolutionTime / resolvedCount);
    }

    return (
        <div className="h-full overflow-auto">
            <TicketsClient
                initialTickets={allTickets}
                initialStats={stats}
                merchantId={merchantId}
            />
        </div>
    );
}
