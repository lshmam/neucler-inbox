import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET /api/tickets/[id]/likes - Get like count and user's like status
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
        // Get total likes count
        const { count, error: countError } = await supabase
            .from("ticket_likes")
            .select("*", { count: "exact", head: true })
            .eq("ticket_id", id);

        // Check if current user has liked
        const { data: userLike } = await supabase
            .from("ticket_likes")
            .select("id")
            .eq("ticket_id", id)
            .eq("user_id", user.id)
            .single();

        return NextResponse.json({
            count: count || 0,
            hasLiked: !!userLike
        });

    } catch (error: any) {
        console.error("Likes GET error:", error);
        return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 });
    }
}

// POST /api/tickets/[id]/likes - Toggle like on a ticket
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
        // Check if already liked
        const { data: existingLike } = await supabase
            .from("ticket_likes")
            .select("id")
            .eq("ticket_id", id)
            .eq("user_id", user.id)
            .single();

        if (existingLike) {
            // Unlike - remove the like
            await supabase
                .from("ticket_likes")
                .delete()
                .eq("id", existingLike.id);

            return NextResponse.json({ liked: false, message: "Like removed" });
        } else {
            // Like - add new like
            await supabase
                .from("ticket_likes")
                .insert({
                    ticket_id: id,
                    user_id: user.id
                });

            return NextResponse.json({ liked: true, message: "Liked!" });
        }

    } catch (error: any) {
        console.error("Likes POST error:", error);
        return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
    }
}
