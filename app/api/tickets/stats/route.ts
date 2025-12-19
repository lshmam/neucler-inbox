import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET /api/tickets/stats - Get ticket statistics
export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;

    try {
        // Get counts by status
        const { data: tickets, error } = await supabase
            .from("tickets")
            .select("status, priority, resolved_at, created_at")
            .eq("merchant_id", merchantId);

        if (error) {
            console.error("Error fetching ticket stats:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const now = new Date();
        const stats = {
            total: tickets?.length || 0,
            open: 0,
            in_progress: 0,
            pending: 0,
            resolved: 0,
            closed: 0,
            urgent: 0,
            high: 0,
            overdue: 0,
            avgResolutionHours: 0
        };

        let totalResolutionTime = 0;
        let resolvedCount = 0;

        tickets?.forEach(ticket => {
            // Count by status
            if (ticket.status === 'open') stats.open++;
            else if (ticket.status === 'in_progress') stats.in_progress++;
            else if (ticket.status === 'pending') stats.pending++;
            else if (ticket.status === 'resolved') stats.resolved++;
            else if (ticket.status === 'closed') stats.closed++;

            // Count high priority
            if (ticket.priority === 'urgent') stats.urgent++;
            else if (ticket.priority === 'high') stats.high++;

            // Calculate average resolution time
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

        return NextResponse.json({ stats });

    } catch (error: any) {
        console.error("Ticket stats error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
