import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event: Stripe.Event;

    try {
        // 1. Verify the event came from Stripe
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // 2. Handle the event
    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        // Retrieve the merchant ID we sent in metadata
        const merchantId = session.metadata?.merchant_id;

        if (merchantId) {
            console.log(`💰 Payment successful for Merchant: ${merchantId}`);

            // 3. Update Supabase
            await supabaseAdmin
                .from("merchants")
                .update({ subscription_tier: "pro" }) // Update their status
                .eq("platform_merchant_id", merchantId);
        }
    }

    return new NextResponse(null, { status: 200 });
}