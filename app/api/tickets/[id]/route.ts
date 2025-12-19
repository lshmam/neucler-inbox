import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { analyzeTicket } from "@/services/quality-scoring";

// GET /api/tickets/[id] - Get single ticket with comments
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const merchantId = user.id;

    try {
        // Fetch ticket without join
        const { data: ticket, error } = await supabase
            .from("tickets")
            .select("*")
            .eq("id", id)
            .eq("merchant_id", merchantId)
            .single();

        if (error || !ticket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        // Fetch customer separately if exists
        let customerData = null;
        if (ticket.customer_id) {
            const { data: customer } = await supabase
                .from("customers")
                .select("id, first_name, last_name, email, phone_number, tags, status")
                .eq("id", ticket.customer_id)
                .single();
            customerData = customer;
        }

        // Fetch comments
        const { data: comments } = await supabase
            .from("ticket_comments")
            .select("*")
            .eq("ticket_id", id)
            .order("created_at", { ascending: true });

        return NextResponse.json({
            ticket: {
                ...ticket,
                customers: customerData,
                comments: comments || []
            }
        });

    } catch (error: any) {
        console.error("Ticket GET error:", error);
        return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 });
    }
}

// PATCH /api/tickets/[id] - Update ticket
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const merchantId = user.id;

    try {
        const body = await request.json();
        const allowedFields = [
            "title", "description", "status", "priority",
            "category", "assigned_to", "tags", "due_date", "customer_id"
        ];

        // Filter to only allowed fields
        const updates: Record<string, any> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const { data: ticket, error } = await supabase
            .from("tickets")
            .update(updates)
            .eq("id", id)
            .eq("merchant_id", merchantId)
            .select()
            .single();

        if (error) {
            console.error("Error updating ticket:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Fetch customer separately if exists
        let customerData = null;
        if (ticket.customer_id) {
            const { data: customer } = await supabase
                .from("customers")
                .select("id, first_name, last_name, email, phone_number")
                .eq("id", ticket.customer_id)
                .single();
            customerData = customer;
        }

        // Trigger quality scoring analysis when ticket is resolved or closed
        if (updates.status && ['resolved', 'closed'].includes(updates.status)) {
            console.log(`📊 [Ticket ${id}] Status changed to ${updates.status}, triggering quality analysis...`);
            // Fire-and-forget: Don't wait for analysis to complete
            analyzeTicket(id).catch(err =>
                console.error(`❌ [Ticket ${id}] Quality scoring failed:`, err)
            );
        }

        return NextResponse.json({
            ticket: {
                ...ticket,
                customers: customerData
            }
        });

    } catch (error: any) {
        console.error("Ticket PATCH error:", error);
        return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
    }
}

// DELETE /api/tickets/[id] - Delete ticket
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const merchantId = user.id;

    try {
        const { error } = await supabase
            .from("tickets")
            .delete()
            .eq("id", id)
            .eq("merchant_id", merchantId);

        if (error) {
            console.error("Error deleting ticket:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Ticket DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 });
    }
}
