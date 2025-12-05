"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
    Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    MessageSquare, Send, TrendingUp,
    Search, Loader2, Sparkles, RefreshCcw, Users
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "sonner";


// --- INITIALIZE SUPABASE ---
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- HYDRATION SAFE TIME FORMATTER ---
// This ensures Server and Client render the exact same string
const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
};

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

interface SMSPageProps {
    campaigns: any[];
    messages: Message[];
    merchantId: string;
}

const TEMPLATES = [
    "Hi {name}, thanks for visiting! We'd love a review: bit.ly/review",
    "Hey {name}, we have a 20% off flash sale this weekend!",
    "Hi {name}, just a reminder about your appointment tomorrow."
];

export function SMSClientView({ campaigns, messages: initialMessages, merchantId }: SMSPageProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("inbox");

    // Local state for real-time updates
    const [localMessages, setLocalMessages] = useState<Message[]>(initialMessages);
    const [localCampaigns, setLocalCampaigns] = useState<any[]>(campaigns);


    // Refs for scrolling
    const scrollRef = useRef<HTMLDivElement>(null);

    // Form States
    const [blastName, setBlastName] = useState("");
    const [blastAudience, setBlastAudience] = useState("all");
    const [blastMessage, setBlastMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [isSendingReply, setIsSendingReply] = useState(false);

    // --- 1. REALTIME LISTENER ---
    useEffect(() => {
        console.log("🔌 Setting up Realtime connection for merchant:", merchantId);

        const channel = supabase
            .channel('sms-updates') // Unique name for the channel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `merchant_id=eq.${merchantId}`
                },
                (payload) => {
                    console.log("⚡ New Message Received:", payload);
                    const newMsg = payload.new as any;

                    // Normalize data structure
                    const formattedMsg: Message = {
                        id: newMsg.id,
                        created_at: newMsg.created_at,
                        direction: newMsg.direction,
                        content: newMsg.body || newMsg.message_body || "",
                        customer_phone: newMsg.customer_phone,
                        status: newMsg.status,
                        customers: null
                    };

                    setLocalMessages((prev) => {
                        // Deduplicate: If we already have this ID, don't add it again
                        if (prev.some(m => m.id === formattedMsg.id)) return prev;
                        return [...prev, formattedMsg];
                    });
                }
            )
            .subscribe((status) => {
                // Debugging: Check console to see if it says "SUBSCRIBED"
                console.log("🔌 Realtime Status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [merchantId]);
    // --- 2. GROUP MESSAGES ---
    const threads = useMemo(() => {
        const groups: Record<string, Message[]> = {};
        localMessages.forEach(msg => {
            const phone = msg.customers?.phone_number || msg.customer_phone;
            if (phone) {
                if (!groups[phone]) groups[phone] = [];
                groups[phone].push(msg);
            }
        });
        return groups;
    }, [localMessages]);

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

    // --- 3. SCROLL LOGIC ---
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

    // --- HANDLERS ---
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

        setLocalMessages((prev) => [...prev, newMessage]);

        try {
            await fetch("/api/sms/reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: selectedPhone, message: textToSend })
            });
        } catch (error) {
            console.error(error);
            alert("Failed to send.");
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
        // 1. Validation Toast
        if (!blastName || !blastMessage) {
            toast.warning("Missing Fields", {
                description: "Please enter a campaign name and message."
            });
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

            if (!res.ok) {
                throw new Error(data.error || "Failed to send");
            }

            const count = data.campaign?.recipient_count || data.count || "multiple";

            // 3. Success Toast (Dismisses loading)
            toast.dismiss(loadingToast);
            toast.success("Campaign Launched! 🚀", {
                description: `Successfully sent to ${count} customers.`,
                duration: 4000, // stays for 4 seconds
            });

            // Clear form and update state
            setBlastName("");
            setBlastMessage("");

            if (data.campaign) {
                setLocalCampaigns(prev => [data.campaign, ...prev]);
            } else {
                router.refresh();
            }

            setActiveTab("campaigns");

        } catch (e: any) {
            console.error(e);
            // 4. Error Toast
            toast.dismiss(loadingToast);
            toast.error("Campaign Failed", {
                description: e.message || "Something went wrong. Please try again."
            });
        } finally {
            setSending(false);
        }
    };
    // Stats
    const totalSent = campaigns.reduce((acc, curr) => acc + (curr.recipient_count || 0), 0) + localMessages.filter(m => m.direction === 'outbound').length;
    const totalReceived = localMessages.filter(m => m.direction === 'inbound').length;
    const responseRate = totalSent > 0 ? Math.round((totalReceived / totalSent) * 100) : 0;

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50/50">

            {/* STATS HEADER */}
            <div className="p-8 pb-4 shrink-0 grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSent + totalReceived}</div>
                        <p className="text-xs text-muted-foreground">{totalReceived} Received</p>
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

            {/* MAIN CONTENT - Uses flex-1 and min-h-0 to force proper scrolling */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-8 pb-6">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <TabsList>
                        <TabsTrigger value="inbox">Inbox</TabsTrigger>
                        <TabsTrigger value="campaigns">History</TabsTrigger>
                        <TabsTrigger value="new">New Blast</TabsTrigger>
                    </TabsList>
                </div>

                {/* INBOX TAB */}
                <TabsContent value="inbox" className="flex-1 flex flex-col min-h-0 border rounded-xl shadow-sm bg-white overflow-hidden data-[state=inactive]:hidden">
                    <div className="grid grid-cols-12 h-full">

                        {/* LEFT SIDEBAR */}
                        <div className="col-span-4 border-r flex flex-col bg-gray-50/30 h-full min-h-0">
                            <div className="p-4 border-b shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search..." className="pl-8 bg-white" />
                                </div>
                            </div>
                            {/* ScrollArea Parent must be flex-1 and min-h-0 */}
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

                        {/* RIGHT SIDE (Chat Window) */}
                        <div className="col-span-8 flex flex-col h-full min-h-0 bg-white relative">
                            {/* Header */}
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

                            {/* Chat Messages */}
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

                            {/* Input */}
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

                {/* CAMPAIGN TABS */}
                <TabsContent value="campaigns" className="flex-1 overflow-auto data-[state=inactive]:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {localCampaigns.map((c) => (
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

                {/* NEW BLAST TAB */}
                <TabsContent value="new" className="flex-1 overflow-auto data-[state=inactive]:hidden">
                    <div className="max-w-2xl mx-auto w-full pb-10">
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
            </Tabs>
        </div>
    );
}