import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMerchantId } from "@/lib/auth-helpers";

// GET - Fetch all deals for the merchant
export async function GET() {
    try {
        const merchantId = await getMerchantId();

        const { data: deals, error } = await supabaseAdmin
            .from("deals")
            .select("*")
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[Get Deals] Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`[Get Deals] Found ${deals?.length || 0} deals for merchant ${merchantId}`);

        return NextResponse.json({ deals: deals || [] });
    } catch (error: any) {
        console.error("[Get Deals] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const merchantId = await getMerchantId();
        const body = await request.json();

        const {
            customerId,
            customerName,
            customerPhone,
            title,
            description,
            status,
            vehicleYear,
            vehicleMake,
            vehicleModel,
            value,
            source
        } = body;

        // Create the deal in pipeline
        const { data: deal, error } = await supabaseAdmin
            .from("deals")
            .insert({
                merchant_id: merchantId,
                customer_id: customerId || null,
                customer_name: customerName,
                customer_phone: customerPhone || null,
                title: title || `Deal with ${customerName}`,
                description: description || `From conversation with ${customerPhone}`,
                status: status || "new_inquiry",
                vehicle_year: vehicleYear || null,
                vehicle_make: vehicleMake || null,
                vehicle_model: vehicleModel || null,
                value: value || 0,
                source: source || "service_desk",
            })
            .select()
            .single();

        if (error) {
            console.error("[Create Deal] Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log("[Create Deal] Created:", deal);

        return NextResponse.json({
            success: true,
            deal
        });

    } catch (error: any) {
        console.error("[Create Deal] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH - Update a deal (status, value, etc.)
export async function PATCH(request: NextRequest) {
    try {
        const merchantId = await getMerchantId();
        const body = await request.json();

        const { id, status, value, title } = body;

        if (!id) {
            return NextResponse.json({ error: "Deal ID is required" }, { status: 400 });
        }

        const updateData: any = {};
        if (status) updateData.status = status;
        if (value !== undefined) updateData.value = value;
        if (title) updateData.title = title;

        const { data: deal, error } = await supabaseAdmin
            .from("deals")
            .update(updateData)
            .eq("id", id)
            .eq("merchant_id", merchantId)
            .select()
            .single();

        if (error) {
            console.error("[Update Deal] Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log("[Update Deal] Updated:", deal);

        return NextResponse.json({ success: true, deal });

    } catch (error: any) {
        console.error("[Update Deal] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Remove a deal
export async function DELETE(request: NextRequest) {
    try {
        const merchantId = await getMerchantId();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Deal ID is required" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("deals")
            .delete()
            .eq("id", id)
            .eq("merchant_id", merchantId);

        if (error) {
            console.error("[Delete Deal] Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log("[Delete Deal] Deleted:", id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("[Delete Deal] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
