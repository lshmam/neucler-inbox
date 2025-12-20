"use client";

import { useState, useEffect } from "react";
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, LineChart, Line, Cell
} from "recharts";
import {
    Activity, Clock, Target, TrendingUp, TrendingDown,
    Trophy, Lightbulb, Heart, MessageCircle, Users, AlertTriangle,
    DollarSign, Flame, BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageLoader } from "@/components/ui/page-loader";
import { toast } from "sonner";

// ============= MOCK DATA =============
const MOCK_DATA = {
    kpis: {
        avgScore: 84,
        avgResolutionHours: 2.4,
        bookingRate: 67,
        trend: 2.4
    },
    radarData: [
        { category: "Speed", teamAvg: 17, goal: 16 },
        { category: "Knowledge", teamAvg: 14, goal: 16 },
        { category: "Hospitality", teamAvg: 18, goal: 16 },
        { category: "Process", teamAvg: 15, goal: 16 },
        { category: "Closing", teamAvg: 16, goal: 16 },
    ],
    activityFeed: [
        { ticketId: "1", title: "Oil change inquiry - Great upsell", score: 94, feedbackSummary: "Excellent greeting, smooth transition to premium package recommendation. Customer booked full service.", type: "high_performance", createdAt: "2024-12-18T15:30:00Z", likes: 5 },
        { ticketId: "2", title: "Brake inspection call", score: 62, feedbackSummary: "Missed opportunity to book appointment. Consider asking more probing questions about symptoms.", type: "learning", createdAt: "2024-12-18T14:20:00Z", likes: 0 },
        { ticketId: "3", title: "Transmission service - Perfect close", score: 98, feedbackSummary: "Flawless call handling. Built rapport, addressed concerns, secured booking within 3 minutes.", type: "high_performance", createdAt: "2024-12-18T12:45:00Z", likes: 12 },
        { ticketId: "4", title: "Tire rotation request", score: 65, feedbackSummary: "Good product knowledge but forgot to offer courtesy inspection. Add to standard process.", type: "learning", createdAt: "2024-12-18T11:15:00Z", likes: 1 },
    ],
    staffAudit: [
        { id: "1", name: "AI Agent", interactions: 145, consistencyScore: 86, primaryVariance: "Closing", varianceScore: 14 },
        { id: "2", name: "Mike T.", interactions: 52, consistencyScore: 79, primaryVariance: "Speed", varianceScore: 12 },
        { id: "3", name: "Sarah K.", interactions: 38, consistencyScore: 91, primaryVariance: "Process", varianceScore: 15 },
        { id: "4", name: "James R.", interactions: 27, consistencyScore: 74, primaryVariance: "Knowledge", varianceScore: 11 },
    ],
    revenueCapture: [
        { agent: "AI Agent", quoted: 48000, booked: 41000 },
        { agent: "Mike T.", quoted: 22000, booked: 15000 },
        { agent: "Sarah K.", quoted: 18000, booked: 16500 },
        { agent: "James R.", quoted: 12000, booked: 7500 },
    ],
    objections: [
        { reason: "Price Too High", count: 34 },
        { reason: "Can't Wait", count: 28 },
        { reason: "Need Spousal Approval", count: 19 },
        { reason: "Shopping Around", count: 15 },
    ],
    trendHistory: [
        { week: "W1", score: 72 },
        { week: "W2", score: 74 },
        { week: "W3", score: 71 },
        { week: "W4", score: 78 },
        { week: "W5", score: 80 },
        { week: "W6", score: 79 },
        { week: "W7", score: 82 },
        { week: "W8", score: 84 },
    ],
    volumeHeatmap: [
        // Day 0 = Mon, hours 7-18 (7am-6pm)
        { day: 0, hour: 7, volume: 2 }, { day: 0, hour: 8, volume: 8 }, { day: 0, hour: 9, volume: 15 },
        { day: 0, hour: 10, volume: 18 }, { day: 0, hour: 11, volume: 12 }, { day: 0, hour: 12, volume: 8 },
        { day: 0, hour: 13, volume: 10 }, { day: 0, hour: 14, volume: 14 }, { day: 0, hour: 15, volume: 16 },
        { day: 0, hour: 16, volume: 20 }, { day: 0, hour: 17, volume: 15 }, { day: 0, hour: 18, volume: 5 },
        { day: 1, hour: 7, volume: 3 }, { day: 1, hour: 8, volume: 10 }, { day: 1, hour: 9, volume: 14 },
        { day: 1, hour: 10, volume: 16 }, { day: 1, hour: 11, volume: 11 }, { day: 1, hour: 12, volume: 6 },
        { day: 1, hour: 13, volume: 9 }, { day: 1, hour: 14, volume: 12 }, { day: 1, hour: 15, volume: 15 },
        { day: 1, hour: 16, volume: 18 }, { day: 1, hour: 17, volume: 12 }, { day: 1, hour: 18, volume: 4 },
        { day: 2, hour: 7, volume: 1 }, { day: 2, hour: 8, volume: 7 }, { day: 2, hour: 9, volume: 12 },
        { day: 2, hour: 10, volume: 14 }, { day: 2, hour: 11, volume: 10 }, { day: 2, hour: 12, volume: 5 },
        { day: 2, hour: 13, volume: 8 }, { day: 2, hour: 14, volume: 11 }, { day: 2, hour: 15, volume: 13 },
        { day: 2, hour: 16, volume: 17 }, { day: 2, hour: 17, volume: 11 }, { day: 2, hour: 18, volume: 3 },
        { day: 3, hour: 7, volume: 2 }, { day: 3, hour: 8, volume: 9 }, { day: 3, hour: 9, volume: 16 },
        { day: 3, hour: 10, volume: 22 }, { day: 3, hour: 11, volume: 15 }, { day: 3, hour: 12, volume: 9 },
        { day: 3, hour: 13, volume: 12 }, { day: 3, hour: 14, volume: 18 }, { day: 3, hour: 15, volume: 21 },
        { day: 3, hour: 16, volume: 25 }, { day: 3, hour: 17, volume: 18 }, { day: 3, hour: 18, volume: 6 },
        { day: 4, hour: 7, volume: 4 }, { day: 4, hour: 8, volume: 11 }, { day: 4, hour: 9, volume: 18 },
        { day: 4, hour: 10, volume: 20 }, { day: 4, hour: 11, volume: 14 }, { day: 4, hour: 12, volume: 8 },
        { day: 4, hour: 13, volume: 11 }, { day: 4, hour: 14, volume: 15 }, { day: 4, hour: 15, volume: 19 },
        { day: 4, hour: 16, volume: 23 }, { day: 4, hour: 17, volume: 16 }, { day: 4, hour: 18, volume: 7 },
        { day: 5, hour: 7, volume: 5 }, { day: 5, hour: 8, volume: 12 }, { day: 5, hour: 9, volume: 10 },
        { day: 5, hour: 10, volume: 8 }, { day: 5, hour: 11, volume: 6 }, { day: 5, hour: 12, volume: 4 },
        { day: 5, hour: 13, volume: 3 }, { day: 5, hour: 14, volume: 2 }, { day: 5, hour: 15, volume: 0 },
        { day: 5, hour: 16, volume: 0 }, { day: 5, hour: 17, volume: 0 }, { day: 5, hour: 18, volume: 0 },
        { day: 6, hour: 7, volume: 0 }, { day: 6, hour: 8, volume: 0 }, { day: 6, hour: 9, volume: 0 },
        { day: 6, hour: 10, volume: 0 }, { day: 6, hour: 11, volume: 0 }, { day: 6, hour: 12, volume: 0 },
        { day: 6, hour: 13, volume: 0 }, { day: 6, hour: 14, volume: 0 }, { day: 6, hour: 15, volume: 0 },
        { day: 6, hour: 16, volume: 0 }, { day: 6, hour: 17, volume: 0 }, { day: 6, hour: 18, volume: 0 },
    ],
    totalTickets: 262
};

