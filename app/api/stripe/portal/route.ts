import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
    // 1. Auth Check
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;
    if (!merchantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // 2. Get Stripe Customer ID
        const { data: merchant } = await supabaseAdmin
            .from("merchants")
            .select("stripe_customer_id")
            .eq("platform_merchant_id", merchantId)
            .single();

        if (!merchant?.stripe_customer_id) {
            return NextResponse.json({ error: "No subscription found" }, { status: 404 });
        }

        // 3. Create Customer Portal Session
        const session = await stripe.billingPortal.sessions.create({
            customer: merchant.stripe_customer_id,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error("Portal Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
