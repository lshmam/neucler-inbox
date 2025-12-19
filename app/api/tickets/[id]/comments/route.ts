import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET /api/tickets/[id]/comments - Get all comments for a ticket
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

    try {
        const { data: comments, error } = await supabase
            .from("ticket_comments")
            .select("*")
            .eq("ticket_id", id)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching comments:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ comments: comments || [] });

    } catch (error: any) {
        console.error("Comments GET error:", error);
        return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
    }
}

// POST /api/tickets/[id]/comments - Add a comment to a ticket
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const { content, is_internal = false, author_name } = body;

        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        // Verify the ticket belongs to this merchant
        const { data: ticket } = await supabase
            .from("tickets")
            .select("id")
            .eq("id", id)
            .eq("merchant_id", user.id)
            .single();

        if (!ticket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        // Insert comment
        const { data: comment, error } = await supabase
            .from("ticket_comments")
            .insert({
                ticket_id: id,
                author_id: user.id,
                author_name: author_name || user.email?.split("@")[0] || "Agent",
                content,
                is_internal
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating comment:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // If this is the first response and ticket is open, update first_response_at
        const { data: existingComments } = await supabase
            .from("ticket_comments")
            .select("id")
            .eq("ticket_id", id)
            .limit(2);

        if (existingComments && existingComments.length === 1) {
            await supabase
                .from("tickets")
                .update({ first_response_at: new Date().toISOString() })
                .eq("id", id)
                .is("first_response_at", null);
        }

        return NextResponse.json({ comment }, { status: 201 });

    } catch (error: any) {
        console.error("Comments POST error:", error);
        return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
    }
}
