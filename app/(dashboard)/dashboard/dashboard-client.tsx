"use client";

import Link from "next/link";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Headset,
    TrendingUp,
    LineChart,
    BookOpenCheck,
    Radio,
    ArrowUpRight,
    Phone,
    MessageSquare,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

interface DashboardData {
    serviceDesk: {
        conversations: number;
        unread: number;
    };
    pipeline: {
        deals: number;
        customers: number;
    };
    performance: {
        calls: number;
        messages: number;
    };
    knowledgeBase: {
        articles: number;
    };
    tickets: {
        open: number;
    };
    chartData: { day: string; calls: number; sms: number }[];
}

export function DashboardClient({ data }: { data: DashboardData }) {
    const { serviceDesk, pipeline, performance, knowledgeBase, tickets, chartData } = data;

    // Pipeline stages for visual chart
    const pipelineData = [
        { name: "New Inquiry", value: 0, color: "#3b82f6" },
        { name: "Quote Sent", value: 0, color: "#f59e0b" },
        { name: "Follow-Up", value: 0, color: "#8b5cf6" },
        { name: "Booked", value: 0, color: "#10b981" },
    ];

    // Navigation cards matching sidebar sections (excluding Performance which becomes a chart)
    const navCards = [
        {
            title: "Service Desk",
            description: "Conversations & tickets",
            href: "/service-desk",
            icon: Headset,
            color: "blue",
            stats: [
                { label: "Conversations", value: serviceDesk.conversations },
                { label: "Unread", value: serviceDesk.unread, highlight: serviceDesk.unread > 0 },
            ]
        },
        {
            title: "Pipeline",
            description: "Deals & customers",
            href: "/pipeline",
            icon: TrendingUp,
            color: "green",
            stats: [
                { label: "Customers", value: pipeline.customers },
                { label: "Active Deals", value: pipeline.deals },
            ]
        },
        {
            title: "Shop Playbook",
            description: "Knowledge base",
            href: "/knowledge-base",
            icon: BookOpenCheck,
            color: "amber",
            stats: [
                { label: "Articles", value: knowledgeBase.articles },
            ]
        },
        {
            title: "Outreach",
            description: "Campaigns & workflows",
            href: "/outreach",
            icon: Radio,
            color: "slate",
            stats: [
                { label: "Open Tickets", value: tickets.open },
            ]
        },
    ];

    const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
        blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-600", border: "border-blue-200 hover:border-blue-300" },
        green: { bg: "bg-green-50", text: "text-green-700", icon: "text-green-600", border: "border-green-200 hover:border-green-300" },
        purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-600", border: "border-purple-200 hover:border-purple-300" },
        amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-600", border: "border-amber-200 hover:border-amber-300" },
        slate: { bg: "bg-slate-100", text: "text-slate-700", icon: "text-slate-600", border: "border-slate-200 hover:border-slate-300" },
    };

    const totalPipeline = pipelineData.reduce((sum, d) => sum + d.value, 0);
    const hasPerformanceData = chartData.some(d => d.calls > 0 || d.sms > 0);

    return (
        <div className="h-full overflow-y-auto space-y-6 p-8 pt-6">
            {/* Compact Header */}
            <div className="flex items-baseline gap-3">
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <span className="text-sm text-slate-500">Overview of your shop operations</span>
            </div>

            {/* Navigation Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {navCards.map((card) => {
                    const Icon = card.icon;
                    const colors = colorMap[card.color];
                    return (
                        <Link key={card.href} href={card.href}>
                            <Card className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${colors.border} h-full`}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                                    <div className={`h-9 w-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                        <Icon className={`h-4 w-4 ${colors.icon}`} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-3">
                                        {card.stats.map((stat, idx) => (
                                            <div key={idx}>
                                                <p className={`text-xl font-bold ${stat.highlight ? 'text-amber-600' : ''}`}>
                                                    {stat.value}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            {/* Performance Chart - Prominent Display */}
            <Link href="/performance">
                <Card className="cursor-pointer transition-all hover:shadow-lg border-purple-200 hover:border-purple-300">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                <LineChart className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Performance</CardTitle>
                                <p className="text-sm text-muted-foreground">Last 7 days activity</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-right">
                            <div>
                                <p className="text-3xl font-bold text-blue-600">{performance.calls}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                    <Phone className="h-3 w-3" /> Total Calls
                                </p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-indigo-600">{performance.messages}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                    <MessageSquare className="h-3 w-3" /> Total SMS
                                </p>
                            </div>
                            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] w-full">
                            {!hasPerformanceData ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground">
                                    <div className="text-center">
                                        <LineChart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No activity yet</p>
                                        <p className="text-xs mt-1">Calls and messages will appear here</p>
                                    </div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorSms" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                        <Area type="monotone" dataKey="calls" name="Calls" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                                        <Area type="monotone" dataKey="sms" name="SMS" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSms)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </Link>

            {/* Pipeline Stages Chart */}
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Pipeline Stages
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full flex items-center">
                        {totalPipeline === 0 ? (
                            <div className="w-full flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No deals in pipeline</p>
                                    <p className="text-xs mt-1">Deals will appear here when added</p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full flex items-center gap-6">
                                <div className="w-1/2">
                                    <ResponsiveContainer width="100%" height={180}>
                                        <PieChart>
                                            <Pie
                                                data={pipelineData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={75}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {pipelineData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-1/2 space-y-3">
                                    {pipelineData.map((stage, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                                                <span className="text-sm text-muted-foreground">{stage.name}</span>
                                            </div>
                                            <span className="font-bold">{stage.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
