"use client";

import Link from "next/link";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Phone,
    Clock,
    TrendingUp,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    MoreHorizontal,
    PhoneMissed,
    PhoneIncoming,
    PhoneOutgoing,
    Calendar,
    Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";

import { createClient } from "@/lib/supabase-client";
import { useState, useEffect } from "react";

function formatDuration(seconds: number) {
    if (seconds === 0) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getSentimentBadge(sentiment: string) {
    switch (sentiment) {
        case "positive": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none">Positive</Badge>;
        case "negative": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 shadow-none">Negative</Badge>;
        default: return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200 shadow-none">Neutral</Badge>;
    }
}

export function CallAnalyticsOverview() {
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCalls: 0,
        avgDuration: 0,
        avgSentiment: 0,
        missedCalls: 0
    });

    useEffect(() => {
        const fetchCalls = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) return;

                const merchantId = user.id;

                // Fetch call logs joined with customers and agents
                // Note: Join syntax depends on foreign key relationships. 
                // If direct join isn't easy, we can fetch independently or use a view.
                // For now, let's try a standard select.

                // Calculate date range (Last 7 days)
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);

                const { data: callLogs, error } = await supabase
                    .from("call_logs")
                    .select(`
                        id,
                        created_at,
                        agent_id,
                        customer_phone,
                        status,
                        duration_seconds,
                        call_successful,
                        direction,
                        user_sentiment,
                        summary,
                        customer:customers(first_name, last_name, vehicle_year, vehicle_make, vehicle_model)
                    `)
                    .eq("merchant_id", merchantId)
                    .gte("created_at", startDate.toISOString())
                    .lte("created_at", endDate.toISOString())
                    .order("created_at", { ascending: false });

                if (error) throw error;

                // Fetch agents to map names (since agent_id is in call_logs)
                const { data: agents } = await supabase
                    .from("ai_agents")
                    .select("id, name")
                    .eq("merchant_id", merchantId);

                const agentMap = new Map(agents?.map(a => [a.id, a.name]) || []);

                // Process data
                const processedCalls = (callLogs || []).map((log: any) => ({
                    id: log.id,
                    agent: agentMap.get(log.agent_id) || "AI Assistant",
                    customer: log.customer ? `${log.customer.first_name || ''} ${log.customer.last_name || ''}`.trim() || log.customer_phone : log.customer_phone,
                    vehicle: log.customer ? `${log.customer.vehicle_year || ''} ${log.customer.vehicle_make || ''} ${log.customer.vehicle_model || ''}`.trim() : "-",
                    duration: log.duration_seconds || 0,
                    date: log.created_at,
                    sentiment: (log.user_sentiment || "neutral").toLowerCase(),
                    score: 0, // Score logic depends on your requirements, defaulting to 0 or could be a random mock for now if not in DB
                    status: log.status || (log.call_successful ? "completed" : "failed"),
                    type: log.direction || "inbound"
                }));

                setCalls(processedCalls);

                // Calculate KPIs
                const total = processedCalls.length;
                const totalDuration = processedCalls.reduce((acc, c) => acc + c.duration, 0);
                const avgDur = total > 0 ? totalDuration / total : 0;

                // Detailed sentiment calc
                let sentimentScoreTotal = 0;
                processedCalls.forEach(c => {
                    if (c.sentiment === 'positive') sentimentScoreTotal += 10;
                    else if (c.sentiment === 'neutral') sentimentScoreTotal += 5;
                    // negative = 0
                });
                const avgSent = total > 0 ? (sentimentScoreTotal / total) : 0;

                const missed = processedCalls.filter(c => c.status === 'missed' || c.status === 'voicemail' || c.duration === 0).length;

                setStats({
                    totalCalls: total,
                    avgDuration: avgDur,
                    avgSentiment: avgSent,
                    missedCalls: missed
                });

            } catch (error) {
                console.error("Error fetching call analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCalls();
    }, []);

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="p-8 pt-6 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Call Analytics</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Overview of communication performance and AI insights.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">Last 7 Days</span>
                    <Button variant="outline" className="bg-white">
                        <Calendar className="mr-2 h-4 w-4" /> Last 7 Days
                    </Button>
                    <Button className="bg-slate-900 text-white">
                        <BarChart3 className="mr-2 h-4 w-4" /> Full Report
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Calls</CardTitle>
                        <Phone className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCalls}</div>
                        {/* 
                        <p className="text-xs text-emerald-600 flex items-center mt-1">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            +12% from last week
                        </p>
                        */}
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Duration</CardTitle>
                        <Clock className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatDuration(Math.round(stats.avgDuration))}</div>
                        {/* 
                        <p className="text-xs text-slate-500 flex items-center mt-1">
                            Target: 4:00
                        </p>
                        */}
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Sentiment</CardTitle>
                        <TrendingUp className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.avgSentiment >= 7 ? 'text-emerald-600' : stats.avgSentiment >= 4 ? 'text-blue-600' : 'text-red-600'}`}>
                            {stats.avgSentiment.toFixed(1)}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center mt-1">
                            (0-10 Scale)
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Missed Calls</CardTitle>
                        <PhoneMissed className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.missedCalls > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                            {stats.missedCalls}
                        </div>
                        {/* 
                        <p className="text-xs text-red-600 flex items-center mt-1">
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                            Needs attention
                        </p>
                        */}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Calls */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Recent Conversations</CardTitle>
                            <CardDescription>Deep dive into individual call recordings and transcripts.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input placeholder="Search..." className="pl-9 w-[200px] h-9" />
                            </div>
                            <Button variant="outline" size="sm" className="h-9">
                                <Filter className="mr-2 h-4 w-4" /> Filter
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-md border-t border-slate-100">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[100px]">Type</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Sentiment</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {calls.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                                            No calls found in the last 7 days.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    calls.map((call) => (
                                        <TableRow key={call.id} className="hover:bg-slate-50/50">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {call.type === 'inbound' ? (
                                                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
                                                            <PhoneIncoming className="h-4 w-4" />
                                                        </div>
                                                    ) : (
                                                        <div className="p-1.5 bg-green-100 text-green-600 rounded-md">
                                                            <PhoneOutgoing className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{call.customer}</div>
                                                <div className="text-xs text-muted-foreground">{call.vehicle}</div>
                                            </TableCell>
                                            <TableCell>{call.agent}</TableCell>
                                            <TableCell className="font-mono text-sm text-slate-600">{formatDuration(call.duration)}</TableCell>
                                            <TableCell className="text-slate-600">
                                                {new Date(call.date).toLocaleDateString()}
                                                <span className="text-xs text-slate-400 block">
                                                    {new Date(call.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`font-mono 
                                                    ${call.status === 'completed' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                                                        call.status === 'missed' ? 'border-red-200 text-red-700 bg-red-50' :
                                                            'border-slate-200 text-slate-700 bg-slate-50'}`}>
                                                    {call.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {getSentimentBadge(call.sentiment)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild size="sm" variant="outline" className="h-8">
                                                    <Link href={`/call-analytics/${call.id}`}>
                                                        View Analysis
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
