"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function toggleAutomation(merchantId: string, type: string, currentState: boolean) {
    // First check if record exists
    const { data: existing } = await supabaseAdmin
        .from("automations")
        .select("id")
        .eq("merchant_id", merchantId)
        .eq("type", type)
        .single();

    if (existing) {
        // Update existing
        const { error } = await supabaseAdmin
            .from("automations")
            .update({ is_active: !currentState })
            .eq("id", existing.id);

        if (error) throw error;
    } else {
        // Insert new
        const { error } = await supabaseAdmin
            .from("automations")
            .insert({
                merchant_id: merchantId,
                type: type,
                is_active: !currentState,
                config: {}
            });

        if (error) throw error;
    }

    revalidatePath("/automations");
}

export async function saveAutomationConfig(merchantId: string, type: string, config: any) {
    // First check if record exists
    const { data: existing } = await supabaseAdmin
        .from("automations")
        .select("id")
        .eq("merchant_id", merchantId)
        .eq("type", type)
        .single();

    if (existing) {
        // Update existing
        const { error } = await supabaseAdmin
            .from("automations")
            .update({
                config: config,
                is_active: true
            })
            .eq("id", existing.id);

        if (error) throw error;
    } else {
        // Insert new
        const { error } = await supabaseAdmin
            .from("automations")
            .insert({
                merchant_id: merchantId,
                type: type,
                config: config,
                is_active: true
            });

        if (error) throw error;
    }

    revalidatePath("/automations");
}