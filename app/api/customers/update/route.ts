import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMerchantId } from "@/lib/auth-helpers";

export async function PATCH(request: Request) {
    try {
        // Get merchant ID using the helper (handles auth and redirection)
        const merchantId = await getMerchantId();

        console.log(`[Customer Update] Authenticated merchant: ${merchantId}`);

        const body = await request.json();
        const { customerId, first_name, last_name, vehicle_year, vehicle_make, vehicle_model, service_requested } = body;

        if (!customerId) {
            return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
        }

        // Build update object
        const updates: any = {};
        if (first_name !== undefined) updates.first_name = first_name || null;
        if (last_name !== undefined) updates.last_name = last_name || null;
        if (vehicle_year !== undefined) updates.vehicle_year = vehicle_year || null;
        if (vehicle_make !== undefined) updates.vehicle_make = vehicle_make || null;
        if (vehicle_model !== undefined) updates.vehicle_model = vehicle_model || null;
        if (service_requested !== undefined) updates.service_requested = service_requested || null;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No updates provided" }, { status: 400 });
        }

        // Update the customer
        const { error: updateError } = await supabaseAdmin
            .from("customers")
            .update(updates)
            .eq("id", customerId)
            .eq("merchant_id", merchantId);

        if (updateError) {
            console.error("[Customer Update] Error:", updateError);
            return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("[Customer Update] Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
