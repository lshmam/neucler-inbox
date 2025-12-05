"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function saveWidgetConfig(merchantId: string, config: any) {
    const { error } = await supabaseAdmin
        .from("web_widgets")
        .upsert({
            merchant_id: merchantId,
            primary_color: config.primaryColor,
            greeting_message: config.greeting,
            business_name: config.businessName,
            is_active: true
        }, { onConflict: "merchant_id" });

    if (error) throw error;
    revalidatePath("/site-widgets");
}