"use client";

import Link from "next/link";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ShieldCheck,
    AlertCircle,
    MousePointerClick,
    ArrowUpRight,
    Phone,
    MessageSquare,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

// Dummy data for the bar chart (last 7 days)
const chartData = [
    { day: "Mon", calls: 4, sms: 8 },
    { day: "Tue", calls: 6, sms: 5 },
    { day: "Wed", calls: 3, sms: 10 },
    { day: "Thu", calls: 7, sms: 6 },
    { day: "Fri", calls: 5, sms: 9 },
    { day: "Sat", calls: 2, sms: 4 },
    { day: "Sun", calls: 1, sms: 3 },
];

// Dummy pipeline data
const pipelineStages = [
    { label: "New Leads", count: 12, color: "bg-blue-500", context: "Untouched", href: "/customers?status=new" },
    { label: "In Conversation", count: 5, color: "bg-yellow-500", context: "Ongoing", href: "/customers?status=active" },
    { label: "Links Sent", count: 3, color: "bg-purple-500", context: "Tagged as 'Link Sent'", href: "/customers?tag=link_sent" },
    { label: "Booked", count: 8, color: "bg-green-500", context: "Tagged as 'Booked'", href: "/customers?tag=booked" },
];

export default function DashboardPage() {
    // Dummy metrics (replace with real data later)
    const leadsCaptured = 12;
    const leadsTrend = 3;
    const needsAttention = 4;
    const linkClicks = 8;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">

            {/* HEADER */}
            <div className="flex flex-col space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">
                    Dashboard
                </h2>
                <p className="text-muted-foreground">
                    Your AI receptionist is working. Here's what's happening.
                </p>
            </div>

            {/* ROW 1: VALUE CARDS (3-Column Grid) */}
            <div className="grid gap-4 md:grid-cols-3">

                {/* CARD 1: AI Safety Net */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">AI Safety Net</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{leadsCaptured}</div>
                        <p className="text-sm font-medium text-muted-foreground mt-1">
                            Leads Captured
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                            <ArrowUpRight className="h-4 w-4" />
                            <span>+{leadsTrend} from yesterday</span>
                        </div>
                    </CardContent>
                </Card>

                {/* CARD 2: Inbox Queue (Clickable) */}
                <Link href="/inbox?filter=unread">
                    <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] relative overflow-hidden border-amber-200 bg-amber-50/30">
                        <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-amber-100 to-amber-50 rounded-full opacity-50" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Inbox Queue</CardTitle>
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <AlertCircle className="h-5 w-5 text-amber-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-amber-700">{needsAttention}</div>
                            <p className="text-sm font-medium text-amber-600 mt-1">
                                Needs Attention
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Unread messages
                            </p>
                            <div className="flex items-center gap-1 mt-2 text-sm text-blue-600">
                                <span>View Inbox</span>
                                <ArrowUpRight className="h-4 w-4" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* CARD 3: Revenue Signals */}
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-green-100 to-green-50 rounded-full opacity-50" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Signals</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <MousePointerClick className="h-5 w-5 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{linkClicks}</div>
                        <p className="text-sm font-medium text-muted-foreground mt-1">
                            Link Clicks
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Potential bookings
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ROW 2: TRAFFIC & CONVERSION (2-Column Grid: 2/3 + 1/3) */}
            <div className="grid gap-6 lg:grid-cols-3">

                {/* LEFT PANEL (66%): Lead Volume Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Phone className="h-5 w-5 text-blue-500" />
                            Inbound Traffic
                            <span className="text-sm font-normal text-muted-foreground">(Last 7 Days)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#888', fontSize: 12 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#888', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Legend />
                                    <Bar
                                        dataKey="calls"
                                        name="AI Voice Calls"
                                        fill="#3b82f6"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="sms"
                                        name="SMS Leads"
                                        fill="#9ca3af"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* RIGHT PANEL (33%): Pipeline Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-purple-500" />
                            Pipeline Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pipelineStages.map((stage, idx) => (
                            <Link key={idx} href={stage.href}>
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                                        <div>
                                            <p className="font-medium text-sm">{stage.label}</p>
                                            <p className="text-xs text-muted-foreground">{stage.context}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold">{stage.count}</span>
                                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}