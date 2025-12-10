"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase-client";
import Link from "next/link";
import {
    Plus, Mail, Users, CheckCircle2, Eye, MousePointer2,
    AlertCircle, Ban, Send, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Campaign {
    id: string;
    created_at: string;
    name: string;
    subject: string;
    status: string;
    sent_count: number;
    delivered_count: number;
    open_count: number;
    click_count: number;
    bounce_count: number;
    complaint_count: number;
    failure_count: number;
}

interface EmailPageProps {
    initialCampaigns: Campaign[];
    merchantId: string;
}

export function EmailClientView({ initialCampaigns, merchantId }: EmailPageProps) {
    const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
    const supabase = createClient();

    // --- 1. REALTIME LISTENER ---
    useEffect(() => {
        const channel = supabase
            .channel('email-campaign-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'email_campaigns',
                    filter: `merchant_id=eq.${merchantId}`
                },
                (payload) => {
                    const updatedCampaign = payload.new as Campaign;
                    setCampaigns((prev) =>
                        prev.map((c) => c.id === updatedCampaign.id ? updatedCampaign : c)
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'email_campaigns',
                    filter: `merchant_id=eq.${merchantId}`
                },
                (payload) => {
                    setCampaigns((prev) => [payload.new as Campaign, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [merchantId, supabase]);

    // --- 2. STATS CALCULATION ---
    const stats = useMemo(() => {
        const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
        const totalDelivered = campaigns.reduce((acc, c) => acc + (c.delivered_count || 0), 0);
        const totalOpened = campaigns.reduce((acc, c) => acc + (c.open_count || 0), 0);
        const totalClicked = campaigns.reduce((acc, c) => acc + (c.click_count || 0), 0);

        const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
        const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
        const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

        return {
            totalSent,
            deliveryRate: Math.round(deliveryRate),
            openRate: Math.round(openRate),
            clickRate: Math.round(clickRate)
        };
    }, [campaigns]);

    const getRate = (num: number, total: number) => {
        if (!total || total === 0) return "0%";
        return `${Math.round((num / total) * 100)}%`;
    };

    return (
        <div className="flex-1 space-y-6 p-6">

            {/* HEADER - Compact */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Email Marketing</h2>
                    <p className="text-muted-foreground text-sm">Real-time performance metrics</p>
                </div>
                <Button asChild>
                    <Link href="/email/new">
                        <Plus className="mr-2 h-4 w-4" /> Create Campaign
                    </Link>
                </Button>
            </div>

            {/* OVERALL STATS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Emails sent lifetime</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.deliveryRate}%</div>
                        <Progress value={stats.deliveryRate} className="h-2 mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                        <Eye className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.openRate}%</div>
                        <p className="text-xs text-muted-foreground">Avg. engagement</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
                        <MousePointer2 className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.clickRate}%</div>
                        <p className="text-xs text-muted-foreground">Clicks per open</p>
                    </CardContent>
                </Card>
            </div>

            {/* CAMPAIGN LIST */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" /> Recent Campaigns
                </h3>

                {campaigns.length === 0 ? (
                    <div className="text-center py-20 bg-muted/20 rounded-xl border-dashed border-2">
                        <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No campaigns yet</h3>
                        <p className="text-muted-foreground mb-6">Send your first email blast to your customers.</p>
                        <Button asChild>
                            <Link href="/email/new">Draft Email</Link>
                        </Button>
                    </div>
                ) : (
                    campaigns.map((c) => (
                        <Card key={c.id} className="hover:bg-slate-50/50 transition-colors">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-lg">{c.name}</h4>
                                            <Badge variant={c.status === 'sent' ? 'default' : 'secondary'} className="capitalize">
                                                {c.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Subject: {c.subject}</p>

                                        {/* --- FIX: Added suppressHydrationWarning to this paragraph --- */}
                                        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                                            {new Date(c.created_at).toLocaleDateString("en-US", {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })} at {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold">{c.sent_count}</div>
                                        <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                            <Users className="h-3 w-3" /> Recipients
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border-t pt-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Delivered
                                        </div>
                                        <div className="font-semibold text-lg">
                                            {c.delivered_count || 0}
                                            <span className="text-xs font-normal text-muted-foreground ml-1">
                                                ({getRate(c.delivered_count, c.sent_count)})
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Eye className="h-3.5 w-3.5 text-blue-500" /> Opened
                                        </div>
                                        <div className="font-semibold text-lg">
                                            {c.open_count || 0}
                                            <span className="text-xs font-normal text-muted-foreground ml-1">
                                                ({getRate(c.open_count, c.delivered_count)})
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <MousePointer2 className="h-3.5 w-3.5 text-purple-500" /> Clicked
                                        </div>
                                        <div className="font-semibold text-lg">
                                            {c.click_count || 0}
                                            <span className="text-xs font-normal text-muted-foreground ml-1">
                                                ({getRate(c.click_count, c.open_count)})
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Ban className="h-3.5 w-3.5 text-orange-500" /> Bounced
                                        </div>
                                        <div className="font-semibold text-lg">{c.bounce_count || 0}</div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <AlertCircle className="h-3.5 w-3.5 text-red-500" /> Span
                                        </div>
                                        <div className="font-semibold text-lg">{c.complaint_count || 0}</div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <AlertCircle className="h-3.5 w-3.5 text-gray-500" /> Failed
                                        </div>
                                        <div className="font-semibold text-lg">{c.failure_count || 0}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}