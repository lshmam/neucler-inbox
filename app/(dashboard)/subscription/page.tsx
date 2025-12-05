"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useState } from "react";

// REPLACE THIS WITH YOUR ACTUAL STRIPE PRICE ID
const PRO_PRICE_ID = "price_1SYHA3HdrdB9JVPzuy40RGTE";

export default function SubscriptionPage() {
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                body: JSON.stringify({ priceId: PRO_PRICE_ID }),
            });
            const data = await res.json();

            // Redirect user to Stripe
            if (data.url) window.location.href = data.url;
            else alert("Failed to start checkout");

        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <div className="flex-1 p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight mb-6">Subscription</h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
                {/* Free Plan */}
                <Card>
                    <CardHeader>
                        <CardTitle>Free Plan</CardTitle>
                        <CardDescription>For small shops just getting started.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold mb-6">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                        <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                    </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card className="border-2 border-[#906CDD] relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#906CDD] text-white text-xs px-3 py-1 rounded-bl-lg">RECOMMENDED</div>
                    <CardHeader>
                        <CardTitle>Pro Growth</CardTitle>
                        <CardDescription>Automate everything and grow faster.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold mb-6">$99<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                        <ul className="space-y-2 mb-6 text-sm">
                            <li className="flex gap-2"><Check className="h-4 w-4 text-green-500" /> Unlimited AI Calls</li>
                            <li className="flex gap-2"><Check className="h-4 w-4 text-green-500" /> SMS & Email Campaigns</li>
                            <li className="flex gap-2"><Check className="h-4 w-4 text-green-500" /> Priority Support</li>
                        </ul>
                        <Button
                            className="w-full bg-[#906CDD] hover:bg-[#7a5bb5]"
                            onClick={handleUpgrade}
                            disabled={loading}
                        >
                            {loading ? "Processing..." : "Upgrade Now"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}