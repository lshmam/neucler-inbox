import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
    // 1. Auth Check
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;
    if (!merchantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { priceId } = body; // We will send this from the frontend

        // 2. Get Merchant Details (for Email)
        const { data: merchant } = await supabaseAdmin
            .from("merchants")
            .select("email, business_name")
            .eq("platform_merchant_id", merchantId)
            .single();

        if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

        // 3. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId, // The Price ID from your Stripe Dashboard
                    quantity: 1,
                },
            ],
            mode: "subscription", // or 'payment' for one-time
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?status=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?status=cancelled`,
            customer_email: merchant.email || undefined,
            // CRITICAL: This connects the payment back to your database
            metadata: {
                merchant_id: merchantId,
            },
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error("Stripe Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}