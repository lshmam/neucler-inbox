import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { EmailClientView } from "./client-view";

export default async function EmailMarketingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // The user's ID is the merchant ID
    const merchantId = user.id;

    // Fetch Past Campaigns
    const { data: campaigns } = await supabaseAdmin
        .from("email_campaigns")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });

    return (
        <EmailClientView
            initialCampaigns={campaigns || []}
            merchantId={merchantId}
        />
    );
}