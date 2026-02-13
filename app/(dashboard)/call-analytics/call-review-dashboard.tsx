"use client";

import { useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Area,
    AreaChart
} from "recharts";
import {
    CheckCircle2,
    XCircle,
    Phone,
    Clock,
    Calendar,
    User,
    TrendingUp,
    TrendingDown,
    Shield,
    Heart,
    Target,
    ChevronDown,
    ChevronUp,
    PhoneIncoming,
    PhoneOutgoing
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    useMockCallData,
    MOCK_getEmotionColor,
    MOCK_formatDuration,
    MOCK_TranscriptItem,
    MOCK_ScorecardItem,
} from "./useMockCallData";

// ============= SCORE BADGE COMPONENT =============
export function ScoreBadge({ score }: { score: number }) {
    const getScoreColor = (s: number) => {
        if (s >= 80) return "bg-emerald-500";
        if (s >= 60) return "bg-amber-500";
        return "bg-red-500";
    };

    const getScoreLabel = (s: number) => {
        if (s >= 90) return "Excellent";
        if (s >= 80) return "Great";
        if (s >= 70) return "Good";
        if (s >= 60) return "Fair";
        return "Needs Work";
    };

    return (
        <div className="flex flex-col items-center">
            <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg",
                getScoreColor(score)
            )}>
                {score}
            </div>
            <span className="mt-2 text-sm font-medium text-slate-600">
                {getScoreLabel(score)}
            </span>
        </div>
    );
}

// ============= VIBE CHECK HEADER =============
export function VibeCheckHeader({
    score,
    metadata,
    sentimentData
}: {
    score: number;
    metadata: ReturnType<typeof useMockCallData>["MOCK_CallMetadata"];
    sentimentData: ReturnType<typeof useMockCallData>["MOCK_SentimentTimeline"];
}) {
    const formattedDate = new Date(metadata.callDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    return (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-blue-50">
            <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Score Section */}
                    <div className="flex items-center gap-6 shrink-0">
                        <ScoreBadge score={score} />
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-slate-900">Call Performance</h2>
                            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                                <div className="flex items-center gap-1.5">
                                    <User className="h-4 w-4 text-slate-400" />
                                    <span>{metadata.agentName}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    <span>{MOCK_formatDuration(metadata.callDuration)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span>{formattedDate}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {metadata.callDirection === 'inbound' ? (
                                        <PhoneIncoming className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <PhoneOutgoing className="h-4 w-4 text-green-500" />
                                    )}
                                    <span className="capitalize">{metadata.callDirection}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-600">{metadata.customerName}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500">{metadata.customerPhone}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sentiment Wave Graph */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-700 mb-2">Sentiment Wave</h3>
                        <div className="h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sentimentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="frustrationGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="calmnessGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(v) => `${Math.floor(v / 60)}:${(v % 60).toString().padStart(2, '0')}`}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                        width={30}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            fontSize: '12px'
                                        }}
                                        labelFormatter={(v) => `Time: ${Math.floor(Number(v) / 60)}:${(Number(v) % 60).toString().padStart(2, '0')}`}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="customerFrustration"
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        fill="url(#frustrationGradient)"
                                        name="Customer Frustration"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="agentCalmness"
                                        stroke="#22c55e"
                                        strokeWidth={2}
                                        fill="url(#calmnessGradient)"
                                        name="Agent Calmness"
                                    />
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: '11px' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============= EMOTION PILL COMPONENT =============
export function EmotionPill({ emotion, score }: { emotion: string; score: number }) {
    const color = MOCK_getEmotionColor(emotion, score);

    const colorClasses = {
        red: "bg-red-100 text-red-700 border-red-200",
        green: "bg-emerald-100 text-emerald-700 border-emerald-200",
        gray: "bg-slate-100 text-slate-600 border-slate-200"
    };

    return (
        <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
            colorClasses[color]
        )}>
            {emotion} {(score * 100).toFixed(0)}%
        </span>
    );
}

