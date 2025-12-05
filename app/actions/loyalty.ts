"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// --- POINTS MANAGEMENT (Existing) ---
export async function adjustCustomerPoints(
    merchantId: string,
    customerId: string,
    points: number,
    reason: string
) {
    const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("loyalty_balance")
        .eq("id", customerId)
        .eq("merchant_id", merchantId)
        .single();

    if (!customer) throw new Error("Customer not found");

    const newBalance = (customer.loyalty_balance || 0) + points;
    if (newBalance < 0) throw new Error("Insufficient points");

    await supabaseAdmin
        .from("customers")
        .update({ loyalty_balance: newBalance })
        .eq("id", customerId)
        .eq("merchant_id", merchantId);

    await supabaseAdmin.from("loyalty_ledger").insert({
        merchant_id: merchantId,
        customer_id: customerId,
        program_id: null, // Optional: link to active program if needed
        points_change: points,
        reason: reason
    });

    revalidatePath("/loyalty");
    return { success: true, newBalance };
}

// --- PROGRAM MANAGEMENT ---

// 1. ACTIVATE A PROGRAM (And archive others)
export async function createLoyaltyProgram(merchantId: string, programData: any, rewardsData: any[]) {

    // 1. Call the Database Function (RPC)
    // This runs the Archive + Insert logic atomically
    const { data: newProgramId, error: rpcError } = await supabaseAdmin
        .rpc('create_active_loyalty_program', {
            p_merchant_id: merchantId,
            p_terminology: programData.terminology,
            p_accrual_type: programData.accrualType,
            p_accrual_rule: { spend: programData.spendAmount, earn: programData.earnAmount }
        });

    if (rpcError) {
        console.error("RPC Error:", rpcError);
        throw rpcError;
    }

    // 2. Insert Rewards (Standard Insert)
    // We use the ID returned by the RPC function
    const rewards = rewardsData.map(r => ({
        program_id: newProgramId, // <--- The ID we just got back
        name: r.name,
        discount_type: r.type,
        discount_value: r.value,
        points_required: r.points
    }));

    const { error: rewardError } = await supabaseAdmin
        .from("loyalty_rewards")
        .insert(rewards);

    if (rewardError) throw rewardError;

    revalidatePath("/loyalty");
    return { success: true };
}

export async function archiveProgram(programId: string) {
    await supabaseAdmin
        .from("loyalty_programs")
        .update({ status: "archived" })
        .eq("id", programId);
    revalidatePath("/loyalty");
}