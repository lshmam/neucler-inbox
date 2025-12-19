"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
    Plus, Mic, PhoneIncoming, PhoneOutgoing, Clock, BarChart3,
    PhoneForwarded, Hash, DollarSign, Loader2, AlertCircle, Play,
    Brain, Settings2, Bot, MessageSquare, Info, ShieldCheck, Phone, Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { LANGUAGE_OPTIONS } from "@/app/(dashboard)/ai-agent/language-data";
// ArticlesManager moved to dedicated /knowledge-base page
import { toast } from "sonner";

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
    voice_id?: string;
    // Gatekeeper settings
    spam_filter_enabled?: boolean;
    call_handling_mode?: 'ai_handles_all' | 'forward_verified';
    forwarding_number?: string;
    log_spam_calls?: boolean;
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

interface KnowledgeBaseData {
    articles: any[];
    services_summary: string;
    business_hours: string;
    ai_tone: string;
    ai_name: string;
}

interface ClientViewProps {
    initialAgents: Agent[];
    initialCallLogs: CallLog[];
    merchantId: string;
    knowledgeBase: KnowledgeBaseData;
    spamCallsCount: number;
    bookingLinksCount: number;
}

export function AIAgentClientView({ initialAgents, initialCallLogs, merchantId, knowledgeBase, spamCallsCount, bookingLinksCount }: ClientViewProps) {
    const [agents, setAgents] = useState<Agent[]>(initialAgents);
    const [callLogs, setCallLogs] = useState<CallLog[]>(initialCallLogs);

    // Capabilities state
    const [smsAutoReply, setSmsAutoReply] = useState(true);
    const [smsDelay, setSmsDelay] = useState("30");
    const activeAgent = agents.find(a => a.provisioning_status === 'active');

    // Gatekeeper settings state
    const [spamFilterEnabled, setSpamFilterEnabled] = useState(activeAgent?.spam_filter_enabled ?? true);
    const [callHandlingMode, setCallHandlingMode] = useState<'ai_handles_all' | 'forward_verified'>(activeAgent?.call_handling_mode ?? 'ai_handles_all');
    const [forwardingNumber, setForwardingNumber] = useState(activeAgent?.forwarding_number ?? "");
    const [logSpamCalls, setLogSpamCalls] = useState(activeAgent?.log_spam_calls ?? true);
    const [savingGatekeeper, setSavingGatekeeper] = useState(false);

    // Sync gatekeeper state when activeAgent changes
    useEffect(() => {
        if (activeAgent) {
            setSpamFilterEnabled(activeAgent.spam_filter_enabled ?? true);
            setCallHandlingMode(activeAgent.call_handling_mode ?? 'ai_handles_all');
            setForwardingNumber(activeAgent.forwarding_number ?? "");
            setLogSpamCalls(activeAgent.log_spam_calls ?? true);
        }
    }, [activeAgent]);

    // Save gatekeeper settings and sync prompt to Retell
    const saveGatekeeperSettings = async () => {
        if (!activeAgent) return;
        setSavingGatekeeper(true);
        try {
            // Call the new API that generates prompt and syncs to Retell
            const res = await fetch('/api/agent/update-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: activeAgent.id,
                    mode: callHandlingMode,
                    forwardingNumber: callHandlingMode === 'forward_verified' ? forwardingNumber : null,
                    spamFilterEnabled,
                    logSpamCalls
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Also update log_spam_calls separately (not in prompt API)
            await supabase
                .from('ai_agents')
                .update({ log_spam_calls: logSpamCalls })
                .eq('id', activeAgent.id);

            toast.success("Settings saved & AI prompt updated!");
        } catch (err: any) {
            toast.error(err.message || "Failed to save settings");
            console.error(err);
        } finally {
            setSavingGatekeeper(false);
        }
    };

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
        const calculatedCost = totalMinutes * 0.50;

        return {
            activeAgents: activeAgentsCount,
            inboundCalls,
            outboundCalls,
            totalMinutes: Math.round(totalMinutes),
            totalCost: calculatedCost.toFixed(2)
        };
    }, [agents, callLogs]);

    const getLanguageFlag = (code?: string) => {
        const lang = LANGUAGE_OPTIONS.find(l => l.value === code);
        return lang ? lang.flag : <span className="text-xs">🌐</span>;
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#906CDD] to-blue-500 flex items-center justify-center">
                        <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">AI Agent</h2>
                        <p className="text-muted-foreground">Your digital employee — Voice, SMS, and Knowledge combined.</p>
                    </div>
                </div>
                {!activeAgent && (
                    <Button asChild className="bg-[#906CDD] hover:bg-[#7a5bb5]">
                        <Link href="/ai-agent?action=new">
                            <Plus className="mr-2 h-4 w-4" /> Create Agent
                        </Link>
                    </Button>
                )}
            </div>

            {/* TOP STAT CARDS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Agent Status</CardTitle>
                        <Mic className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {activeAgent ? (
                                <span className="text-green-600">Online</span>
                            ) : (
                                <span className="text-slate-400">Offline</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {activeAgent?.phone_number || "No phone assigned"}
                        </p>
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
                        <CardTitle className="text-sm font-medium">Spam Filtered</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{spamCallsCount}</div>
                        <p className="text-xs text-muted-foreground">Unwanted calls blocked</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Booking Links</CardTitle>
                        <Link2 className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bookingLinksCount}</div>
                        <p className="text-xs text-muted-foreground">Smart links generated</p>
                    </CardContent>
                </Card>
            </div>

            {/* MAIN CONTENT TABS */}
            <Tabs defaultValue="history" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
                    <TabsTrigger value="history" className="gap-2">
                        <Clock className="h-4 w-4" /> History
                    </TabsTrigger>
                    <TabsTrigger value="capabilities" className="gap-2">
                        <Settings2 className="h-4 w-4" /> Capabilities
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: CALL HISTORY */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Call Log</CardTitle>
                            <CardDescription>Real-time history of all AI interactions.</CardDescription>
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
                                                No calls yet. Your AI will log interactions here.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        callLogs.map((log) => {
                                            let statusColor = "bg-slate-100 text-slate-600";
                                            if (log.status === 'completed') statusColor = "bg-green-100 text-green-700";
                                            else if (log.status?.includes('fail') || log.status === 'error') statusColor = "bg-red-100 text-red-700";
                                            else if (log.status === 'user_hangup' || log.status === 'agent_hangup') statusColor = "bg-slate-900 text-white";

                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell>
                                                        <Badge className={`capitalize shadow-none ${statusColor}`} variant="secondary">
                                                            {log.status?.replace(/_/g, ' ') || 'Unknown'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 text-xs uppercase font-medium text-muted-foreground">
                                                            {log.direction === 'inbound' ? <PhoneIncoming className="h-3 w-3" /> : <PhoneOutgoing className="h-3 w-3" />}
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
                                                                        <p className="text-sm text-slate-700 leading-relaxed">{log.summary}</p>
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

                {/* Knowledge Base now has its own page at /knowledge-base */}

                {/* TAB 3: CAPABILITIES */}
                <TabsContent value="capabilities" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">

                        {/* VOICE SECTION */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Mic className="h-5 w-5 text-orange-500" />
                                    <CardTitle>Voice Settings</CardTitle>
                                </div>
                                <CardDescription>Configure your AI phone receptionist</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {activeAgent ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Agent Name</Label>
                                            <Input value={activeAgent.name} disabled className="bg-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Phone Number</Label>
                                            <Input value={activeAgent.phone_number || "Not assigned"} disabled className="bg-muted font-mono" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Greeting Message</Label>
                                            <Textarea value={activeAgent.opening_greeting} disabled className="bg-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Language</Label>
                                            <div className="flex items-center gap-2">
                                                {getLanguageFlag(activeAgent.language)}
                                                <span className="text-sm">{activeAgent.language || "English"}</span>
                                            </div>
                                        </div>
                                        <Separator />
                                        <Button variant="outline" asChild className="w-full">
                                            <Link href={`/ai-agent?id=${activeAgent.id}`}>
                                                <Settings2 className="mr-2 h-4 w-4" /> Edit Voice Settings
                                            </Link>
                                        </Button>
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <Mic className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                        <p className="text-muted-foreground mb-4">No AI Agent configured yet</p>
                                        <Button asChild>
                                            <Link href="/ai-agent?action=new">
                                                <Plus className="mr-2 h-4 w-4" /> Create Agent
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* SMS SECTION */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-green-500" />
                                    <CardTitle>SMS Settings</CardTitle>
                                </div>
                                <CardDescription>Configure AI auto-reply behavior</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Auto-Reply via SMS</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Let AI respond to incoming texts automatically
                                        </p>
                                    </div>
                                    <Switch
                                        checked={smsAutoReply}
                                        onCheckedChange={setSmsAutoReply}
                                    />
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label>Reply Delay (seconds)</Label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Wait before responding to seem more natural
                                    </p>
                                    <Select value={smsDelay} onValueChange={setSmsDelay}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">Instant</SelectItem>
                                            <SelectItem value="15">15 seconds</SelectItem>
                                            <SelectItem value="30">30 seconds</SelectItem>
                                            <SelectItem value="60">1 minute</SelectItem>
                                            <SelectItem value="120">2 minutes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Separator />

                                <div className="bg-muted/50 p-3 rounded-lg">
                                    <p className="text-xs text-muted-foreground flex items-start gap-2">
                                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                        SMS auto-replies use the same Knowledge Base as Voice.
                                        <a href="/knowledge-base" className="text-blue-600 hover:underline">Manage your Knowledge Base →</a>
                                    </p>
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={() => toast.success("SMS settings saved!")}
                                >
                                    Save SMS Settings
                                </Button>
                            </CardContent>
                        </Card>

                        {/* GATEKEEPER SECTION */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                                    <CardTitle>Call Screening & Forwarding</CardTitle>
                                </div>
                                <CardDescription>Configure how your AI handles spam and routes verified leads</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Toggle: AI Spam Filter */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="font-medium">Enable AI Spam Filter</Label>
                                        <p className="text-xs text-muted-foreground">
                                            The AI will hang up on telemarketers and robocalls automatically.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={spamFilterEnabled}
                                        onCheckedChange={setSpamFilterEnabled}
                                    />
                                </div>

                                <Separator />

                                {/* Radio Group: Call Handling */}
                                <div className="space-y-3">
                                    <Label className="font-medium">Call Handling</Label>
                                    <RadioGroup
                                        value={callHandlingMode}
                                        onValueChange={(v) => setCallHandlingMode(v as 'ai_handles_all' | 'forward_verified')}
                                        className="space-y-3"
                                    >
                                        <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                                            <RadioGroupItem value="ai_handles_all" id="ai_handles_all" className="mt-0.5" />
                                            <div className="space-y-1">
                                                <Label htmlFor="ai_handles_all" className="font-medium cursor-pointer">
                                                    AI Handles Everything
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    The AI books the appointment; the owner is not disturbed.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                                            <RadioGroupItem value="forward_verified" id="forward_verified" className="mt-0.5" />
                                            <div className="space-y-1 flex-1">
                                                <Label htmlFor="forward_verified" className="font-medium cursor-pointer">
                                                    Forward Verified Leads
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    The AI screens the call. If it's a customer, it forwards the call to the owner.
                                                </p>
                                            </div>
                                        </div>
                                    </RadioGroup>

                                    {/* Conditional: Forwarding Number */}
                                    {callHandlingMode === 'forward_verified' && (
                                        <div className="ml-6 pl-3 border-l-2 border-blue-200 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                            <Label htmlFor="forwarding-number" className="text-sm">
                                                <Phone className="h-3 w-3 inline mr-1" />
                                                Forwarding Number
                                            </Label>
                                            <Input
                                                id="forwarding-number"
                                                type="tel"
                                                placeholder="+1 (555) 123-4567"
                                                value={forwardingNumber}
                                                onChange={(e) => setForwardingNumber(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Verified leads will be transferred to this number.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Toggle: Log Spam Calls */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="font-medium">Log Spam Calls</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Keep a record of blocked calls in the logs (marked as SPAM).
                                        </p>
                                    </div>
                                    <Switch
                                        checked={logSpamCalls}
                                        onCheckedChange={setLogSpamCalls}
                                    />
                                </div>

                                <Separator />

                                <Button
                                    className="w-full"
                                    onClick={saveGatekeeperSettings}
                                    disabled={savingGatekeeper}
                                >
                                    {savingGatekeeper ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                                    ) : (
                                        "Save Gatekeeper Settings"
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}