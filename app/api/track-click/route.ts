import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Fire-and-forget click tracking endpoint
 * Called by the redirect route without blocking
 */
export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Update clicked_at timestamp
    const { error } = await supabaseAdmin
        .from("smart_links")
        .update({ clicked_at: new Date().toISOString() })
        .eq("id", id)
        .is("clicked_at", null); // Only update if not already clicked

    if (error) {
        console.error("[Track Click] Error:", error);
    }

    return NextResponse.json({ success: true });
}
