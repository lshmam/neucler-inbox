"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Radio, Zap, Users, Ghost, Droplets, DollarSign,
    Gem, Send, Clock, TrendingUp, PhoneMissed, Star,
    MessageSquare, CheckCircle2, ArrowRight, Sparkles
} from "lucide-react";

// ===== MOCK DATA =====
const AUDIENCE_BUCKETS = [
    {
        id: "vips",
        name: "VIPs",
        icon: Gem,
        count: 42,
        color: "from-purple-500 to-indigo-600",
        bgColor: "bg-purple-50",
        textColor: "text-purple-700",
        avgValue: 580,
        description: "Top spenders & loyal customers"
    },
    {
        id: "lost",
        name: "Lost Customers",
        icon: Ghost,
        count: 115,
        color: "from-slate-500 to-slate-700",
        bgColor: "bg-slate-50",
        textColor: "text-slate-700",
        avgValue: 210,
        description: "No visit in 9+ months"
    },
    {
        id: "oil",
        name: "Due for Oil",
        icon: Droplets,
        count: 68,
        color: "from-amber-500 to-orange-600",
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        avgValue: 85,
        description: "Based on last service date"
    },
    {
        id: "declined",
        name: "Declined Work",
        icon: DollarSign,
        count: 12,
        color: "from-green-500 to-emerald-600",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        avgValue: 420,
        description: "Quoted but didn't book"
    }
];

const PAST_BROADCASTS = [
    { id: 1, name: "Spring Oil Special", audience: "Due for Oil", sent: 68, opened: 52, revenue: 2890, date: "2024-03-15" },
    { id: 2, name: "Win-Back Campaign", audience: "Lost Customers", sent: 115, opened: 41, revenue: 1680, date: "2024-02-28" },
    { id: 3, name: "VIP Appreciation", audience: "VIPs", sent: 42, opened: 38, revenue: 4200, date: "2024-02-14" },
];

const WORKFLOW_RECIPES = [
    {
        id: "missed-call",
        name: "Missed Call Rescue",
        description: "Text back immediately if call is missed.",
        icon: PhoneMissed,
        color: "text-red-500",
        stats: { label: "Saved", value: 12, unit: "calls this week" },
        defaultOn: true
    },
    {
        id: "review-request",
        name: "Review Request",
        description: "Send Google Review link 24h after pickup.",
        icon: Star,
        color: "text-amber-500",
        stats: { label: "Generated", value: 8, unit: "reviews this month" },
        defaultOn: true
    },
    {
        id: "stalled-quote",
        name: "Stalled Quote Nudge",
        description: "Follow up if quote is silent for 48h.",
        icon: MessageSquare,
        color: "text-blue-500",
        stats: { label: "Converted", value: 5, unit: "quotes this week" },
        defaultOn: false
    }
];