// ============= TYPES =============
interface PerformanceData {
    kpis: { avgScore: number; avgResolutionHours: number; bookingRate: number; trend: number };
    radarData: { category: string; teamAvg: number; goal: number }[];
    activityFeed: { ticketId: string; title: string; score: number; feedbackSummary: string; type: string; createdAt: string; likes: number }[];
    staffAudit: { id: string; name: string; interactions: number; consistencyScore: number; primaryVariance: string; varianceScore: number }[];
    revenueCapture: { agent: string; quoted: number; booked: number }[];
    objections: { reason: string; count: number }[];
    trendHistory: { week: string; score: number }[];
    volumeHeatmap: { day: number; hour: number; volume: number }[];
    totalTickets: number;
}

// ============= KPI HEADER =============
function KPIHeader({ kpis }: { kpis: PerformanceData["kpis"] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-gray-300 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                        <Target className="h-4 w-4" /> Shop Consistency
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-mono font-bold text-gray-900">{kpis.avgScore}</span>
                        <span className="text-lg text-gray-500">/100</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                        {kpis.trend >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                        <span className={`text-sm font-medium ${kpis.trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {kpis.trend >= 0 ? "▲" : "▼"} {Math.abs(kpis.trend)}%
                        </span>
                        <span className="text-xs text-gray-400 ml-1">vs last week</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white border-gray-300 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Avg Resolution
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-mono font-bold text-gray-900">{kpis.avgResolutionHours}</span>
                        <span className="text-lg text-gray-500">hrs</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Time to close tickets</p>
                </CardContent>
            </Card>

            <Card className="bg-white border-gray-300 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Booking Rate
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-mono font-bold text-gray-900">{kpis.bookingRate}</span>
                        <span className="text-lg text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Tickets → Appointments</p>
                </CardContent>
            </Card>
        </div>
    );
}

// ============= REVENUE CAPTURE WIDGET =============
function RevenueCaptureWidget({ data }: { data: PerformanceData["revenueCapture"] }) {
    const safeData = data || MOCK_DATA.revenueCapture;
    const totalQuoted = safeData.reduce((sum, d) => sum + d.quoted, 0);
    const totalBooked = safeData.reduce((sum, d) => sum + d.booked, 0);
    const leakage = totalQuoted - totalBooked;

    return (
        <Card className="bg-white border-gray-300 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" /> Revenue Capture
                </CardTitle>
                <CardDescription>Quoted vs Booked value per agent</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={safeData} layout="vertical" margin={{ left: 60, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                            <XAxis type="number" tickFormatter={(v) => `$${v / 1000}k`} tick={{ fill: "#6b7280", fontSize: 11 }} />
                            <YAxis type="category" dataKey="agent" tick={{ fill: "#374151", fontSize: 12 }} width={60} />
                            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                            <Bar dataKey="quoted" name="Quoted" fill="#9ca3af" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="booked" name="Booked" fill="#2563eb" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">Revenue Leakage</span>
                    </div>
                    <span className="text-lg font-mono font-bold text-red-700">${(leakage / 1000).toFixed(1)}k lost</span>
                </div>
            </CardContent>
        </Card>
    );
}

// ============= OBJECTION ANALYSIS =============
function ObjectionAnalysis({ data }: { data: PerformanceData["objections"] }) {
    const safeData = data || MOCK_DATA.objections;
    const colors = ["#ef4444", "#f97316", "#eab308", "#6b7280"];
    const maxCount = Math.max(...safeData.map(d => d.count), 1);

    return (
        <Card className="bg-white border-gray-300 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" /> Objection Analysis
                </CardTitle>
                <CardDescription>Why deals aren't closing</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {safeData.map((item, index) => (
                        <div key={item.reason} className="flex items-center gap-3">
                            <div className="w-32 text-sm text-gray-700 truncate">{item.reason}</div>
                            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${(item.count / maxCount) * 100}%`,
                                        backgroundColor: colors[index % colors.length]
                                    }}
                                />
                            </div>
                            <span className="text-sm font-mono font-bold text-gray-900 w-8 text-right">{item.count}</span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">Total objections recorded from closed-lost tickets</p>
            </CardContent>
        </Card>
    );
}

