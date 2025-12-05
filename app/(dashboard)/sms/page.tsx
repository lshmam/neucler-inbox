import { supabaseAdmin } from "@/lib/supabase";
import { getMerchantId } from "@/lib/auth-helpers";
import { SMSClientView } from "./client-view";

export default async function SMSPage() {
    const merchantId = await getMerchantId();

    console.log(`[SMS Page] Using merchant_id: ${merchantId}`);

    // 1. Fetch Campaigns
    const campaignsPromise = supabaseAdmin
        .from("sms_campaigns")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(20);

    // 2. Fetch Messages (Raw)
    const messagesPromise = supabaseAdmin
        .from("messages")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: true });

    // 3. Fetch Customers (To map names manually)
    const customersPromise = supabaseAdmin
        .from("customers")
        .select("phone_number, first_name, last_name")
        .eq("merchant_id", merchantId);

    const [
        { data: campaigns },
        { data: messages },
        { data: customers }
    ] = await Promise.all([
        campaignsPromise,
        messagesPromise,
        customersPromise
    ]);

    console.log(`[SMS Page] Found ${messages?.length || 0} messages`);
    if (messages && messages.length > 0) {
        console.log(`[SMS Page] First message merchant_id:`, messages[0].merchant_id);
    }

    // 4. Transform Data for Client
    // We manually map customers to messages to avoid SQL Foreign Key issues
    // We also map DB 'body' to UI 'content'
    const formattedMessages = messages?.map((msg) => {
        // Find the customer details for this message
        const customer = customers?.find(c => c.phone_number === msg.customer_phone);

        return {
            ...msg,
            content: msg.body || msg.message_body || "", // Handle field mismatch here
            customers: customer || null // Manually attach customer
        };
    }) || [];

    return (
        <SMSClientView
            campaigns={campaigns || []}
            messages={formattedMessages}
            merchantId={merchantId}
        />
    );
}