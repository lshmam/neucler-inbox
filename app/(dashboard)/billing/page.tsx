"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UsageChart } from "@/components/usage/UsageChart";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    DollarSign, MessageSquare, Phone, Zap, Check,
    CreditCard, Crown, Sparkles, ArrowRight, Clock, AlertCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";

// Plan configurations
const PLANS = {
    starter: {
        name: "Starter",
        price: 79,
        features: [
            "Unified Support Inbox",
            "Operational Playbook",
            "Post-Call Performance Scoring",
            "Dispute Protection Vault",
            "Essential Insights Dashboard"
        ]
    },
    pro: {
        name: "Pro",
        price: 149,
        features: [
            "Everything in Starter",
            "AI Smart-Filter Call Routing",
            "Active Agent Copilot",
            "Automated Missed Call Rescue",
            "Smart Capacity Waitlist",
            "AI Voice Receptionists"
        ]
    }
};

export default function BillingPage() {
    const [loading, setLoading] = useState(true);
    const [usageData, setUsageData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const [subscription, setSubscription] = useState<{
        status: string;
        tier: string | null;
        trialEndsAt: string | null;
    }>({ status: "trialing", tier: "pro", trialEndsAt: null });

    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            console.log("[Billing] Fetching data...");
            setLoading(true);

            try {
                // Fetch subscription status from Supabase
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: merchant } = await supabase
                        .from("merchants")
                        .select("subscription_status, subscription_tier, trial_ends_at")
                        .eq("id", user.id)
                        .single();

                    if (merchant) {
                        setSubscription({
                            status: merchant.subscription_status || "trialing",
                            tier: merchant.subscription_tier || "pro",
                            trialEndsAt: merchant.trial_ends_at,
                        });
                    }
                }

                // Fetch usage data
                const res = await fetch("/api/usage");
                if (!res.ok) {
                    const errorText = await res.text();
                    console.error("[Billing] API Error:", res.status, errorText);
                    setError(`API returned ${res.status}`);
                } else {
                    const json = await res.json();
                    if (json.error) {
                        setError(json.error);
                    } else {
                        setUsageData(json);
                    }
                }
            } catch (e) {
                console.error("[Billing] Fetch error:", e);
                setError(e instanceof Error ? e.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleManageSubscription = async () => {
        setUpgradeLoading(true);
        try {
            // TODO: Open Stripe Customer Portal for existing subscribers
            const res = await fetch("/api/stripe/portal", { method: "POST" });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch (e) {
            console.error(e);
        }
        setUpgradeLoading(false);
    };

    // Calculate trial days remaining
    const getTrialDaysRemaining = () => {
        if (!subscription.trialEndsAt) return null;
        const trialEnd = new Date(subscription.trialEndsAt);
        const now = new Date();
        const diffTime = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    };

    const trialDaysRemaining = getTrialDaysRemaining();
    const isTrialing = subscription.status === "trialing" && trialDaysRemaining !== null && trialDaysRemaining > 0;
    const currentPlan = PLANS[subscription.tier as keyof typeof PLANS] || PLANS.pro;

    const totals = usageData?.totals || { calls_cost: 0, sms_cost: 0, email_cost: 0, token_cost: 0, total_cost: 0 };
    const history = usageData?.history || [];
    const hasError = !!error;

    const getStatusBadge = () => {
        switch (subscription.status) {
            case "trialing":
                return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Trial</Badge>;
            case "active":
                return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
            case "past_due":
                return <Badge className="bg-red-100 text-red-700 border-red-200">Past Due</Badge>;
            case "canceled":
                return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Canceled</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-700 border-slate-200">{subscription.status}</Badge>;
        }
    };

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 overflow-auto">
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

                <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CardTitle className="text-2xl">{currentPlan.name}</CardTitle>
                                    {getStatusBadge()}
                                </div>
                                <CardDescription className="mt-1">
                                    {isTrialing
                                        ? "You're on a free trial. Your card will be charged when trial ends."
                                        : "Automate everything and grow faster"}
                                </CardDescription>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-blue-600">
                                    ${currentPlan.price}
                                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Trial Countdown */}
                        {isTrialing && trialDaysRemaining !== null && (
                            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                                <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full">
                                    <Clock className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-amber-900">
                                        {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} left in trial
                                    </p>
                                    <p className="text-sm text-amber-700">
                                        Trial ends on {new Date(subscription.trialEndsAt!).toLocaleDateString("en-US", {
                                            weekday: "long",
                                            month: "long",
                                            day: "numeric"
                                        })}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Past Due Warning */}
                        {subscription.status === "past_due" && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                                <div>
                                    <p className="font-semibold text-red-900">Payment Failed</p>
                                    <p className="text-sm text-red-700">
                                        Please update your payment method to continue using all features.
                                    </p>
                                </div>
                            </div>
                        )}

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
                            className="bg-blue-600 hover:bg-blue-700"
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
                ) : (
                    <>
                        {/* Error Banner */}
                        {hasError && (
                            <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                <p className="font-medium">Failed to load usage data</p>
                                <p className="text-xs text-red-500 mt-1">{error}</p>
                            </div>
                        )}

                        {/* USAGE CARDS */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-300">Total Cost (30d)</CardTitle>
                                    <DollarSign className="h-4 w-4 text-green-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">
                                        {hasError ? <span className="text-red-400">—</span> : `$${totals.total_cost.toFixed(2)}`}
                                    </div>
                                    <p className="text-xs text-slate-400">{hasError ? "Unable to load" : "Base + Margin applied"}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Calls Cost</CardTitle>
                                    <Phone className="h-4 w-4 text-orange-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {hasError ? <span className="text-red-400">—</span> : `$${totals.calls_cost.toFixed(2)}`}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{hasError ? "Unable to load" : "AI voice minutes"}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">SMS Cost</CardTitle>
                                    <MessageSquare className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {hasError ? <span className="text-red-400">—</span> : `$${totals.sms_cost.toFixed(2)}`}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{hasError ? "Unable to load" : "Text messages sent"}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">AI Token Cost</CardTitle>
                                    <Zap className="h-4 w-4 text-purple-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {hasError ? <span className="text-red-400">—</span> : `$${totals.token_cost.toFixed(2)}`}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{hasError ? "Unable to load" : "LLM processing"}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* USAGE CHART - Only show if no error */}
                        {!hasError && <UsageChart data={history} title="Daily Usage Cost (Last 30 Days)" />}
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
                        <Button variant="outline" onClick={handleManageSubscription}>Update</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