// ============= TRANSCRIPT BUBBLE =============
export function TranscriptBubble({ item }: { item: MOCK_TranscriptItem }) {
    const isAgent = item.speaker === 'Agent';

    return (
        <div className={cn(
            "flex gap-3 mb-4",
            isAgent ? "flex-row" : "flex-row-reverse"
        )}>
            {/* Avatar */}
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold",
                isAgent ? "bg-blue-500" : "bg-slate-500"
            )}>
                {isAgent ? 'A' : 'C'}
            </div>

            {/* Bubble */}
            <div className={cn(
                "flex-1 max-w-[80%]",
                isAgent ? "mr-auto" : "ml-auto"
            )}>
                <div className={cn(
                    "rounded-2xl px-4 py-3 shadow-sm",
                    isAgent
                        ? "bg-blue-50 border border-blue-100 rounded-tl-none"
                        : "bg-slate-50 border border-slate-200 rounded-tr-none"
                )}>
                    <p className="text-sm text-slate-800 leading-relaxed">{item.text}</p>
                </div>
                <div className={cn(
                    "flex items-center gap-2 mt-1.5",
                    isAgent ? "justify-start" : "justify-end"
                )}>
                    <EmotionPill emotion={item.emotion} score={item.score} />
                    <span className="text-xs text-slate-400">
                        {MOCK_formatDuration(item.start)}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ============= EMOTIONAL TRANSCRIPT =============
export function EmotionalTranscript({ transcript }: { transcript: MOCK_TranscriptItem[] }) {
    return (
        <Card className="flex-1 border-0 shadow-sm">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-500" />
                    Call Transcript
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[500px] p-4">
                    {transcript.map((item, index) => (
                        <TranscriptBubble key={index} item={item} />
                    ))}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

// ============= SCORECARD CATEGORY SECTION =============
export function ScorecardCategory({
    category,
    items,
    icon: Icon
}: {
    category: string;
    items: MOCK_ScorecardItem[];
    icon: React.ElementType;
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const passCount = items.filter(i => i.status === 'pass').length;
    const totalCount = items.length;
    const allPassed = passCount === totalCount;

    return (
        <div className="border-b border-slate-100 last:border-0">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        allPassed ? "bg-emerald-100" : "bg-amber-100"
                    )}>
                        <Icon className={cn(
                            "h-4 w-4",
                            allPassed ? "text-emerald-600" : "text-amber-600"
                        )} />
                    </div>
                    <span className="font-medium text-slate-800">{category}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={allPassed ? "default" : "secondary"} className={cn(
                        "text-xs",
                        allPassed ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-600"
                    )}>
                        {passCount}/{totalCount}
                    </Badge>
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className="px-4 pb-3 space-y-1">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50"
                        >
                            {item.status === 'pass' ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                            )}
                            <span className={cn(
                                "text-sm",
                                item.status === 'pass' ? "text-slate-700" : "text-red-700 font-medium"
                            )}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============= SMART SCORECARD =============
export function SmartScorecard({ scorecard }: { scorecard: MOCK_ScorecardItem[] }) {
    const categories = {
        Compliance: { icon: Shield, items: scorecard.filter(i => i.category === 'Compliance') },
        Empathy: { icon: Heart, items: scorecard.filter(i => i.category === 'Empathy') },
        Closing: { icon: Target, items: scorecard.filter(i => i.category === 'Closing') }
    };

    const totalPassed = scorecard.filter(i => i.status === 'pass').length;
    const totalItems = scorecard.length;

    return (
        <Card className="w-full lg:w-80 shrink-0 border-0 shadow-sm">
            <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Smart Scorecard</CardTitle>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        {totalPassed}/{totalItems} Passed
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScorecardCategory
                    category="Compliance"
                    items={categories.Compliance.items}
                    icon={categories.Compliance.icon}
                />
                <ScorecardCategory
                    category="Empathy"
                    items={categories.Empathy.items}
                    icon={categories.Empathy.icon}
                />
                <ScorecardCategory
                    category="Closing"
                    items={categories.Closing.items}
                    icon={categories.Closing.icon}
                />
            </CardContent>
        </Card>
    );
}

// ============= MAIN DASHBOARD COMPONENT =============
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CallReviewDashboard({ callId }: { callId?: string }) {
    const {
        MOCK_OverallScore,
        MOCK_CallMetadata,
        MOCK_Transcript,
        MOCK_Scorecard,
        MOCK_SentimentTimeline
    } = useMockCallData();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-slate-900 px-0 hover:bg-transparent">
                    <Link href="/call-analytics">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Overview
                    </Link>
                </Button>
            </div>

            {/* VIBE CHECK HEADER */}
            <VibeCheckHeader
                score={MOCK_OverallScore}
                metadata={MOCK_CallMetadata}
                sentimentData={MOCK_SentimentTimeline}
            />

            {/* MAIN CONTENT: Scorecard + Transcript */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* LEFT: Smart Scorecard */}
                <SmartScorecard scorecard={MOCK_Scorecard} />

                {/* RIGHT: Emotional Transcript */}
                <EmotionalTranscript transcript={MOCK_Transcript} />
            </div>
        </div>
    );
}