// ============= TREND HISTORY =============
function TrendHistory({ data }: { data: PerformanceData["trendHistory"] }) {
    const safeData = data || MOCK_DATA.trendHistory;
    return (
        <Card className="bg-white border-gray-300 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" /> Consistency Trend
                </CardTitle>
                <CardDescription>8-week shop performance trajectory</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={safeData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="week" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[60, 100]} tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                            <Tooltip formatter={(v: number) => [v, "Score"]} />
                            <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

// ============= VOLUME HEATMAP =============
function VolumeHeatmap({ data }: { data: PerformanceData["volumeHeatmap"] }) {
    const safeData = data || MOCK_DATA.volumeHeatmap;
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const maxVolume = Math.max(...safeData.map(d => d.volume), 1);

    const getColor = (volume: number) => {
        if (volume === 0) return "bg-gray-100";
        const intensity = volume / maxVolume;
        if (intensity > 0.8) return "bg-blue-700";
        if (intensity > 0.6) return "bg-blue-500";
        if (intensity > 0.4) return "bg-blue-400";
        if (intensity > 0.2) return "bg-blue-300";
        return "bg-blue-200";
    };

    const getVolume = (day: number, hour: number) => {
        return safeData.find(d => d.day === day && d.hour === hour)?.volume || 0;
    };

    return (
        <Card className="bg-white border-gray-300 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5" /> Call Volume Heatmap
                </CardTitle>
                <CardDescription>Darker = Higher volume • See when the shop is overwhelmed</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="min-w-[400px]">
                        {/* Hour labels */}
                        <div className="flex mb-1">
                            <div className="w-10" />
                            {hours.map(h => (
                                <div key={h} className="flex-1 text-center text-[10px] text-gray-500">
                                    {h > 12 ? `${h - 12}p` : `${h}a`}
                                </div>
                            ))}
                        </div>
                        {/* Grid */}
                        {days.map((day, dayIndex) => (
                            <div key={day} className="flex mb-1">
                                <div className="w-10 text-xs text-gray-600 font-medium flex items-center">{day}</div>
                                {hours.map(hour => {
                                    const vol = getVolume(dayIndex, hour);
                                    return (
                                        <div
                                            key={`${dayIndex}-${hour}`}
                                            className={`flex-1 h-5 mx-0.5 rounded-sm ${getColor(vol)} transition-colors cursor-pointer hover:ring-2 hover:ring-blue-400`}
                                            title={`${day} ${hour}:00 - ${vol} calls`}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                        {/* Legend */}
                        <div className="flex items-center justify-end gap-2 mt-3 text-xs text-gray-500">
                            <span>Less</span>
                            <div className="flex gap-0.5">
                                <div className="w-3 h-3 rounded-sm bg-gray-100" />
                                <div className="w-3 h-3 rounded-sm bg-blue-200" />
                                <div className="w-3 h-3 rounded-sm bg-blue-400" />
                                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                                <div className="w-3 h-3 rounded-sm bg-blue-700" />
                            </div>
                            <span>More</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============= TEAM SKILL RADAR (Full Size) =============
function TeamSkillRadarFull({ data }: { data: PerformanceData["radarData"] }) {
    return (
        <Card className="bg-white border-gray-300 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Team Skill Profile
                </CardTitle>
                <CardDescription>Current shop average vs. standard goal (20 max per category)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data || MOCK_DATA.radarData}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="category" tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 20]} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                            <Radar name="Standard Goal" dataKey="goal" stroke="#9ca3af" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                            <Radar name="Team Average" dataKey="teamAvg" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                            <Legend wrapperStyle={{ paddingTop: "20px" }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

// ============= TEAM SKILL RADAR (Compact) =============
function TeamSkillRadar({ data }: { data: PerformanceData["radarData"] }) {
    return (
        <Card className="bg-white border-gray-300 shadow-sm h-full">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Team Skill Profile
                </CardTitle>
                <CardDescription>Avg vs Goal (20 max)</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="category" tick={{ fill: "#6b7280", fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 20]} tick={{ fill: "#9ca3af", fontSize: 9 }} />
                            <Radar name="Goal" dataKey="goal" stroke="#9ca3af" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                            <Radar name="Team Avg" dataKey="teamAvg" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

// ============= SHOP ACTIVITY FEED =============
function ShopActivityFeed({ items }: { items: PerformanceData["activityFeed"] }) {
    const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
    const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const counts: Record<string, number> = {};
        items.forEach(item => { counts[item.ticketId] = item.likes; });
        setLikeCounts(counts);
    }, [items]);

    const handleLike = async (ticketId: string) => {
        try {
            const res = await fetch(`/api/tickets/${ticketId}/likes`, { method: "POST" });
            const data = await res.json();
            if (data.liked) {
                setLikedItems(prev => new Set([...prev, ticketId]));
                setLikeCounts(prev => ({ ...prev, [ticketId]: (prev[ticketId] || 0) + 1 }));
                toast.success("High five! 🖐️");
            } else {
                setLikedItems(prev => { const next = new Set(prev); next.delete(ticketId); return next; });
                setLikeCounts(prev => ({ ...prev, [ticketId]: Math.max(0, (prev[ticketId] || 1) - 1) }));
            }
        } catch { toast.error("Failed to like"); }
    };

    const formatTime = (dateStr: string) => {
        const diffHours = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
        if (diffHours < 1) return "Just now";
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    return (
        <Card className="bg-white border-gray-300 shadow-sm h-full">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" /> Activity Feed
                </CardTitle>
                <CardDescription>Notable calls</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[320px] px-4">
                    <div className="space-y-2 pb-4">
                        {items.map((item) => (
                            <div key={item.ticketId} className={`p-3 rounded-lg border ${item.type === "high_performance" ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-1">
                                        {item.type === "high_performance" ? <Trophy className="h-3 w-3 text-green-600" /> : <Lightbulb className="h-3 w-3 text-amber-600" />}
                                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${item.type === "high_performance" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                            {item.type === "high_performance" ? "High" : "Learn"}
                                        </Badge>
                                    </div>
                                    <span className="text-[10px] text-gray-400">{formatTime(item.createdAt)}</span>
                                </div>
                                <h4 className="font-medium text-gray-900 text-xs mb-1 line-clamp-1">{item.title}</h4>
                                <p className="text-[10px] text-gray-600 line-clamp-2 mb-2">{item.feedbackSummary}</p>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-gray-900 text-sm">{item.score}<span className="text-xs text-gray-400">/100</span></span>
                                    <Button variant="ghost" size="sm" onClick={() => handleLike(item.ticketId)} className={`h-6 px-1.5 ${likedItems.has(item.ticketId) ? "text-red-500" : "text-gray-400"}`}>
                                        <Heart className={`h-3 w-3 mr-0.5 ${likedItems.has(item.ticketId) ? "fill-current" : ""}`} />
                                        <span className="text-[10px]">{likeCounts[item.ticketId] || 0}</span>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

// ============= STAFF AUDIT TABLE =============
function StaffAuditTable({ data }: { data: PerformanceData["staffAudit"] }) {
    return (
        <Card className="bg-white border-gray-300 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Staff Performance Audit</CardTitle>
                <CardDescription>Per-agent statistics • Coaching opportunities</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-2 px-4 font-semibold text-gray-600 uppercase text-xs">Agent</th>
                                <th className="text-right py-2 px-4 font-semibold text-gray-600 uppercase text-xs">Interactions</th>
                                <th className="text-right py-2 px-4 font-semibold text-gray-600 uppercase text-xs">Consistency</th>
                                <th className="text-left py-2 px-4 font-semibold text-gray-600 uppercase text-xs">Variance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((agent, i) => (
                                <tr key={agent.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}>
                                    <td className="py-2 px-4 font-medium text-gray-900">{agent.name}</td>
                                    <td className="py-2 px-4 text-right font-mono text-gray-700">{agent.interactions}</td>
                                    <td className="py-2 px-4 text-right">
                                        <span className={`font-mono font-bold ${agent.consistencyScore >= 85 ? "text-green-600" : agent.consistencyScore >= 70 ? "text-amber-600" : "text-red-600"}`}>
                                            {agent.consistencyScore}
                                        </span>
                                    </td>
                                    <td className="py-2 px-4">
                                        <div className="flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                                            <span className="text-gray-600 text-xs">{agent.primaryVariance}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

// ============= MAIN PAGE =============
export default function PerformancePage() {
    const [data, setData] = useState<PerformanceData>(MOCK_DATA);
    const [loading, setLoading] = useState(true);
    const [useMockData, setUseMockData] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/performance");
                if (!res.ok) throw new Error("Failed to fetch");
                const json = await res.json();
                if (json.totalTickets && json.totalTickets > 0) {
                    setData({ ...MOCK_DATA, ...json }); // Merge mock for new fields
                } else {
                    setUseMockData(true);
                }
            } catch {
                setUseMockData(true);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <PageLoader />;
    }

    const tabs = [
        { id: "overview", label: "Overview", icon: Target },
        { id: "financial", label: "Financial", icon: DollarSign },
        { id: "operations", label: "Operations", icon: Flame },
    ];

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gray-100 min-h-screen">
            {/* Demo Mode Badge */}
            {useMockData && (
                <div className="flex justify-end">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Demo Mode</Badge>
                </div>
            )}

            {/* KPI Cards - Always visible */}
            <KPIHeader kpis={data.kpis} />

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-gray-200 p-1 rounded-lg w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* Main Content Grid - Radar and Activity Feed */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <TeamSkillRadarFull data={data.radarData} />
                        </div>
                        <div className="lg:col-span-1">
                            <ShopActivityFeed items={data.activityFeed} />
                        </div>
                    </div>

                    {/* Staff Audit Table */}
                    <StaffAuditTable data={data.staffAudit} />
                </div>
            )}

            {activeTab === "financial" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <RevenueCaptureWidget data={data.revenueCapture} />
                        <ObjectionAnalysis data={data.objections} />
                    </div>
                    <TrendHistory data={data.trendHistory} />
                </div>
            )}

            {activeTab === "operations" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <VolumeHeatmap data={data.volumeHeatmap} />
                        <TeamSkillRadar data={data.radarData} />
                    </div>
                    <StaffAuditTable data={data.staffAudit} />
                </div>
            )}
        </div>
    );
}

