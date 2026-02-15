/**
 * GET /api/customers/segments
 * POST /api/customers/segments
 * 
 * Manage custom customer segments for targeted campaigns.
 */

import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;

    try {
        const { data: segments, error } = await supabase
            .from("customer_segments")
            .select("*")
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ segments: segments || [] });
    } catch (error: any) {
        console.error("Error fetching segments:", error);
        return NextResponse.json({ error: "Failed to fetch segments" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;

    try {
        const body = await request.json();
        const { name, customerIds } = body;

        if (!name || !customerIds || !Array.isArray(customerIds)) {
            return NextResponse.json(
                { error: "Name and customerIds are required" },
                { status: 400 }
            );
        }

        const { data: segment, error } = await supabase
            .from("customer_segments")
            .insert({
                merchant_id: merchantId,
                name,
                customer_ids: customerIds,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, segment });
    } catch (error: any) {
        console.error("Error creating segment:", error);
        return NextResponse.json({ error: "Failed to create segment" }, { status: 500 });
    }
}
