"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UsageChart } from "@/components/usage/UsageChart";
import { Separator } from "@/components/ui/separator";
import {
    DollarSign, MessageSquare, Phone, Zap, Check,
    CreditCard, Crown, Sparkles, ArrowRight
} from "lucide-react";

// Stripe Price ID - Replace with your actual ID
const PRO_PRICE_ID = "price_1SYHA3HdrdB9JVPzuy40RGTE";

export default function BillingPage() {
    const [loading, setLoading] = useState(true);
    const [usageData, setUsageData] = useState<any>(null);
    const [upgradeLoading, setUpgradeLoading] = useState(false);

    // Current plan state (would come from your database in real implementation)
    const [currentPlan] = useState({
        name: "Pro Growth",
        price: 99,
        isActive: true,
        features: [
            "Unlimited AI Calls",
            "SMS & Email Campaigns",
            "All Automations",
            "Priority Support"
        ]
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/usage");
                const json = await res.json();
                setUsageData(json);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleManageSubscription = async () => {
        setUpgradeLoading(true);
        try {
            // For existing subscribers, this would open the Stripe Customer Portal
            // For new users, redirect to checkout
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                body: JSON.stringify({ priceId: PRO_PRICE_ID }),
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch (e) {
            console.error(e);
        }
        setUpgradeLoading(false);
    };

    const totals = usageData?.totals || { calls_cost: 0, sms_cost: 0, email_cost: 0, token_cost: 0, total_cost: 0 };
    const history = usageData?.history || [];

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            {/* HEADER */}
            <div className="flex flex-col space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Billing</h2>
                <p className="text-muted-foreground">
                    Manage your subscription and view usage costs.
                </p>
            </div>

            {/* SECTION A: SUBSCRIPTION */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    <h3 className="text-xl font-semibold">Current Plan</h3>
                </div>

                <Card className="border-2 border-[#906CDD]/30 bg-gradient-to-br from-purple-50/50 to-white">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CardTitle className="text-2xl">{currentPlan.name}</CardTitle>
                                    {currentPlan.isActive && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                            Active
                                        </span>
                                    )}
                                </div>
                                <CardDescription className="mt-1">
                                    Automate everything and grow faster
                                </CardDescription>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-[#906CDD]">
                                    ${currentPlan.price}
                                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3 mb-6">
                            {currentPlan.features.map((feature, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-sm text-slate-700 bg-white px-3 py-1.5 rounded-full border">
                                    <Check className="h-4 w-4 text-green-500" />
                                    {feature}
                                </div>
                            ))}
                        </div>
                        <Button
                            onClick={handleManageSubscription}
                            disabled={upgradeLoading}
                            className="bg-[#906CDD] hover:bg-[#7a5bb5]"
                        >
                            {upgradeLoading ? "Processing..." : "Manage Subscription"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            {/* SECTION B: USAGE & OVERAGES */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    <div>
                        <h3 className="text-xl font-semibold">Usage & Overages</h3>
                        <p className="text-sm text-muted-foreground">
                            Usage fees for telephony and AI are billed in addition to your monthly subscription.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading usage data...</div>
                ) : usageData?.error ? (
                    <div className="py-8 text-center text-red-500">Failed to load usage data</div>
                ) : (
                    <>
                        {/* USAGE CARDS */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-300">Total Cost (30d)</CardTitle>
                                    <DollarSign className="h-4 w-4 text-green-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">${totals.total_cost.toFixed(2)}</div>
                                    <p className="text-xs text-slate-400">Base + Margin applied</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Calls Cost</CardTitle>
                                    <Phone className="h-4 w-4 text-orange-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">${totals.calls_cost.toFixed(2)}</div>
                                    <p className="text-xs text-muted-foreground">AI voice minutes</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">SMS Cost</CardTitle>
                                    <MessageSquare className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">${totals.sms_cost.toFixed(2)}</div>
                                    <p className="text-xs text-muted-foreground">Text messages sent</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">AI Token Cost</CardTitle>
                                    <Zap className="h-4 w-4 text-purple-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">${totals.token_cost.toFixed(2)}</div>
                                    <p className="text-xs text-muted-foreground">LLM processing</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* USAGE CHART */}
                        <UsageChart data={history} title="Daily Usage Cost (Last 30 Days)" />
                    </>
                )}
            </div>

            <Separator />

            {/* SECTION C: PAYMENT METHOD */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-slate-500" />
                    <h3 className="text-xl font-semibold">Payment Method</h3>
                </div>

                <Card>
                    <CardContent className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">VISA</span>
                            </div>
                            <div>
                                <p className="font-medium">Visa ending in 4242</p>
                                <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                            </div>
                        </div>
                        <Button variant="outline">Update</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
