"use client";

import Link from "next/link";
import { useState } from "react";
import { useCall, CallCustomer } from "@/components/call-context";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    LineChart,
    Phone,
    MessageSquare,
    Trophy,
    Target,
    DollarSign,
    Crown,
    PhoneOutgoing,
    ChevronRight,
    Zap,
    Clock,
    CalendarCheck,
    TrendingUp,
    ArrowUpRight,
    Search
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// ============= TYPES =============
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

// ============= COMMISSION TIERS =============
const TIERS = [
    { name: "Bronze", min: 0, max: 10, bonus: 15, icon: "🥉" },
    { name: "Silver", min: 11, max: 25, bonus: 25, icon: "🥈" },
    { name: "Gold", min: 26, max: 45, bonus: 40, icon: "🥇" },
    { name: "Platinum", min: 46, max: 999, bonus: 60, icon: "💎" },
];

function getTier(bookings: number) {
    return TIERS.find(t => bookings >= t.min && bookings <= t.max) || TIERS[0];
}

function getNextTier(bookings: number) {
    const currentIdx = TIERS.findIndex(t => bookings >= t.min && bookings <= t.max);
    return currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;
}

// ============= MOCK DATA =============
const CURRENT_USER = {
    name: "Sarah",
    todayCalls: 14,
    todayBookings: 4,
    todayEarnings: 100,
    monthBookings: 22,
    monthEarnings: 550,
    conversionRate: 29,
    callTarget: 20,
    bookingTarget: 6,
    earningsTarget: 150,
};

const TEAM_MEMBERS = [
    { id: "1", name: "Sarah M.", avatar: "SM", bookings: 22, calls: 98, rate: 29, earnings: 550, isYou: true },
    { id: "2", name: "Mike R.", avatar: "MR", bookings: 28, calls: 112, rate: 25, earnings: 1120, isYou: false },
    { id: "3", name: "Jessica L.", avatar: "JL", bookings: 18, calls: 85, rate: 21, earnings: 450, isYou: false },
    { id: "4", name: "David K.", avatar: "DK", bookings: 34, calls: 130, rate: 26, earnings: 1360, isYou: false },
    { id: "5", name: "Amy T.", avatar: "AT", bookings: 12, calls: 72, rate: 17, earnings: 300, isYou: false },
].sort((a, b) => b.bookings - a.bookings);

const CALL_QUEUE = [
    { id: "q1", name: "John Peterson", phone: "+1 604-555-0123", vehicle: "2021 BMW X5", issue: "Brake inspection — quote sent 2 days ago", heat: "hot" as const, lastContact: "2 days ago", value: 850, lastVisit: "Jan 3, 2026", totalSpend: 4200, visits: 8, openDeal: { service: "Brake Inspection & Pad Replacement", value: 850, stage: "Quote Sent" }, notes: "Price-sensitive, prefers morning appointments. Loyal customer since 2022." },
    { id: "q2", name: "Karen Williams", phone: "+1 604-555-0456", vehicle: "2019 Honda CR-V", issue: "Oil change + tire rotation — missed call yesterday", heat: "hot" as const, lastContact: "1 day ago", value: 280, lastVisit: "Dec 15, 2025", totalSpend: 1800, visits: 5, openDeal: { service: "Oil Change + Tire Rotation", value: 280, stage: "New Inquiry" }, notes: "Missed call yesterday at 2:15 PM. Usually books same-day." },
    { id: "q3", name: "Steve Brooks", phone: "+1 604-555-0789", vehicle: "2022 Toyota Camry", issue: "AC not blowing cold — new inquiry", heat: "warm" as const, lastContact: "3 hours ago", value: 0, lastVisit: undefined, totalSpend: 0, visits: 0, notes: "First-time caller. Mentioned they found us on Google." },
    { id: "q4", name: "Lisa Chen", phone: "+1 604-555-0321", vehicle: "2020 Mercedes C300", issue: "Transmission service — follow-up needed", heat: "warm" as const, lastContact: "4 days ago", value: 1200, lastVisit: "Nov 20, 2025", totalSpend: 6500, visits: 12, openDeal: { service: "Transmission Fluid Service", value: 1200, stage: "Follow-Up" }, notes: "VIP customer. High lifetime value. Husband also brings his car." },
    { id: "q5", name: "Robert Jung", phone: "+1 604-555-0654", vehicle: "2018 Ford F-150", issue: "Engine light — hasn't responded to SMS", heat: "cold" as const, lastContact: "1 week ago", value: 0, lastVisit: "Oct 5, 2025", totalSpend: 900, visits: 3, notes: "Sent SMS last week, no reply. Try calling during lunch hours." },
];

