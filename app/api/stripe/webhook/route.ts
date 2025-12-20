import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { mg, DOMAIN } from "@/lib/mailgun";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`📬 Stripe Webhook: ${event.type}`);

    // ===== CHECKOUT COMPLETED =====
    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get data from session metadata (passed from checkout API)
        const userId = session.metadata?.user_id;
        const userEmail = session.metadata?.user_email;
        const planTier = session.metadata?.plan_tier || "pro";
        const businessName = session.metadata?.business_name;
        const address = session.metadata?.address;
        const phone = session.metadata?.phone;
        const website = session.metadata?.website;

        if (!userId) {
            console.error("❌ No user_id in session metadata");
            return new NextResponse(null, { status: 200 });
        }

        console.log(`💰 Checkout completed for User: ${userId}, Plan: ${planTier}`);

        // Get subscription details for trial end date
        let trialEndsAt: string | null = null;
        if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            if (subscription.trial_end) {
                trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
            }
        }

        // CREATE merchant record (this is first time - after payment)
        const { error: merchantError } = await supabaseAdmin
            .from("merchants")
            .upsert({
                id: userId,
                platform_merchant_id: userId,
                email: userEmail,
                business_name: businessName,
                subscription_status: trialEndsAt ? "trialing" : "active",
                subscription_tier: planTier,
                trial_ends_at: trialEndsAt,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                access_token: "pending_generation",
            }, { onConflict: "id" });

        if (merchantError) {
            console.error("❌ Failed to create merchant:", merchantError);
        } else {
            console.log(`✅ Merchant ${userId} CREATED: ${businessName}, ${planTier}`);
        }

        // Create business profile
        await supabaseAdmin
            .from("business_profiles")
            .upsert({
                merchant_id: userId,
                address: address,
                phone: phone,
                website: website,
                is_onboarding_completed: true,
            }, { onConflict: "merchant_id" });

        console.log(`✅ Business profile created for ${businessName}`);

        // Create team owner record
        await supabaseAdmin
            .from("team_members")
            .upsert({
                merchant_id: userId,
                user_id: userId,
                role: "owner",
            }, { onConflict: "merchant_id,user_id" });

        // Send admin notification email
        const planName = planTier === "starter" ? "Starter ($79/mo)" : "Pro ($149/mo)";
        try {
            await mg.messages.create(DOMAIN!, {
                from: `Neucler <noreply@${DOMAIN}>`,
                to: ["ishmam.aminul@gmail.com"],
                subject: `🎉 New Paid Signup: ${businessName}`,
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px;">
                        <h2 style="color: #000;">💳 New Paying Customer!</h2>
                        <p style="color: #333; font-size: 16px;">A new user has completed checkout and started their trial:</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px 0; color: #666; font-weight: 500;">Business Name</td>
                                <td style="padding: 10px 0; color: #000;">${businessName}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px 0; color: #666; font-weight: 500;">Email</td>
                                <td style="padding: 10px 0; color: #000;">${userEmail}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px 0; color: #666; font-weight: 500;">Plan</td>
                                <td style="padding: 10px 0; color: #000;">${planName}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px 0; color: #666; font-weight: 500;">Trial Ends</td>
                                <td style="padding: 10px 0; color: #000;">${trialEndsAt ? new Date(trialEndsAt).toLocaleDateString() : "N/A"}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #666; font-weight: 500;">Signed Up At</td>
                                <td style="padding: 10px 0; color: #000;">${new Date().toLocaleString()}</td>
                            </tr>
                        </table>
                        <p style="color: #888; font-size: 12px; margin-top: 30px;">
                            This is an automated notification from Neucler.
                        </p>
                    </div>
                `,
            });
            console.log(`📧 Admin notification email sent for ${businessName}`);
        } catch (emailError) {
            console.error("Failed to send admin notification email:", emailError);
        }
    }

    // ===== TRIAL WILL END (3 days before by default) =====
    if (event.type === "customer.subscription.trial_will_end") {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (userId) {
            console.log(`⚠️ Trial ending soon for User: ${userId}`);

            // Get merchant details for email
            const { data: merchant } = await supabaseAdmin
                .from("merchants")
                .select("email, business_name, subscription_tier")
                .eq("id", userId)
                .single();

            if (merchant?.email) {
                const trialEndDate = subscription.trial_end
                    ? new Date(subscription.trial_end * 1000).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })
                    : "soon";

                const planName = merchant.subscription_tier === "starter" ? "Starter ($79/mo)" : "Pro ($149/mo)";

                // Send trial ending email
                try {
                    await mg.messages.create(DOMAIN!, {
                        from: `Neucler <noreply@${DOMAIN}>`,
                        to: [merchant.email],
                        subject: "Your trial ends tomorrow - Action required",
                        html: `
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #1e293b; margin-bottom: 20px;">Your trial is ending</h2>
                                
                                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                                    Hi ${merchant.business_name || "there"},
                                </p>
                                
                                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                                    Your 7-day free trial of Neucler ends on <strong>${trialEndDate}</strong>.
                                </p>
                                
                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                    <p style="margin: 0; color: #334155; font-size: 14px;">
                                        <strong>Your Plan:</strong> ${planName}<br/>
                                        <strong>Next Billing Date:</strong> ${trialEndDate}
                                    </p>
                                </div>
                                
                                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                                    After your trial ends, your card will be charged automatically. If you'd like to cancel or change your plan, you can do so from your billing settings.
                                </p>
                                
                                <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
                                    Manage Billing
                                </a>
                                
                                <p style="color: #94a3b8; font-size: 14px; margin-top: 24px;">
                                    Thanks for trying Neucler!<br/>
                                    — The Neucler Team
                                </p>
                            </div>
                        `,
                    });
                    console.log(`📧 Trial ending email sent to ${merchant.email}`);
                } catch (emailError) {
                    console.error("Failed to send trial ending email:", emailError);
                }
            }
        }
    }

    // ===== SUBSCRIPTION UPDATED =====
    if (event.type === "customer.subscription.updated") {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (userId) {
            const status = subscription.status; // active, past_due, canceled, etc.

            await supabaseAdmin
                .from("merchants")
                .update({
                    subscription_status: status,
                    trial_ends_at: subscription.trial_end
                        ? new Date(subscription.trial_end * 1000).toISOString()
                        : null,
                })
                .eq("id", userId);

            console.log(`🔄 Subscription updated for ${userId}: ${status}`);
        }
    }

    // ===== SUBSCRIPTION DELETED (Canceled) =====
    if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (userId) {
            await supabaseAdmin
                .from("merchants")
                .update({
                    subscription_status: "canceled",
                    subscription_tier: null,
                })
                .eq("id", userId);

            console.log(`❌ Subscription canceled for ${userId}`);
        }
    }

    return new NextResponse(null, { status: 200 });
}