/**
 * DELETE /api/customers/segments/[id]
 * 
 * Delete a custom customer segment.
 */

import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;

    try {
        const { id } = await params;

        // Verify the segment belongs to this merchant before deleting
        const { error } = await supabase
            .from("customer_segments")
            .delete()
            .eq("id", id)
            .eq("merchant_id", merchantId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting segment:", error);
        return NextResponse.json({ error: "Failed to delete segment" }, { status: 500 });
    }
}
