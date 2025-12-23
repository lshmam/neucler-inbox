"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Radio, Zap, Users, Clock, TrendingUp, PhoneMissed, Star,
    MessageSquare, CheckCircle2, ArrowRight, Sparkles, Loader2, Tag
} from "lucide-react";
import { toast } from "sonner";

// ===== TYPES =====
interface AudienceGroup {
    id: string;
    name: string;
    count: number;
    avgValue: number;
    customerIds: string[];
    color: string;
    bgColor: string;
    textColor: string;
}

interface OutreachData {
    audienceGroups: AudienceGroup[];
    totalCustomers: number;
    allTags: string[];
    businessName: string;
    pastBroadcasts: {
        id: string;
        name: string;
        message: string;
        audience: string;
        recipientCount: number;
        status: string;
        sentAt: string;
    }[];
    workflows?: {
        id: string;
        type: string;
        isActive: boolean;
        config: any;
        weeklyCount: number;
    }[];
    workflowStats?: Record<string, number>;
    totalWeeklyValue?: number;
}

// ===== WORKFLOW RECIPES (Config - UI display info) =====
const WORKFLOW_RECIPES = [
    {
        id: "missed-call",
        name: "Missed Call Rescue",
        description: "Text back immediately if call is missed.",
        icon: PhoneMissed,
        color: "text-red-500",
        statsLabel: "calls rescued",
        defaultOn: true
    },
    {
        id: "review-request",
        name: "Review Request",
        description: "Send Google Review link 24h after pickup.",
        icon: Star,
        color: "text-amber-500",
        statsLabel: "reviews generated",
        defaultOn: true
    },
    {
        id: "stalled-quote",
        name: "Stalled Quote Nudge",
        description: "Follow up if quote is silent for 48h.",
        icon: MessageSquare,
        color: "text-blue-500",
        statsLabel: "quotes converted",
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

    // Data fetching state
    const [data, setData] = useState<OutreachData | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch real data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/outreach");
                if (!res.ok) throw new Error("Failed to fetch");
                const json = await res.json();
                setData(json);
            } catch (error) {
                console.error("Error fetching outreach data:", error);
                setData({ audienceGroups: [], totalCustomers: 0, allTags: [], businessName: "Your Business", pastBroadcasts: [] });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleBucket = (id: string) => {
        setSelectedBuckets(prev =>
            prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
        );
    };

    const toggleWorkflow = (id: string) => {
        setWorkflowStates(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Sending state
    const [sending, setSending] = useState(false);

    // Send broadcast handler
    const sendBroadcast = async () => {
        if (selectedBuckets.length === 0 || !message.trim()) return;

        setSending(true);
        try {
            // Collect all customer IDs from selected groups
            const customerIds = selectedAudiences.flatMap(a => a.customerIds);
            const audienceNames = selectedAudiences.map(a => a.name).join(", ");

            const res = await fetch("/api/sms/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `Broadcast to ${audienceNames}`,
                    customerIds,
                    message: message.trim(),
                }),
            });

            const result = await res.json();

            if (result.success) {
                toast.success(`Sent to ${result.campaign?.recipient_count || customerIds.length} customers!`);

                // Optimistically add the new broadcast to the list immediately
                const newBroadcast = {
                    id: result.campaign?.id || `temp-${Date.now()}`,
                    name: `Broadcast to ${audienceNames}`,
                    message: message.trim(),
                    audience: audienceNames,
                    recipientCount: result.campaign?.recipient_count || customerIds.length,
                    status: "sent",
                    sentAt: new Date().toISOString(),
                };

                setData(prev => prev ? {
                    ...prev,
                    pastBroadcasts: [newBroadcast, ...prev.pastBroadcasts]
                } : prev);

                setMessage("");
                setSelectedBuckets([]);

                // Also refetch in background to sync with server
                fetch("/api/outreach").then(res => {
                    if (res.ok) {
                        res.json().then(updatedData => setData(updatedData));
                    }
                });
            } else {
                toast.error(result.error || "Failed to send broadcast");
            }
        } catch (error) {
            console.error("Broadcast error:", error);
            toast.error("Failed to send broadcast");
        } finally {
            setSending(false);
        }
    };

    // Calculate potential revenue from selected audiences
    const selectedAudiences = data?.audienceGroups.filter(b => selectedBuckets.includes(b.id)) || [];
    const totalReach = selectedAudiences.reduce((sum, b) => sum + b.count, 0);
    const potentialRevenue = selectedAudiences.reduce((sum, b) => sum + (b.count * b.avgValue * 0.15), 0);

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 overflow-auto">
            {/* Compact Header */}
            <div className="flex items-baseline gap-3">
                <h1 className="text-2xl font-bold text-slate-900">Outreach</h1>
                <span className="text-sm text-slate-500">Broadcasts & automated workflows</span>
            </div>

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
                                    Select Your Audience (Customer Groups)
                                </h4>

                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                    </div>
                                ) : data?.audienceGroups.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed">
                                        <Tag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                        <h3 className="font-semibold text-slate-600 mb-2">No Customer Groups Yet</h3>
                                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                                            Add tags to your customers in the Service Desk to create audience groups for targeted campaigns.
                                        </p>
                                        <Button variant="outline" className="mt-4" asChild>
                                            <a href="/service-desk">Go to Service Desk</a>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {data?.audienceGroups.map((bucket) => {
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
                                                        <Tag className="h-5 w-5 text-white" />
                                                    </div>
                                                    <p className="font-semibold text-sm">{bucket.name}</p>
                                                    <p className="text-xs text-muted-foreground">Avg ${bucket.avgValue} spend</p>
                                                    <Badge variant="secondary" className="mt-2">
                                                        <Users className="h-3 w-3 mr-1" />
                                                        {bucket.count} people
                                                    </Badge>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

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

                                {/* MESSAGE PREVIEW */}
                                {message.trim() && (
                                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <p className="text-xs text-slate-500 font-medium mb-2">📱 Preview (what customers will receive):</p>
                                        <div className="bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-800 whitespace-pre-wrap">
                                            Hi [Name], this is {data?.businessName || "Your Business"}. {message.trim()}
                                            <span className="text-slate-500">{"\n"}Reply STOP to opt out.</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">* [Name] will be replaced with customer name, or skipped if unknown</p>
                                    </div>
                                )}
                            </div>

                            {/* SEND BUTTON */}
                            <Button
                                className="w-full h-12 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white"
                                disabled={selectedBuckets.length === 0 || !message.trim() || sending}
                                onClick={sendBroadcast}
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Send to {totalReach} Customers
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
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
                            {data?.pastBroadcasts && data.pastBroadcasts.length > 0 ? (
                                <div className="space-y-3">
                                    {data.pastBroadcasts.map((broadcast) => (
                                        <div key={broadcast.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-slate-900">{broadcast.name}</h4>
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    {broadcast.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                                                {broadcast.message}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {broadcast.recipientCount} recipients
                                                </span>
                                                <span>•</span>
                                                <span>{broadcast.audience}</span>
                                                <span>•</span>
                                                <span>{new Date(broadcast.sentAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500">
                                    <Radio className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                    <p className="font-medium">No broadcasts sent yet</p>
                                    <p className="text-sm text-muted-foreground">Your campaign history will appear here</p>
                                </div>
                            )}
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
                                                    <strong>{data?.workflowStats?.[recipe.id] || 0}</strong> {recipe.statsLabel} this week
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
                                <p className="text-3xl font-bold text-green-400 mt-1">${(data?.totalWeeklyValue || 0).toLocaleString()}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
