import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

// PATCH /api/customers/tags - Update tags for a customer
export async function PATCH(request: Request) {
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;

    if (!merchantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { customerId, tags } = await request.json();

        if (!customerId) {
            return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
        }

        // Update customer tags
        const { data, error } = await supabaseAdmin
            .from("customers")
            .update({ tags: tags || [] })
            .eq("id", customerId)
            .eq("merchant_id", merchantId)
            .select()
            .single();

        if (error) {
            console.error("Error updating customer tags:", error);
            return NextResponse.json({ error: "Failed to update tags" }, { status: 500 });
        }

        return NextResponse.json({ success: true, customer: data });
    } catch (error: any) {
        console.error("Tags API error:", error);
        return NextResponse.json({ error: "Failed to update tags" }, { status: 500 });
    }
}

// GET /api/customers/tags - Get all unique tags for this merchant
export async function GET() {
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;

    if (!merchantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get all customers and extract unique tags
        const { data: customers, error } = await supabaseAdmin
            .from("customers")
            .select("tags")
            .eq("merchant_id", merchantId);

        if (error) {
            console.error("Error fetching tags:", error);
            return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
        }

        // Extract unique tags
        const allTags = new Set<string>();
        customers?.forEach(c => {
            (c.tags || []).forEach((tag: string) => allTags.add(tag));
        });

        return NextResponse.json({ tags: Array.from(allTags).sort() });
    } catch (error: any) {
        console.error("Tags API error:", error);
        return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
    }
}
