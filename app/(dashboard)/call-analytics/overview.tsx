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
    Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Mock data for the overview
const RECENT_CALLS = [
    { id: "1", agent: "Sarah Mitchell", customer: "John Peterson", vehicle: "2019 BMW X5", duration: 142, date: "2024-02-12T14:30:00", sentiment: "positive", score: 92, status: "completed", type: "inbound" },
    { id: "2", agent: "Mike Ross", customer: "Lisa Chen", vehicle: "2020 Mercedes C300", duration: 45, date: "2024-02-12T13:15:00", sentiment: "neutral", score: 78, status: "completed", type: "outbound" },
    { id: "3", agent: "Sarah Mitchell", customer: "Robert Jung", vehicle: "2018 Ford F-150", duration: 0, date: "2024-02-12T11:45:00", sentiment: "neutral", score: 0, status: "missed", type: "inbound" },
    { id: "4", agent: "David Kim", customer: "Steve Brooks", vehicle: "2022 Toyota Camry", duration: 320, date: "2024-02-12T09:20:00", sentiment: "negative", score: 45, status: "completed", type: "inbound" },
    { id: "5", agent: "Jessica Lee", customer: "Karen Williams", vehicle: "2021 Honda CR-V", duration: 185, date: "2024-02-11T16:10:00", sentiment: "positive", score: 88, status: "completed", type: "outbound" },
];

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
                        <Calendar className="mr-2 h-4 w-4" /> Feb 6 - Feb 13
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
                        <div className="text-2xl font-bold">142</div>
                        <p className="text-xs text-emerald-600 flex items-center mt-1">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            +12% from last week
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Duration</CardTitle>
                        <Clock className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3:45</div>
                        <p className="text-xs text-slate-500 flex items-center mt-1">
                            Target: 4:00
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Sentiment</CardTitle>
                        <TrendingUp className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">8.4</div>
                        <p className="text-xs text-emerald-600 flex items-center mt-1">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            +0.2 points
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Missed Calls</CardTitle>
                        <PhoneMissed className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">5</div>
                        <p className="text-xs text-red-600 flex items-center mt-1">
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                            Needs attention
                        </p>
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
                                    <TableHead>Score</TableHead>
                                    <TableHead>Sentiment</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {RECENT_CALLS.map((call) => (
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
                                            {call.score > 0 ? (
                                                <Badge variant="outline" className={`font-mono 
                                                    ${call.score >= 90 ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                                                        call.score >= 70 ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                                            'border-red-200 text-red-700 bg-red-50'}`}>
                                                    {call.score}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {call.status === 'missed' ? (
                                                <Badge variant="outline" className="border-slate-200 text-slate-500">Missed</Badge>
                                            ) : (
                                                getSentimentBadge(call.sentiment)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild size="sm" variant="outline" className="h-8">
                                                <Link href={`/call-analytics/${call.id}`}>
                                                    View Analysis
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
