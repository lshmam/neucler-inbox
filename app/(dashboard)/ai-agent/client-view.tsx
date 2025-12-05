"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
    Plus, Mic, PhoneIncoming, PhoneOutgoing, Clock, BarChart3,
    PhoneForwarded, Hash, DollarSign, Loader2, AlertCircle, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LANGUAGE_OPTIONS } from "@/app/(dashboard)/ai-agent/language-data";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- TYPES ---
interface Agent {
    id: string;
    name: string;
    phone_mode: 'forwarding' | 'dedicated' | 'generated';
    opening_greeting: string;
    phone_number: string | null;
    provisioning_status: string;
    desired_area_code?: string;
    language?: string;
    pickup_behavior?: string;
}

interface CallLog {
    id: string;
    created_at: string;
    direction: 'inbound' | 'outbound';
    customer_phone: string;
    duration_seconds: number;
    status: string;
    summary: string;
    transcript: any;
    user_sentiment?: string;
    cost_cents?: number;
}

interface ClientViewProps {
    initialAgents: Agent[];
    initialCallLogs: CallLog[];
    merchantId: string;
}

export function AIAgentClientView({ initialAgents, initialCallLogs, merchantId }: ClientViewProps) {
    const [agents, setAgents] = useState<Agent[]>(initialAgents);
    const [callLogs, setCallLogs] = useState<CallLog[]>(initialCallLogs);

    // --- REALTIME LISTENERS ---
    useEffect(() => {
        const channel = supabase
            .channel('dashboard-updates')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'call_logs', filter: `merchant_id=eq.${merchantId}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') setCallLogs(prev => [payload.new as CallLog, ...prev]);
                    if (payload.eventType === 'UPDATE') setCallLogs(prev => prev.map(c => c.id === payload.new.id ? payload.new as CallLog : c));
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'ai_agents', filter: `merchant_id=eq.${merchantId}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') setAgents(prev => [...prev, payload.new as Agent]);
                    if (payload.eventType === 'UPDATE') setAgents(prev => prev.map(a => a.id === payload.new.id ? payload.new as Agent : a));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [merchantId]);

    // --- STATS CALCULATION ---
    const stats = useMemo(() => {
        const activeAgentsCount = agents.filter(a => a.provisioning_status === 'active').length;
        const inboundCalls = callLogs.filter(c => c.direction === 'inbound').length;
        const outboundCalls = callLogs.filter(c => c.direction === 'outbound').length;

        const totalSeconds = callLogs.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
        const totalMinutes = totalSeconds / 60;

        // Cost: $0.50 per minute
        const calculatedCost = totalMinutes * 0.50;

        return {
            activeAgents: activeAgentsCount,
            inboundCalls,
            outboundCalls,
            totalMinutes: Math.round(totalMinutes),
            totalCost: calculatedCost.toFixed(2)
        };
    }, [agents, callLogs]);

    // Helper to get Flag Icon
    const getLanguageFlag = (code?: string) => {
        const lang = LANGUAGE_OPTIONS.find(l => l.value === code);
        return lang ? lang.flag : <span className="text-xs">🌐</span>;
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">AI Voice Agents</h2>
                    <p className="text-muted-foreground">Monitor performance and manage your receptionists.</p>
                </div>
            </div>

            {/* TOP STAT CARDS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Live Agents</CardTitle>
                        <Mic className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeAgents}</div>
                        <p className="text-xs text-muted-foreground">Active & taking calls</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inbound Handled</CardTitle>
                        <PhoneIncoming className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inboundCalls}</div>
                        <p className="text-xs text-muted-foreground">Customer calls answered</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outbound Made</CardTitle>
                        <PhoneOutgoing className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.outboundCalls}</div>
                        <p className="text-xs text-muted-foreground">Proactive outreach</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.totalCost}</div>
                        <p className="text-xs text-muted-foreground">Cumulative usage</p>
                    </CardContent>
                </Card>
            </div>

            {/* MAIN CONTENT TABS - Default is now 'history' */}
            <Tabs defaultValue="history" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="history">Call History</TabsTrigger>
                    <TabsTrigger value="agents">Manage Agents</TabsTrigger>
                </TabsList>

                {/* 1. CALL HISTORY TAB */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Call Log</CardTitle>
                            <CardDescription>Real-time history of all interactions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Direction</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Summary</TableHead>
                                        <TableHead className="text-right">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {callLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                                No calls yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        callLogs.map((log) => {
                                            // --- COLOR LOGIC ---
                                            let statusColor = "bg-slate-100 text-slate-600"; // Default

                                            // Green for Success
                                            if (log.status === 'completed') {
                                                statusColor = "bg-green-100 text-green-700 hover:bg-green-100";
                                            }
                                            // Red for Failure
                                            else if (log.status?.includes('fail') || log.status === 'error') {
                                                statusColor = "bg-red-100 text-red-700 hover:bg-red-100";
                                            }
                                            // Black for Hangups
                                            else if (log.status === 'user_hangup' || log.status === 'agent_hangup') {
                                                statusColor = "bg-slate-900 text-white hover:bg-slate-800 border-none";
                                            }

                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell>
                                                        <Badge className={`capitalize shadow-none ${statusColor}`} variant="secondary">
                                                            {log.status?.replace(/_/g, ' ') || 'Unknown'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 text-xs uppercase font-medium text-muted-foreground">
                                                            {log.direction === 'inbound'
                                                                ? <PhoneIncoming className="h-3 w-3" />
                                                                : <PhoneOutgoing className="h-3 w-3" />
                                                            }
                                                            {log.direction}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{log.customer_phone}</TableCell>
                                                    <TableCell>{log.duration_seconds}s</TableCell>
                                                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                                        {log.summary || "No summary available."}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="sm">View</Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
                                                                <DialogHeader>
                                                                    <DialogTitle>Call Details</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="flex-1 overflow-auto space-y-4 pr-2">
                                                                    <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                                                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                            <BarChart3 className="h-4 w-4" /> AI Summary
                                                                        </h4>
                                                                        <p className="text-sm text-slate-700 leading-relaxed">
                                                                            {log.summary}
                                                                        </p>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <h4 className="text-sm font-semibold">Transcript</h4>
                                                                        <ScrollArea className="h-[200px] border rounded-md p-3">
                                                                            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                                                                                {JSON.stringify(log.transcript, null, 2)}
                                                                            </pre>
                                                                        </ScrollArea>
                                                                    </div>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 2. MANAGE AGENTS TAB */}
                <TabsContent value="agents" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                        {agents.map((agent) => {
                            // Logic: If status is anything other than 'active', it's pending.
                            const isPending = agent.provisioning_status !== 'active';

                            if (isPending) {
                                // --- PENDING CARD (YELLOW) ---
                                return (
                                    <Card key={agent.id} className="border-l-4 border-l-yellow-400 bg-yellow-50/20 opacity-90">
                                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-lg text-slate-700">{agent.name}</CardTitle>
                                                <Badge variant="outline" className="border-yellow-400 text-yellow-600 bg-yellow-50">Pending</Badge>
                                            </div>
                                            <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <p className="text-sm text-muted-foreground">
                                                    Configuration submitted. We are provisioning your dedicated number.
                                                </p>
                                                <div className="flex items-center justify-between text-xs font-mono bg-white/50 p-2 rounded border border-dashed border-yellow-300">
                                                    <span className="text-slate-500">Requested Area Code:</span>
                                                    <span className="font-bold text-slate-700">{agent.desired_area_code || "Any"}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            }

                            // --- ACTIVE CARD (GREEN) ---
                            return (
                                <Link key={agent.id} href={`/ai-agent?id=${agent.id}`}>
                                    <Card className="hover:border-green-500/50 hover:shadow-md transition-all cursor-pointer h-full border-l-4 border-l-green-500">
                                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-lg">{agent.name}</CardTitle>
                                                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Active</Badge>
                                            </div>

                                            {/* LANGUAGE FLAG */}
                                            <div title={agent.language || "English"}>
                                                {getLanguageFlag(agent.language)}
                                            </div>
                                        </CardHeader>

                                        <CardContent>
                                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 italic">
                                                "{agent.opening_greeting}"
                                            </p>

                                            <div className="space-y-2">
                                                {/* Phone Number Strip */}
                                                <div className="flex items-center justify-between text-xs font-mono bg-muted p-2 rounded">
                                                    <span className="flex items-center gap-1 font-semibold">
                                                        <PhoneIncoming className="h-3 w-3 text-muted-foreground" />
                                                        {agent.phone_number || "No # Assigned"}
                                                    </span>
                                                    <span className="uppercase text-muted-foreground text-[10px] tracking-wider">
                                                        {agent.phone_mode}
                                                    </span>
                                                </div>

                                                {/* PICKUP BEHAVIOR BADGE */}
                                                <div className="flex justify-end">
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground bg-slate-100 border-slate-200">
                                                        {agent.pickup_behavior === 'ring_3' ? '⏳ Rings 3x' : '⚡ Immediate Pickup'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}

                        {/* NEW AGENT BUTTON */}
                        <Link href="/ai-agent?action=new">
                            <Card className="h-full border-dashed flex flex-col items-center justify-center p-6 hover:bg-muted/50 transition-colors cursor-pointer group min-h-[220px]">
                                <div className="bg-muted group-hover:bg-background transition-colors p-4 rounded-full mb-3">
                                    <Plus className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <span className="font-medium text-muted-foreground">Request New Agent</span>
                            </Card>
                        </Link>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}