export default function OutreachPage() {
    const [activeTab, setActiveTab] = useState<"broadcasts" | "workflows">("broadcasts");
    const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
    const [message, setMessage] = useState("");
    const [workflowStates, setWorkflowStates] = useState<Record<string, boolean>>(
        WORKFLOW_RECIPES.reduce((acc, r) => ({ ...acc, [r.id]: r.defaultOn }), {})
    );

    const toggleBucket = (id: string) => {
        setSelectedBuckets(prev =>
            prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
        );
    };

    const toggleWorkflow = (id: string) => {
        setWorkflowStates(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Calculate potential revenue
    const selectedAudiences = AUDIENCE_BUCKETS.filter(b => selectedBuckets.includes(b.id));
    const totalReach = selectedAudiences.reduce((sum, b) => sum + b.count, 0);
    const potentialRevenue = selectedAudiences.reduce((sum, b) => sum + (b.count * b.avgValue * 0.15), 0);

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 overflow-auto">
            {/* TABS */}
            <div className="flex gap-2 border-b pb-2">
                <button
                    onClick={() => setActiveTab("broadcasts")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-all ${activeTab === "broadcasts"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                        }`}
                >
                    <Radio className="h-4 w-4" />
                    Broadcasts
                </button>
                <button
                    onClick={() => setActiveTab("workflows")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-all ${activeTab === "workflows"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                        }`}
                >
                    <Zap className="h-4 w-4" />
                    Workflows
                </button>
            </div>

            {/* ========== TAB 1: BROADCASTS ========== */}
            {activeTab === "broadcasts" && (
                <div className="space-y-8">
                    {/* CREATE NEW CAMPAIGN */}
                    <Card className="border-2 border-dashed border-slate-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-amber-500" />
                                Create New Campaign
                            </CardTitle>
                            <CardDescription>
                                Select your audience, craft your message, and watch revenue roll in.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* STEP 1: AUDIENCE SELECTOR */}
                            <div>
                                <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">1</span>
                                    Select Your Audience (Money Buckets)
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {AUDIENCE_BUCKETS.map((bucket) => {
                                        const Icon = bucket.icon;
                                        const isSelected = selectedBuckets.includes(bucket.id);
                                        return (
                                            <button
                                                key={bucket.id}
                                                onClick={() => toggleBucket(bucket.id)}
                                                className={`relative p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                                    ? "border-slate-900 bg-slate-50 shadow-lg"
                                                    : "border-slate-200 hover:border-slate-300 hover:shadow"
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center">
                                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                                    </div>
                                                )}
                                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${bucket.color} flex items-center justify-center mb-3`}>
                                                    <Icon className="h-5 w-5 text-white" />
                                                </div>
                                                <p className="font-semibold text-sm">{bucket.name}</p>
                                                <p className="text-xs text-muted-foreground">{bucket.description}</p>
                                                <Badge variant="secondary" className="mt-2">
                                                    <Users className="h-3 w-3 mr-1" />
                                                    {bucket.count} people
                                                </Badge>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* POTENTIAL REVENUE CALCULATOR */}
                                {selectedBuckets.length > 0 && (
                                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-green-700 font-medium">Potential Revenue Calculator</p>
                                                <p className="text-xs text-green-600">Based on 15% conversion rate</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-3xl font-bold text-green-700">${potentialRevenue.toLocaleString()}</p>
                                                <p className="text-xs text-green-600">{totalReach} people reached</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* STEP 2: MESSAGE COMPOSER */}
                            <div>
                                <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">2</span>
                                    Compose Your Message
                                </h4>
                                <Textarea
                                    placeholder="Hi {{first_name}}, it's time for your oil change! Book online and get 10% off..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="min-h-[120px]"
                                />
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">
                                            {"{{first_name}}"}
                                        </Badge>
                                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">
                                            {"{{vehicle}}"}
                                        </Badge>
                                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">
                                            {"{{last_service}}"}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{message.length}/160 chars</p>
                                </div>
                            </div>

                            {/* SEND BUTTON */}
                            <Button
                                className="w-full h-12 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white"
                                disabled={selectedBuckets.length === 0 || !message.trim()}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Send to {totalReach} Customers
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>

                    {/* PAST BROADCASTS */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-slate-500" />
                                Past Broadcasts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b text-left text-sm text-muted-foreground">
                                            <th className="pb-3 font-medium">Campaign</th>
                                            <th className="pb-3 font-medium">Audience</th>
                                            <th className="pb-3 font-medium">Sent</th>
                                            <th className="pb-3 font-medium">Open Rate</th>
                                            <th className="pb-3 font-medium">Revenue</th>
                                            <th className="pb-3 font-medium">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {PAST_BROADCASTS.map((broadcast) => (
                                            <tr key={broadcast.id} className="border-b last:border-0 hover:bg-slate-50">
                                                <td className="py-4 font-medium">{broadcast.name}</td>
                                                <td className="py-4">
                                                    <Badge variant="secondary">{broadcast.audience}</Badge>
                                                </td>
                                                <td className="py-4">{broadcast.sent}</td>
                                                <td className="py-4">
                                                    <span className={`font-medium ${(broadcast.opened / broadcast.sent) > 0.6 ? "text-green-600" : "text-amber-600"
                                                        }`}>
                                                        {Math.round((broadcast.opened / broadcast.sent) * 100)}%
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <span className="font-bold text-green-600">
                                                        ${broadcast.revenue.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-muted-foreground">
                                                    {new Date(broadcast.date).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ========== TAB 2: WORKFLOWS ========== */}
            {activeTab === "workflows" && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Always-On Automations</h3>
                            <p className="text-sm text-muted-foreground">
                                Set it and forget it. These work 24/7 so you don't have to.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {WORKFLOW_RECIPES.map((recipe) => {
                            const Icon = recipe.icon;
                            const isOn = workflowStates[recipe.id];
                            return (
                                <Card
                                    key={recipe.id}
                                    className={`relative overflow-hidden transition-all ${isOn ? "border-green-300 bg-green-50/30" : ""
                                        }`}
                                >
                                    {/* Pulsing Indicator */}
                                    {isOn && (
                                        <div className="absolute top-4 right-4">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                            </span>
                                        </div>
                                    )}
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center`}>
                                                <Icon className={`h-5 w-5 ${recipe.color}`} />
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-base">{recipe.name}</CardTitle>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-muted-foreground">{recipe.description}</p>

                                        {/* Stats (only when ON) */}
                                        {isOn && (
                                            <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg">
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                                <span className="text-sm text-green-700">
                                                    <strong>{recipe.stats.value}</strong> {recipe.stats.unit}
                                                </span>
                                            </div>
                                        )}

                                        {/* Toggle */}
                                        <div className="flex items-center justify-between pt-2">
                                            <span className={`text-sm font-medium ${isOn ? "text-green-600" : "text-slate-500"}`}>
                                                {isOn ? "Active" : "Inactive"}
                                            </span>
                                            <Switch
                                                checked={isOn}
                                                onCheckedChange={() => toggleWorkflow(recipe.id)}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Quick Stats */}
                    <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                        <CardContent className="flex items-center justify-between p-6">
                            <div>
                                <p className="text-slate-300 text-sm">Automations Working For You</p>
                                <p className="text-3xl font-bold mt-1">
                                    {Object.values(workflowStates).filter(Boolean).length} / {WORKFLOW_RECIPES.length} Active
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-300 text-sm">This Week's Automation Value</p>
                                <p className="text-3xl font-bold text-green-400 mt-1">$1,840</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
