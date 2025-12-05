"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function toggleAutomation(merchantId: string, type: string, currentState: boolean) {
    // Toggle the state
    const { error } = await supabaseAdmin
        .from("automations")
        .upsert({
            merchant_id: merchantId,
            type: type,
            is_active: !currentState
        }, { onConflict: "merchant_id, type" });

    if (error) throw error;
    revalidatePath("/automations");
}

export async function saveAutomationConfig(merchantId: string, type: string, config: any) {
    // Save the custom message or settings
    const { error } = await supabaseAdmin
        .from("automations")
        .upsert({
            merchant_id: merchantId,
            type: type,
            config: config,
            is_active: true // Auto-enable on save
        }, { onConflict: "merchant_id, type" });

    if (error) throw error;
    revalidatePath("/automations");
}