import { supabaseAdmin } from "@/lib/supabase";
import { getMerchantId } from "@/lib/auth-helpers";
import { MarketingClientView } from "./client-view";

export default async function MarketingPage() {
    const merchantId = await getMerchantId();

    // Fetch Email Campaigns
    const emailCampaignsPromise = supabaseAdmin
        .from("email_campaigns")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });

    // Fetch SMS Campaigns
    const smsCampaignsPromise = supabaseAdmin
        .from("sms_campaigns")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(20);

    // Fetch Messages (for SMS threads)
    const messagesPromise = supabaseAdmin
        .from("messages")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: true });

    // Fetch Customers (to map names)
    const customersPromise = supabaseAdmin
        .from("customers")
        .select("phone_number, first_name, last_name")
        .eq("merchant_id", merchantId);

    const [
        { data: emailCampaigns },
        { data: smsCampaigns },
        { data: messages },
        { data: customers }
    ] = await Promise.all([
        emailCampaignsPromise,
        smsCampaignsPromise,
        messagesPromise,
        customersPromise
    ]);

    // Transform SMS messages (map customer names)
    const formattedMessages = messages?.map((msg) => {
        const customer = customers?.find(c => c.phone_number === msg.customer_phone);
        return {
            ...msg,
            content: msg.body || msg.message_body || "",
            customers: customer || null
        };
    }) || [];

    return (
        <MarketingClientView
            emailCampaigns={emailCampaigns || []}
            smsCampaigns={smsCampaigns || []}
            smsMessages={formattedMessages}
            merchantId={merchantId}
        />
    );
}
