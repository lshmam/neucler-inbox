"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
    Search, Phone, Mail, MessageSquare, CheckCircle2,
    MoreHorizontal, Send, Mic, Clock, Loader2, Bot, Archive
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

// --- TYPES ---
interface Conversation {
    customer_id: string;
    display_name: string;
    contact_point: string;
    last_message_preview: string;
    last_message_at: string;
    last_channel: 'sms' | 'email' | 'call' | 'widget';
    status: string;
    tags: string[];
    messages: any[];
}

interface InboxClientProps {
    initialConversations: Conversation[];
    merchantId: string;
}

// --- COMPONENT ---

export function InboxClient({ initialConversations, merchantId }: InboxClientProps) {
    const [conversations, setConversations] = useState(initialConversations);
    const [selectedContact, setSelectedContact] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [filter, setFilter] = useState<'needs_attention' | 'all'>('needs_attention');
    const scrollRef = useRef<HTMLDivElement>(null);

    const supabase = createClient();
    const router = useRouter();
    const selectedContactRef = useRef<Conversation | null>(null);

    // Keep ref updated for realtime handler
    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('realtime-messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `merchant_id=eq.${merchantId}`
                },
                (payload) => {
                    const newMsg = payload.new;
                    handleRealtimeMessage(newMsg);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [merchantId, supabase]);

    const cleanEmailContent = (text: string) => {
        if (!text) return "";
        // Remove lines starting with > (standard quotes)
        // Remove "On [Date] ... wrote:" lines
        return text
            .split('\n')
            .filter(line => !line.trim().startsWith('>'))
            .filter(line => !line.match(/^On.*wrote:$/))
            .join('\n')
            .trim();
    };

    const handleRealtimeMessage = (newMsg: any) => {
        // 1. Update Conversations List
        setConversations(prev => {
            const exists = prev.find(c => c.customer_id === newMsg.customer_id);

            if (exists) {
                // Move to top and update
                const updatedConvo = {
                    ...exists,
                    last_message_preview: newMsg.body || newMsg.content || '',
                    last_message_at: newMsg.created_at,
                    last_channel: newMsg.channel || 'sms',
                    status: 'needs_attention', // Re-open
                    messages: [...exists.messages, newMsg]
                };

                const others = prev.filter(c => c.customer_id !== newMsg.customer_id);
                return [updatedConvo, ...others];
            } else {
                // New conversation - refresh to fetch customer details
                router.refresh();
                return prev;
            }
        });

        // 2. Update Active Chat if open
        if (selectedContactRef.current?.customer_id === newMsg.customer_id) {
            setMessages(prev => {
                // Avoid duplicates (e.g. if optimistic update already added it)
                // We assume optimistic has temp ID, real has UUID. 
                // But simple check: if we just sent it, we might have it.
                // For now, just append. Optimistic usually replaced or filtered.
                return [...prev, newMsg];
            });
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } else {
            // Optional: Play sound or show toast
            toast.info("New message received");
        }
    };

    // Filter conversations
    const filteredConversations = conversations.filter(c => {
        if (filter === 'needs_attention') return c.status === 'needs_attention';
        return true;
    });

    // Load messages when contact is selected and mark as read
    useEffect(() => {
        if (selectedContact) {
            setMessages(selectedContact.messages || []);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

            // Mark as read (remove blue dot) locally
            if (selectedContact.status === 'needs_attention') {
                setConversations(prev => prev.map(c =>
                    c.customer_id === selectedContact.customer_id
                        ? { ...c, status: 'read' }
                        : c
                ));
                // Update selected contact status as well to reflect immediately
                setSelectedContact(prev => prev ? { ...prev, status: 'read' } : null);
            }
        }
    }, [selectedContact?.customer_id]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedContact) return;

        setIsSending(true);
        const textToSend = newMessage;
        setNewMessage(""); // Clear input immediately

        // Determine channel
        const isEmail = selectedContact.last_channel === 'email';
        const channel = isEmail ? 'email' : 'sms';

        // Optimistic update
        const tempId = Math.random().toString();
        const optimisticMsg = {
            id: tempId,
            direction: "outbound",
            content: textToSend,
            channel: channel,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        try {
            let res;
            if (isEmail) {
                // TODO: Implement Email Reply API
                console.log("Sending email reply:", textToSend);
                await new Promise(resolve => setTimeout(resolve, 1000));
                res = { ok: true };
            } else {
                res = await fetch("/api/sms/reply", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        phone: selectedContact.contact_point,
                        message: textToSend
                    })
                });
            }

            if (!res.ok) {
                throw new Error("Failed to send");
            }

            // Note: Realtime subscription will likely catch the sent message too if the API saves it.
            // We might get a duplicate if we don't handle it, but for now it's fine.

        } catch (error) {
            console.error(`Failed to send ${channel}:`, error);
            toast.error(`Failed to send ${channel}`);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(textToSend);
        } finally {
            setIsSending(false);
        }
    };

    const handleResolve = () => {
        if (!selectedContact) return;

        setConversations(prev => prev.map(c =>
            c.customer_id === selectedContact.customer_id
                ? { ...c, status: 'resolved' }
                : c
        ));

        toast.success("Conversation resolved");

        if (filter === 'needs_attention') {
            setSelectedContact(null);
        }
    };

    const getIcon = (channel: string) => {
        if (channel === 'email') return <Mail className="h-3 w-3" />;
        if (channel === 'call') return <Phone className="h-3 w-3" />;
        if (channel === 'widget') return <Bot className="h-3 w-3" />;
        return <MessageSquare className="h-3 w-3" />;
    };

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] bg-white border-t overflow-hidden">

            {/* --- COLUMN 1: CONVERSATION LIST --- */}
            <div className="w-full md:w-[350px] border-r flex flex-col bg-slate-50/50 shrink-0">
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-lg">Inbox</h2>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search messages..." className="pl-8 bg-white" />
                    </div>

                    {/* TABS / FILTERS */}
                    <div className="flex gap-2 p-1 bg-slate-200/50 rounded-lg">
                        <button
                            onClick={() => setFilter('needs_attention')}
                            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${filter === 'needs_attention' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Needs Attention
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${filter === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            All Messages
                        </button>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                            <p>No {filter === 'needs_attention' ? 'new' : ''} conversations</p>
                        </div>
                    ) : (
                        filteredConversations.map((convo) => (
                            <div
                                key={convo.customer_id}
                                onClick={() => setSelectedContact(convo)}
                                className={`
                                    p-4 border-b cursor-pointer transition-colors hover:bg-slate-100
                                    ${selectedContact?.customer_id === convo.customer_id ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-semibold text-sm truncate max-w-[180px] ${convo.status === 'needs_attention' ? 'text-slate-900' : 'text-slate-600'}`}>
                                        {convo.display_name}
                                    </span>
                                    <span className="text-[10px] text-slate-400" suppressHydrationWarning>
                                        {formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className={`
                                        p-1 rounded text-white
                                        ${convo.last_channel === 'sms' ? 'bg-green-500' : convo.last_channel === 'email' ? 'bg-blue-500' : convo.last_channel === 'widget' ? 'bg-purple-500' : 'bg-orange-500'}
                                    `}>
                                        {getIcon(convo.last_channel)}
                                    </div>
                                    <p className={`truncate flex-1 ${convo.status === 'needs_attention' ? 'font-medium text-slate-700' : ''}`}>
                                        {convo.last_message_preview}
                                    </p>
                                    {convo.status === 'needs_attention' && (
                                        <div className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </ScrollArea>
            </div>

            {/* --- COLUMN 2: CHAT THREAD --- */}
            <div className="flex-1 flex flex-col bg-white min-w-0 h-full">
                {selectedContact ? (
                    <>
                        {/* Header */}
                        <div className="h-16 border-b flex items-center justify-between px-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarFallback>{selectedContact.display_name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-sm">{selectedContact.display_name}</h3>
                                    <p className="text-xs text-muted-foreground">{selectedContact.contact_point}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={handleResolve}
                                >
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Resolve
                                </Button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                            <div className="space-y-6 pb-4">
                                {messages.map((msg, idx) => (
                                    <div key={msg.id || idx} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`
                                            max-w-[80%] rounded-xl p-4 text-sm shadow-sm
                                            ${msg.channel === 'call' ? 'w-full max-w-md bg-white border border-slate-200' : ''}
                                            ${msg.channel !== 'call' && msg.direction === 'outbound' ? 'bg-blue-600 text-white rounded-tr-none' : ''}
                                            ${msg.channel !== 'call' && msg.direction === 'inbound' ? 'bg-white border border-slate-200 rounded-tl-none' : ''}
                                        `}>

                                            {/* CALL BANNER */}
                                            {msg.channel === 'call' && (
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-orange-100 p-2 rounded-full">
                                                        <Phone className="h-4 w-4 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 mb-1">
                                                            {msg.direction === 'inbound' ? "Incoming Call" : "Outbound Call"}
                                                        </p>
                                                        <p className="text-slate-600 italic">"{msg.content}"</p>
                                                        {msg.recording_url && (
                                                            <div className="mt-3">
                                                                <Button size="sm" variant="outline" className="h-7 text-xs">
                                                                    <Mic className="mr-1 h-3 w-3" /> Listen to Recording
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* --- EMAIL MESSAGES (Outbound & Inbound) --- */}
                                            {msg.channel === 'email' && (
                                                <div className="space-y-2 min-w-[250px]">
                                                    {/* Header: Shows "Campaign" vs "Reply" */}
                                                    <div className={`flex items-center gap-2 border-b pb-1 mb-2 ${msg.direction === 'outbound' ? 'border-blue-400/30' : 'border-slate-200'}`}>
                                                        <Mail className="h-3.5 w-3.5" />
                                                        <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                                                            {msg.direction === 'outbound' ? 'Sent Campaign' : 'Email Reply'}
                                                        </span>
                                                    </div>

                                                    {/* Body Content */}
                                                    <p className="whitespace-pre-wrap leading-relaxed">
                                                        {msg.direction === 'outbound'
                                                            ? msg.content // Show full content for your sent emails
                                                            : cleanEmailContent(msg.content) // Clean up replies
                                                        }
                                                    </p>
                                                </div>
                                            )}

                                            {/* TEXT MESSAGE (SMS, Widget, or fallback) */}
                                            {(!['call', 'email'].includes(msg.channel)) && (
                                                <p>{msg.content}</p>
                                            )}

                                            <div className={`text-[10px] mt-1 text-right ${msg.direction === 'outbound' && msg.channel !== 'call' ? 'text-blue-100' : 'text-slate-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t bg-white">
                            <div className="relative">
                                <Input
                                    placeholder={selectedContact.last_channel === 'email' ? "Type an email reply..." : "Type an SMS..."}
                                    className="pr-12 h-12"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button size="icon" className="absolute right-1 top-1 h-10 w-10 bg-blue-600 hover:bg-blue-700" onClick={handleSendMessage} disabled={isSending}>
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div className="flex justify-between items-center mt-2 px-1">
                                <p className="text-xs text-muted-foreground">
                                    Sending as {selectedContact.last_channel === 'email' ? 'Email' : 'SMS'}
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="h-8 w-8 text-slate-300" />
                        </div>
                        <p>Select a conversation to start</p>
                    </div>
                )}
            </div>

            {/* --- COLUMN 3: CRM PROFILE --- */}
            {selectedContact && (
                <div className="w-[300px] border-l bg-white p-6 hidden xl:block shrink-0">
                    <div className="text-center mb-6">
                        <Avatar className="h-20 w-20 mx-auto mb-3">
                            <AvatarFallback className="text-xl bg-slate-100">{selectedContact.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <h2 className="font-bold text-lg">{selectedContact.display_name}</h2>
                        <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">Active Customer</Badge>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-6">
                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact Info</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    <span>{selectedContact.contact_point}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tags</h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedContact.tags.length > 0 ? (
                                    selectedContact.tags.map((tag: string) => (
                                        <Badge key={tag} variant="secondary">{tag}</Badge>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No tags</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}