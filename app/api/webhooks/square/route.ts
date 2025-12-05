import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { twilioClient } from "@/lib/twilio";
import { getCustomerFromOrder } from "@/lib/square";

export async function POST(request: Request) {
    try {
        const bodyText = await request.text();
        const event = JSON.parse(bodyText);

        if (event.type !== "payment.updated") return NextResponse.json({ ok: true });

        const payment = event.data.object.payment;
        if (payment.status !== "COMPLETED") return NextResponse.json({ ok: true });

        const squareMerchantId = event.merchant_id;
        const orderId = payment.order_id;
        const amountCents = payment.amount_money?.amount || 0;

        // 1. Merchant Context
        const { data: merchant } = await supabaseAdmin
            .from("merchants")
            .select("id, platform_merchant_id, access_token, business_name")
            .eq("platform_merchant_id", squareMerchantId)
            .single();

        if (!merchant) return NextResponse.json({ ok: true });

        if (!orderId) return NextResponse.json({ ok: true });

        // 2. Fetch Customer Details
        const customer = await getCustomerFromOrder(orderId, merchant.access_token);

        if (!customer?.id) {
            return NextResponse.json({ ok: true });
        }

        // 3. Sync Customer to Supabase (Ensure they exist)
        await supabaseAdmin.from("customers").upsert({
            id: customer.id,
            merchant_id: merchant.platform_merchant_id,
            first_name: customer.firstName,
            phone_number: customer.phoneNumber,
        }, { onConflict: "id, merchant_id" });

        // ---------------------------------------------------------
        // LOGIC A: LOYALTY ENGINE (Fixed for Multi-Program + Dedup)
        // ---------------------------------------------------------
        await handleLoyalty(merchant, customer, amountCents, orderId);

        // ---------------------------------------------------------
        // LOGIC B: REVIEW BOOSTER (Existing Dedup Logic)
        // ---------------------------------------------------------
        await handleReviewBooster(merchant, customer, orderId);

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error("❌ Webhook Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

// --- HELPER: LOYALTY LOGIC ---
async function handleLoyalty(merchant: any, customer: any, amountCents: number, orderId: string) {
    const merchantId = merchant.platform_merchant_id;

    // 1. CHECK DEDUPLICATION (Have we processed this Order for Loyalty?)
    // We search the ledger metadata for this order_id
    const { data: existingLedger } = await supabaseAdmin
        .from("loyalty_ledger")
        .select("id")
        .eq("merchant_id", merchantId)
        .contains("metadata", { order_id: orderId })
        .maybeSingle(); // Use maybeSingle to avoid errors if 0 found

    if (existingLedger) {
        console.log(`⏩ Loyalty already awarded for Order ${orderId}. Skipping.`);
        return;
    }

    // 2. Fetch ALL Active Programs (Not just .single())
    const { data: programs } = await supabaseAdmin
        .from("loyalty_programs")
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("status", "active");

    if (!programs || programs.length === 0) return;

    // 3. Process Each Program
    for (const program of programs) {
        let pointsEarned = 0;

        if (program.accrual_type === 'visit_based') {
            pointsEarned = parseInt(program.accrual_rule?.earn || "1");
        } else {
            const spendRule = parseFloat(program.accrual_rule?.spend || "1.00");
            const earnRule = parseInt(program.accrual_rule?.earn || "1");
            const amountDollars = amountCents / 100;
            pointsEarned = Math.floor((amountDollars / spendRule) * earnRule);
        }

        if (pointsEarned > 0) {
            // Update Balance
            const { data: balanceRow } = await supabaseAdmin
                .from("loyalty_balances")
                .select("balance")
                .eq("customer_id", customer.id)
                .eq("program_id", program.id)
                .single();

            const newBalance = (balanceRow?.balance || 0) + pointsEarned;

            await supabaseAdmin.from("loyalty_balances").upsert({
                merchant_id: merchantId,
                customer_id: customer.id,
                program_id: program.id,
                balance: newBalance
            }, { onConflict: "customer_id, program_id" });

            // Log to Ledger (With Metadata for Dedup)
            await supabaseAdmin.from("loyalty_ledger").insert({
                merchant_id: merchantId,
                customer_id: customer.id,
                program_id: program.id,
                points_change: pointsEarned,
                reason: "purchase",
                metadata: { order_id: orderId } // <--- CRITICAL FOR DEDUP
            });

            console.log(`💎 Added ${pointsEarned} points to Program ${program.terminology}`);

            // Send SMS (Only once per transaction batch ideally, but per program is okay if distinct)
            // To prevent spamming 2 texts if they have 2 programs, you could collect these and send one summary.
            // For now, let's keep it simple:
            const { data: agent } = await supabaseAdmin.from("ai_agents").select("phone_number").eq("merchant_id", merchantId).single();

            if (agent?.phone_number && customer.phoneNumber) {
                const messageBody = `You earned ${pointsEarned} ${program.terminology} at ${merchant.business_name}! Total: ${newBalance}.`;

                try {
                    await twilioClient.messages.create({
                        body: messageBody,
                        from: agent.phone_number,
                        to: customer.phoneNumber
                    });

                    // Log to Inbox
                    await supabaseAdmin.from("messages").insert({
                        merchant_id: merchantId,
                        customer_phone: customer.phoneNumber,
                        direction: "outbound",
                        body: messageBody,
                        status: "sent"
                    });
                } catch (e) { console.error("Loyalty SMS error", e); }
            }
        }
    }
}

// --- HELPER: REVIEW BOOSTER ---
async function handleReviewBooster(merchant: any, customer: any, orderId: string) {
    const merchantId = merchant.platform_merchant_id;

    // Dedup Check
    const { data: existing } = await supabaseAdmin.from("review_requests").select("id").eq("order_id", orderId).single();
    if (existing) return;

    // Automation Check
    const { data: automation } = await supabaseAdmin.from("automations").select("is_active, config").eq("merchant_id", merchantId).eq("type", "review_booster").single();
    if (!automation?.is_active) return;

    const { data: agent } = await supabaseAdmin.from("ai_agents").select("phone_number").eq("merchant_id", merchantId).single();
    if (!agent?.phone_number || !customer.phoneNumber) return;

    // Send
    const gateUrl = `${process.env.NEXT_PUBLIC_APP_URL}/review/${orderId}`;
    let message = automation.config?.message || "Thanks for visiting! Please rate us: [Link]";
    message = message.replace("[Link]", gateUrl);
    const fullMessage = `Hi ${customer.firstName || 'there'}, this is ${merchant.business_name}. ${message}`;

    try {
        await twilioClient.messages.create({
            body: fullMessage,
            from: agent.phone_number,
            to: customer.phoneNumber
        });

        await supabaseAdmin.from("review_requests").insert({
            merchant_id: merchantId,
            order_id: orderId,
            customer_phone: customer.phoneNumber,
            status: "sent"
        });

        await supabaseAdmin.from("messages").insert({
            merchant_id: merchantId,
            customer_phone: customer.phoneNumber,
            direction: "outbound",
            body: fullMessage,
            status: "sent"
        });

        console.log(`✅ Review Booster Sent`);
    } catch (e) {
        console.error("Review SMS Failed", e);
    }
}