// ============= COMPONENTS =============

function CircularProgress({ value, max, label, size = 80 }: { value: number; max: number; label: string; size?: number }) {
    const pct = Math.min((value / max) * 100, 100);
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (pct / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="4" />
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke="currentColor" strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="text-slate-900 transition-all duration-700"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-slate-900">{value}</span>
                </div>
            </div>
            <div className="text-center">
                <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide">{label}</p>
                <p className="text-[10px] text-slate-400">Target: {max}</p>
            </div>
        </div>
    );
}

// ============= MAIN COMPONENT =============
export function DashboardClient({ data }: { data: DashboardData }) {
    const { performance, chartData } = data;
    const { initiateCall } = useCall();
    const hasPerformanceData = chartData.some(d => d.calls > 0 || d.sms > 0);

    const currentTier = getTier(CURRENT_USER.monthBookings);
    const nextTier = getNextTier(CURRENT_USER.monthBookings);
    const tierProgress = nextTier
        ? ((CURRENT_USER.monthBookings - currentTier.min) / (nextTier.min - currentTier.min)) * 100
        : 100;
    const bookingsToNext = nextTier ? nextTier.min - CURRENT_USER.monthBookings : 0;

    const heatConfig = {
        hot: { label: "Hot", bg: "bg-slate-900", text: "text-white" },
        warm: { label: "Warm", bg: "bg-slate-200", text: "text-slate-700" },
        cold: { label: "Cold", bg: "bg-slate-100", text: "text-slate-500" },
    };

    return (
        <div className="h-full overflow-y-auto bg-slate-50/50 p-6 space-y-6">

            {/* ============= 1. PERSONAL STATS HERO ============= */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {CURRENT_USER.name}
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Here is your daily performance snapshot.</p>
                    </div>
                    <Badge variant="outline" className="text-sm px-3 py-1 border-slate-200 bg-slate-50 text-slate-900 gap-2 font-medium rounded-full">
                        {currentTier.icon} {currentTier.name} Tier
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="group p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Calls Today</span>
                            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-900">
                                <Phone className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900">{CURRENT_USER.todayCalls}</span>
                            <span className="text-xs text-slate-400">/ {CURRENT_USER.callTarget}</span>
                        </div>
                    </div>

                    <div className="group p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Booked Today</span>
                            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-900">
                                <CalendarCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900">{CURRENT_USER.todayBookings}</span>
                            <span className="text-xs text-slate-400">/ {CURRENT_USER.bookingTarget}</span>
                        </div>
                    </div>

                    <div className="group p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Earned Today</span>
                            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-900">
                                <DollarSign className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900">${CURRENT_USER.todayEarnings}</span>
                            <span className="text-xs text-slate-400">/ ${CURRENT_USER.earningsTarget}</span>
                        </div>
                    </div>

                    <div className="group p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversion</span>
                            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-900">
                                <Target className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900">{CURRENT_USER.conversionRate}%</span>
                            <span className="text-xs text-slate-400">rate</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ============= DAILY TARGETS ============= */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                            <Target className="h-4 w-4" /> Daily Progress
                        </h3>
                    </div>
                    <div className="flex items-center justify-around">
                        <CircularProgress value={CURRENT_USER.todayCalls} max={CURRENT_USER.callTarget} label="Calls" />
                        <CircularProgress value={CURRENT_USER.todayBookings} max={CURRENT_USER.bookingTarget} label="Booked" />
                    </div>
                </div>

                {/* ============= COMMISSION TRACKER ============= */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                            <Trophy className="h-4 w-4" /> Commission Tier
                        </h3>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-slate-900 block">${CURRENT_USER.monthEarnings.toLocaleString()}</span>
                            <span className="text-xs text-slate-500">earned this month</span>
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <span className="text-3xl font-bold text-slate-900">{CURRENT_USER.monthBookings}</span>
                                <span className="text-sm text-slate-500 ml-2">bookings</span>
                            </div>
                            {nextTier && (
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                    {bookingsToNext} to {nextTier.name}
                                </span>
                            )}
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${tierProgress}%` }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {TIERS.map((tier) => {
                            const isCurrent = tier.name === currentTier.name;
                            return (
                                <div
                                    key={tier.name}
                                    className={cn(
                                        "text-center p-2 rounded-lg border transition-all",
                                        isCurrent ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-100 text-slate-400"
                                    )}
                                >
                                    <div className="text-lg mb-1">{tier.icon}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-wide">{tier.name}</div>
                                    <div className="text-[10px] opacity-80">${tier.bonus}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ============= SMART QUEUE ============= */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Priority Queue
                    </h3>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-slate-900">
                        View All <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                </div>
                <div className="divide-y divide-slate-100">
                    {CALL_QUEUE.map(lead => {
                        const heat = heatConfig[lead.heat];
                        return (
                            <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                        "bg-slate-100 text-slate-500"
                                    )}>
                                        {lead.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-semibold text-slate-900">{lead.name}</span>
                                            <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 rounded-md font-medium border-0", heat.bg, heat.text)}>
                                                {heat.label}
                                            </Badge>
                                            {lead.value > 0 && (
                                                <span className="text-xs font-mono font-medium text-slate-500">${lead.value}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span className="truncate max-w-[200px]">{lead.vehicle} — {lead.issue}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {lead.lastContact}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-200 hover:bg-white text-slate-500">
                                        <MessageSquare className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-8 bg-slate-900 hover:bg-slate-800 text-white text-xs px-3 shadow-sm"
                                        onClick={() => initiateCall({
                                            name: lead.name,
                                            phone: lead.phone,
                                            vehicle: lead.vehicle,
                                            lastVisit: lead.lastVisit,
                                            totalSpend: lead.totalSpend,
                                            visits: lead.visits,
                                            openDeal: lead.openDeal,
                                            notes: lead.notes,
                                        })}
                                    >
                                        <PhoneOutgoing className="h-3 w-3 mr-1.5" /> Call
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ============= LEADERBOARD ============= */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <Crown className="h-4 w-4" /> Team Leaderboard
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 font-semibold w-16">#</th>
                                <th className="px-6 py-3 font-semibold">Agent</th>
                                <th className="px-6 py-3 font-semibold text-center">Bookings</th>
                                <th className="px-6 py-3 font-semibold text-center">Calls</th>
                                <th className="px-6 py-3 font-semibold text-center">Conv. Rate</th>
                                <th className="px-6 py-3 font-semibold text-center">Tier</th>
                                <th className="px-6 py-3 font-semibold text-right">Earnings</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {TEAM_MEMBERS.map((member, idx) => {
                                const rank = idx + 1;
                                const memberTier = getTier(member.bookings);
                                const isTop3 = rank <= 3;

                                return (
                                    <tr key={member.id} className={cn("hover:bg-slate-50/50 transition-colors", member.isYou && "bg-slate-50")}>
                                        <td className="px-6 py-4">
                                            <div className={cn(
                                                "h-6 w-6 rounded flex items-center justify-center text-xs font-bold",
                                                rank === 1 ? "bg-yellow-100 text-yellow-700" :
                                                    rank === 2 ? "bg-slate-200 text-slate-600" :
                                                        rank === 3 ? "bg-amber-100 text-amber-700" : "text-slate-400"
                                            )}>
                                                {rank}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                                                    member.isYou ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                                                )}>
                                                    {member.avatar}
                                                </div>
                                                <div>
                                                    <span className={cn("block font-medium text-slate-900", member.isYou && "font-bold")}>{member.name}</span>
                                                    {member.isYou && <span className="text-[10px] text-slate-500">That&apos;s you!</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold text-slate-900">{member.bookings}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-500">
                                            {member.calls}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "font-medium",
                                                member.rate >= 25 ? "text-slate-900" : "text-slate-500"
                                            )}>{member.rate}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant="outline" className="font-normal text-xs border-slate-200 text-slate-600 bg-white">
                                                {memberTier.icon} {memberTier.name}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono font-bold text-slate-900">${member.earnings.toLocaleString()}</span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ============= ACTIVITY CHART ============= */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Activity Trend
                        </h3>
                    </div>
                </div>
                <div className="h-[200px] w-full">
                    {!hasPerformanceData ? (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            <div className="text-center">
                                <LineChart className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No activity recorded yet</p>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        color: '#0f172a'
                                    }}
                                />
                                <Area type="monotone" dataKey="calls" name="Calls" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
