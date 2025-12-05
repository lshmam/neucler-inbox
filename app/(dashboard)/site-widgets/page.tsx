import { getMerchantId } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { WidgetEditor } from "./widget-editor"; // Client Component

export default async function SiteWidgetsPage() {
    const merchantId = await getMerchantId();

    // 1. Fetch Existing Config
    const { data: widget } = await supabaseAdmin
        .from("web_widgets")
        .select("*")
        .eq("merchant_id", merchantId)
        .single();

    // 2. Fetch Merchant Name (Default)
    const { data: merchant } = await supabaseAdmin
        .from("merchants")
        .select("business_name")
        .eq("platform_merchant_id", merchantId)
        .single();

    const defaultConfig = {
        primaryColor: widget?.primary_color || "#0F172A",
        greeting: widget?.greeting_message || "Hi there! How can we help?",
        businessName: widget?.business_name || merchant?.business_name || "Support",
    };

    return (
        <div className="flex-1 p-8 pt-6 space-y-6">
            <div className="flex flex-col space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Website Widget</h2>
                <p className="text-muted-foreground">
                    Customize the AI Chat bubble that lives on your website.
                </p>
            </div>

            <WidgetEditor merchantId={merchantId} initialConfig={defaultConfig} />
        </div>
    );
}