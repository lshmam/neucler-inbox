import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
    // 1. Get authenticated user from Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Checkout] Creating session for user:", user.id);

    try {
        const body = await request.json();
        const { priceId, planTier, trialDays, onboardingData } = body;

        // 2. Create Stripe Customer (using auth user email)
        const customer = await stripe.customers.create({
            email: user.email!,
            name: onboardingData?.business_name || undefined,
            metadata: {
                user_id: user.id,
            },
        });

        console.log("[Checkout] Created Stripe customer:", customer.id);

        // 3. Create Stripe Checkout Session with Trial
        // Store ALL onboarding data in metadata so webhook can create merchant
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?status=success&trial=started`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?status=cancelled`,
            customer: customer.id,
            // CRITICAL: Store user ID and onboarding data for webhook
            metadata: {
                user_id: user.id,
                user_email: user.email || "",
                plan_tier: planTier || "pro",
                business_name: onboardingData?.business_name || "",
                address: onboardingData?.address || "",
                phone: onboardingData?.phone || "",
                website: onboardingData?.website || "",
            },
            subscription_data: {
                metadata: {
                    user_id: user.id,
                    plan_tier: planTier || "pro",
                },
            },
        };

        // Add trial period if specified
        if (trialDays && trialDays > 0) {
            sessionParams.subscription_data = {
                ...sessionParams.subscription_data,
                trial_period_days: trialDays,
            };
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        console.log("[Checkout] Session created:", session.id);
        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error("Stripe Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}