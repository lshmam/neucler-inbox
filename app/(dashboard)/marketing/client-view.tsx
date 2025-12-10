"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
    Plus, Mail, Users, CheckCircle2, Eye, MousePointer2,
    AlertCircle, Ban, Send, BarChart3, MessageSquare, Search,
    Loader2, Sparkles, RefreshCcw, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Initialize Supabase for realtime
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Types ---
interface EmailCampaign {
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

interface Message {
    id: string;
    created_at: string;
    direction: 'inbound' | 'outbound';
    content: string;
    customer_phone?: string;
    status?: string;
    customers?: {
        first_name: string;
        last_name: string;
        phone_number: string;
    } | null;
}

interface MarketingClientViewProps {
    emailCampaigns: EmailCampaign[];
    smsCampaigns: any[];
    smsMessages: Message[];
    merchantId: string;
}

const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
};

const TEMPLATES = [
    "Hi {name}, thanks for visiting! We'd love a review: bit.ly/review",
    "Hey {name}, we have a 20% off flash sale this weekend!",
    "Hi {name}, just a reminder about your appointment tomorrow."
];

export function MarketingClientView({
    emailCampaigns: initialEmailCampaigns,
    smsCampaigns: initialSmsCampaigns,
    smsMessages: initialSmsMessages,
    merchantId
}: MarketingClientViewProps) {
    const router = useRouter();

    // State
    const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>(initialEmailCampaigns);
    const [smsCampaigns, setSmsCampaigns] = useState<any[]>(initialSmsCampaigns);
    const [smsMessages, setSmsMessages] = useState<Message[]>(initialSmsMessages);

    // SMS Blast form state
    const [blastName, setBlastName] = useState("");
    const [blastAudience, setBlastAudience] = useState("all");
    const [blastMessage, setBlastMessage] = useState("");
    const [sending, setSending] = useState(false);

    // SMS Thread state
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isSendingReply, setIsSendingReply] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- Realtime for Email Campaigns ---
    useEffect(() => {
        const channel = supabase
            .channel('email-campaign-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'email_campaigns',
                filter: `merchant_id=eq.${merchantId}`
            }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setEmailCampaigns((prev) =>
                        prev.map((c) => c.id === payload.new.id ? payload.new as EmailCampaign : c)
                    );
                } else if (payload.eventType === 'INSERT') {
                    setEmailCampaigns((prev) => [payload.new as EmailCampaign, ...prev]);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [merchantId]);

    // --- Realtime for SMS Messages ---
    useEffect(() => {
        const channel = supabase
            .channel('sms-updates')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `merchant_id=eq.${merchantId}`
            }, (payload) => {
                const newMsg = payload.new as any;
                const formattedMsg: Message = {
                    id: newMsg.id,
                    created_at: newMsg.created_at,
                    direction: newMsg.direction,
                    content: newMsg.body || newMsg.message_body || "",
                    customer_phone: newMsg.customer_phone,
                    status: newMsg.status,
                    customers: null
                };
                setSmsMessages((prev) => {
                    if (prev.some(m => m.id === formattedMsg.id)) return prev;
                    return [...prev, formattedMsg];
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [merchantId]);

    // --- Email Stats ---
    const emailStats = useMemo(() => {
        const totalSent = emailCampaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
        const totalDelivered = emailCampaigns.reduce((acc, c) => acc + (c.delivered_count || 0), 0);
        const totalOpened = emailCampaigns.reduce((acc, c) => acc + (c.open_count || 0), 0);
        const totalClicked = emailCampaigns.reduce((acc, c) => acc + (c.click_count || 0), 0);

        return {
            totalSent,
            deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
            openRate: totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0,
            clickRate: totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0
        };
    }, [emailCampaigns]);

    const getRate = (num: number, total: number) => {
        if (!total || total === 0) return "0%";
        return `${Math.round((num / total) * 100)}%`;
    };

    // --- SMS Threads ---
    const threads = useMemo(() => {
        const groups: Record<string, Message[]> = {};
        smsMessages.forEach(msg => {
            const phone = msg.customers?.phone_number || msg.customer_phone;
            if (phone) {
                if (!groups[phone]) groups[phone] = [];
                groups[phone].push(msg);
            }
        });
        return groups;
    }, [smsMessages]);

    const phoneNumbers = Object.keys(threads).sort((a, b) => {
        const lastA = new Date(threads[a][threads[a].length - 1].created_at).getTime();
        const lastB = new Date(threads[b][threads[b].length - 1].created_at).getTime();
        return lastB - lastA;
    });

    useEffect(() => {
        if (!selectedPhone && phoneNumbers.length > 0) {
            setSelectedPhone(phoneNumbers[0]);
        }
    }, [phoneNumbers, selectedPhone]);

    const currentChat = selectedPhone ? threads[selectedPhone] : [];
    const sortedChat = useMemo(() => {
        return [...currentChat].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }, [currentChat]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [sortedChat.length, selectedPhone]);

    const getCustomerName = (phone: string) => {
        const msgs = threads[phone];
        if (!msgs || !msgs.length) return phone;
        const msgWithData = msgs.find(m => m.customers?.first_name);
        if (msgWithData?.customers) {
            return `${msgWithData.customers.first_name} ${msgWithData.customers.last_name}`;
        }
        return phone;
    };

    // --- Handlers ---
    const handleReply = async () => {
        if (!replyText.trim() || !selectedPhone) return;
        setIsSendingReply(true);
        const textToSend = replyText;
        setReplyText("");

        const tempId = `temp-${Date.now()}`;
        const newMessage: Message = {
            id: tempId,
            created_at: new Date().toISOString(),
            direction: 'outbound',
            content: textToSend,
            customer_phone: selectedPhone,
            customers: sortedChat[0]?.customers
        };

        setSmsMessages((prev) => [...prev, newMessage]);

        try {
            await fetch("/api/sms/reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: selectedPhone, message: textToSend })
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to send message");
        } finally {
            setIsSendingReply(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleReply();
        }
    };

    const handleSendBlast = async () => {
        if (!blastName || !blastMessage) {
            toast.warning("Please enter a campaign name and message.");
            return;
        }
        setSending(true);
        const loadingToast = toast.loading("Launching campaign...");

        try {
            const res = await fetch("/api/sms/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: blastName, audience: blastAudience, message: blastMessage })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send");

            const count = data.campaign?.recipient_count || data.count || "multiple";
            toast.dismiss(loadingToast);
            toast.success(`Campaign Launched! Sent to ${count} customers.`);

            setBlastName("");
            setBlastMessage("");
            if (data.campaign) {
                setSmsCampaigns(prev => [data.campaign, ...prev]);
            }
        } catch (e: any) {
            toast.dismiss(loadingToast);
            toast.error(e.message || "Something went wrong");
        } finally {
            setSending(false);
        }
    };

    // SMS Stats
    const totalSmsSent = smsCampaigns.reduce((acc, curr) => acc + (curr.recipient_count || 0), 0) + smsMessages.filter(m => m.direction === 'outbound').length;
    const totalSmsReceived = smsMessages.filter(m => m.direction === 'inbound').length;

    return (
        <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
                {/* HEADER - Compact */}
                <div className="flex items-center gap-3">
                    <Megaphone className="h-6 w-6 text-blue-600" />
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Marketing</h2>
                        <p className="text-muted-foreground text-sm">Email campaigns and SMS blasts</p>
                    </div>
                </div>

                {/* TABS */}
                <Tabs defaultValue="email">
                    <TabsList className="mb-4">
                        <TabsTrigger value="email" className="gap-2">
                            <Mail className="h-4 w-4" /> Email Campaigns
                        </TabsTrigger>
                        <TabsTrigger value="sms" className="gap-2">
                            <MessageSquare className="h-4 w-4" /> SMS Blasts
                        </TabsTrigger>
                    </TabsList>

                    {/* EMAIL CAMPAIGNS TAB */}
                    <TabsContent value="email" className="space-y-6">
                        {/* Email Stats */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                                    <Send className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{emailStats.totalSent.toLocaleString()}</div>
                                    <p className="text-xs text-muted-foreground">Emails sent lifetime</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{emailStats.deliveryRate}%</div>
                                    <Progress value={emailStats.deliveryRate} className="h-2 mt-2" />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                                    <Eye className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{emailStats.openRate}%</div>
                                    <p className="text-xs text-muted-foreground">Avg. engagement</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
                                    <MousePointer2 className="h-4 w-4 text-purple-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{emailStats.clickRate}%</div>
                                    <p className="text-xs text-muted-foreground">Clicks per open</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Create Email Button */}
                        <div className="flex justify-end">
                            <Button asChild>
                                <Link href="/email/new">
                                    <Plus className="mr-2 h-4 w-4" /> Create Email Campaign
                                </Link>
                            </Button>
                        </div>

                        {/* Email Campaign List */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" /> Recent Campaigns
                            </h3>

                            {emailCampaigns.length === 0 ? (
                                <div className="text-center py-20 bg-muted/20 rounded-xl border-dashed border-2">
                                    <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium">No campaigns yet</h3>
                                    <p className="text-muted-foreground mb-6">Send your first email blast to your customers.</p>
                                    <Button asChild>
                                        <Link href="/email/new">Draft Email</Link>
                                    </Button>
                                </div>
                            ) : (
                                emailCampaigns.map((c) => (
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
                                                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                                                        {new Date(c.created_at).toLocaleDateString("en-US", {
                                                            year: 'numeric', month: 'short', day: 'numeric'
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
                                                        <AlertCircle className="h-3.5 w-3.5 text-red-500" /> Spam
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
                    </TabsContent>

                    {/* SMS BLASTS TAB */}
                    <TabsContent value="sms" className="space-y-6">
                        {/* SMS Stats - Now scrollable with content */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                                    <Send className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{totalSmsSent + totalSmsReceived}</div>
                                    <p className="text-xs text-muted-foreground">{totalSmsReceived} Received</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Active Threads</CardTitle>
                                    <MessageSquare className="h-4 w-4 text-[#906CDD]" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{phoneNumbers.length}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-900 text-white border-none cursor-pointer" onClick={() => router.refresh()}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-300">Sync Status</CardTitle>
                                    <RefreshCcw className="h-4 w-4 text-[#906CDD]" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-lg font-bold flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div> Live
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* SMS Inner Tabs */}
                        <Tabs defaultValue="blast" className="flex-1 flex flex-col min-h-0">
                            <TabsList className="shrink-0 mb-4">
                                <TabsTrigger value="blast">New Blast</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                                <TabsTrigger value="threads">Threads</TabsTrigger>
                            </TabsList>

                            {/* New Blast */}
                            <TabsContent value="blast" className="flex-1 overflow-auto data-[state=inactive]:hidden">
                                <div className="max-w-2xl mx-auto w-full">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Sparkles className="text-[#906CDD] h-5 w-5" /> New Text Blast
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Campaign Name</Label>
                                                    <Input placeholder="e.g. Friday Flash Sale" value={blastName} onChange={e => setBlastName(e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Audience</Label>
                                                    <Select value={blastAudience} onValueChange={setBlastAudience}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">All Customers</SelectItem>
                                                            <SelectItem value="vip">VIPs ($500+ Spend)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Templates</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {TEMPLATES.map((t, i) => (
                                                        <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-slate-200" onClick={() => setBlastMessage(t)}>
                                                            Template {i + 1}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Message</Label>
                                                <Textarea
                                                    className="min-h-[100px] text-base"
                                                    placeholder="Type your message here. Use {name} for dynamic names."
                                                    value={blastMessage}
                                                    onChange={e => setBlastMessage(e.target.value)}
                                                />
                                            </div>
                                            <Button
                                                className="w-full bg-[#906CDD] hover:bg-[#7a5bb5] h-12 text-lg"
                                                onClick={handleSendBlast}
                                                disabled={sending}
                                            >
                                                {sending ? <Loader2 className="animate-spin mr-2" /> : "Launch Campaign"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* History */}
                            <TabsContent value="history" className="flex-1 overflow-auto data-[state=inactive]:hidden">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {smsCampaigns.map((c) => (
                                        <Card key={c.id}>
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between">
                                                    <Badge variant="outline">{new Date(c.created_at).toLocaleDateString()}</Badge>
                                                    <div className="text-xs text-muted-foreground flex items-center">
                                                        <Users className="h-3 w-3 mr-1" /> {c.recipient_count}
                                                    </div>
                                                </div>
                                                <CardTitle className="text-base mt-2">{c.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground line-clamp-2 bg-slate-50 p-2 rounded border">
                                                    "{c.message_body}"
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* Threads */}
                            <TabsContent value="threads" className="flex-1 flex flex-col min-h-0 border rounded-xl shadow-sm bg-white overflow-hidden data-[state=inactive]:hidden">
                                <div className="grid grid-cols-12 h-full">
                                    {/* Left Sidebar */}
                                    <div className="col-span-4 border-r flex flex-col bg-gray-50/30 h-full min-h-0">
                                        <div className="p-4 border-b shrink-0">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder="Search..." className="pl-8 bg-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-h-0">
                                            <ScrollArea className="h-full">
                                                <div className="flex flex-col">
                                                    {phoneNumbers.map(phone => {
                                                        const msgs = threads[phone];
                                                        const lastMsg = msgs[msgs.length - 1];
                                                        const name = getCustomerName(phone);
                                                        const isSelected = selectedPhone === phone;

                                                        return (
                                                            <div
                                                                key={phone}
                                                                onClick={() => setSelectedPhone(phone)}
                                                                className={`p-4 border-b cursor-pointer hover:bg-white transition-all 
                                                                ${isSelected ? 'bg-white border-l-4 border-l-[#906CDD]' : 'border-l-4 border-l-transparent'}`}
                                                            >
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className={`font-semibold text-sm truncate max-w-[140px] ${isSelected ? 'text-[#906CDD]' : 'text-slate-800'}`}>
                                                                        {name}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                                        {formatTime(lastMsg.created_at)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground line-clamp-1 break-all">
                                                                    {lastMsg.direction === 'outbound' ? 'You: ' : ''}{lastMsg.content}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>

                                    {/* Right Side (Chat Window) */}
                                    <div className="col-span-8 flex flex-col h-full min-h-0 bg-white relative">
                                        <div className="h-16 border-b flex items-center px-6 justify-between shrink-0 bg-white z-10">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-[#906CDD] text-white text-xs">
                                                        {selectedPhone ? getCustomerName(selectedPhone).charAt(0).toUpperCase() : "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-bold text-sm text-slate-900">
                                                        {selectedPhone ? getCustomerName(selectedPhone) : "Select a conversation"}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">{selectedPhone}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-h-0 bg-slate-50/30 relative">
                                            <ScrollArea className="h-full p-4">
                                                <div className="flex flex-col space-y-4 pb-4">
                                                    {sortedChat.map((msg) => (
                                                        <div key={msg.id} className={`flex w-full ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                                            <div
                                                                className={`max-w-[70%] p-3 text-sm shadow-sm break-words
                                                                ${msg.direction === 'outbound'
                                                                        ? 'bg-[#906CDD] text-white rounded-l-2xl rounded-tr-2xl'
                                                                        : 'bg-white border border-gray-100 text-gray-800 rounded-r-2xl rounded-tl-2xl'
                                                                    }`}
                                                            >
                                                                {msg.content}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div ref={scrollRef} className="h-1" />
                                                </div>
                                            </ScrollArea>
                                        </div>

                                        <div className="p-4 border-t bg-white shrink-0">
                                            <div className="flex gap-2">
                                                <Textarea
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    placeholder="Type a reply... (Enter to send)"
                                                    className="min-h-[50px] resize-none focus-visible:ring-[#906CDD]"
                                                />
                                                <Button
                                                    className="h-[50px] w-[50px] bg-[#906CDD] hover:bg-[#7a5bb5] rounded-md"
                                                    onClick={handleReply}
                                                    disabled={isSendingReply}
                                                >
                                                    {isSendingReply ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
