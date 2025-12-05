import { getMerchantId } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, ShieldCheck } from "lucide-react";

export default async function SubscribePage() {
    const merchantId = await getMerchantId();

    // Fetch Merchant Status
    const { data: merchant } = await supabaseAdmin
        .from("merchants")
        .select("subscription_status, trial_ends_at")
        .eq("platform_merchant_id", merchantId)
        .single();

    // If already active, go to dashboard
    if (merchant?.subscription_status === 'active') {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-xl border-blue-100">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">Upgrade to Neucler Pro</CardTitle>
                    <CardDescription>
                        Your trial has ended. Subscribe to continue automating your business.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex items-baseline justify-center gap-1 mb-6">
                        <span className="text-4xl font-bold">$99</span>
                        <span className="text-muted-foreground">/month</span>
                    </div>

                    <div className="space-y-3">
                        {['Unlimited AI Voice Calls', 'SMS Marketing Blasts', 'Automated Google Reviews', 'Loyalty Program Engine'].map((feature) => (
                            <div key={feature} className="flex items-center gap-3">
                                <div className="bg-green-100 p-1 rounded-full">
                                    <Check className="w-3 h-3 text-green-600" />
                                </div>
                                <span className="text-sm text-slate-700">{feature}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter>
                    <form action="/api/stripe/checkout" method="POST" className="w-full">
                        <input type="hidden" name="merchantId" value={merchantId} />
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-lg">
                            Secure Checkout
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}