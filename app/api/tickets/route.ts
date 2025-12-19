import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET /api/tickets - List all tickets with filters
export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;
    const { searchParams } = new URL(request.url);

    // Parse query params
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedTo = searchParams.get("assigned_to");
    const customerId = searchParams.get("customer_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    try {
        // Fetch tickets without join (no FK relationship)
        let query = supabase
            .from("tickets")
            .select("*", { count: 'exact' })
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (status && status !== "all") {
            query = query.eq("status", status);
        }
        if (priority) {
            query = query.eq("priority", priority);
        }
        if (assignedTo) {
            query = query.eq("assigned_to", assignedTo);
        }
        if (customerId) {
            query = query.eq("customer_id", customerId);
        }

        const { data: tickets, error, count } = await query;

        if (error) {
            console.error("Error fetching tickets:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get unique customer IDs
        const customerIds = [...new Set((tickets || [])
            .map(t => t.customer_id)
            .filter(Boolean)
        )];

        // Fetch customers separately if any exist
        let customersMap: Record<string, any> = {};
        if (customerIds.length > 0) {
            const { data: customers } = await supabase
                .from("customers")
                .select("id, first_name, last_name, email, phone_number")
                .in("id", customerIds);

            if (customers) {
                customersMap = Object.fromEntries(
                    customers.map(c => [c.id, c])
                );
            }
        }

        // Attach customer data to tickets
        const ticketsWithCustomers = (tickets || []).map(ticket => ({
            ...ticket,
            customers: ticket.customer_id ? customersMap[ticket.customer_id] || null : null
        }));

        return NextResponse.json({
            tickets: ticketsWithCustomers,
            total: count || 0,
            limit,
            offset
        });

    } catch (error: any) {
        console.error("Tickets GET error:", error);
        return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
    }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;

    try {
        const body = await request.json();
        const {
            title,
            description,
            priority = "medium",
            category,
            customer_id,
            assigned_to,
            source = "manual",
            source_message_id,
            tags = [],
            due_date
        } = body;

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        // Insert ticket
        const { data: ticket, error } = await supabase
            .from("tickets")
            .insert({
                merchant_id: merchantId,
                title,
                description,
                priority,
                category,
                customer_id,
                assigned_to,
                source,
                source_message_id,
                tags,
                due_date,
                status: "open"
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating ticket:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Fetch customer if exists
        let customerData = null;
        if (ticket.customer_id) {
            const { data: customer } = await supabase
                .from("customers")
                .select("id, first_name, last_name, email, phone_number")
                .eq("id", ticket.customer_id)
                .single();
            customerData = customer;
        }

        return NextResponse.json({
            ticket: {
                ...ticket,
                customers: customerData
            }
        }, { status: 201 });

    } catch (error: any) {
        console.error("Tickets POST error:", error);
        return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
    }
}
