"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
    Search, Phone, Mail, MessageSquare, CheckCircle2,
    MoreHorizontal, Send, Mic, Clock, Loader2, Bot, Archive, Sparkles, BookOpen,
    Pencil, Check, X, Plus, Link2, ChevronDown, ChevronUp, ExternalLink, Copy, CalendarPlus
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger
} from "@/components/ui/collapsible";
import { CustomerSheet } from "@/components/customers/customer-sheet";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { toggleAutomation } from "@/app/actions/automations";
import { createSmartLink } from "@/app/actions/links";

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
    isAiEnabled: boolean;
}

// --- LEAD CONTEXT PANEL COMPONENT ---
interface LeadContextPanelProps {
    contact: Conversation;
    merchantId: string;
    onUpdate: (updates: Partial<Conversation>) => void;
}

function LeadContextPanel({ contact, merchantId, onUpdate }: LeadContextPanelProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(contact.display_name);
    const [status, setStatus] = useState(contact.status || 'new_lead');
    const [notes, setNotes] = useState('');
    const [newTag, setNewTag] = useState('');
    const [localTags, setLocalTags] = useState<string[]>(contact.tags || []);
    const [contactOpen, setContactOpen] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [customerData, setCustomerData] = useState<any>(null);

    const supabase = createClient();

    // Load customer data for sheet
    useEffect(() => {
        if (contact.customer_id) {
            supabase
                .from('customers')
                .select('*')
                .eq('id', contact.customer_id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setCustomerData(data);
                        setNotes(data.notes || '');
                        setLocalTags(data.tags || contact.tags || []);
                        setStatus(data.status || contact.status || 'new_lead');
                    }
                });
        }
    }, [contact.customer_id]);

    const handleSaveName = async () => {
        if (!editedName.trim()) return;

        // Parse first/last name
        const parts = editedName.trim().split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        const { error } = await supabase
            .from('customers')
            .update({ first_name: firstName, last_name: lastName })
            .eq('id', contact.customer_id);

        if (!error) {
            onUpdate({ display_name: editedName });
            toast.success('Name updated');
        } else {
            toast.error('Failed to update name');
        }
        setIsEditingName(false);
    };

    const handleStatusChange = async (newStatus: string) => {
        setStatus(newStatus);

        const { error } = await supabase
            .from('customers')
            .update({ status: newStatus })
            .eq('id', contact.customer_id);

        if (!error) {
            onUpdate({ status: newStatus });
            toast.success('Status updated');
        } else {
            toast.error('Failed to update status');
        }
    };

    const handleNotesBlur = async () => {
        const { error } = await supabase
            .from('customers')
            .update({ notes })
            .eq('id', contact.customer_id);

        if (!error) {
            toast.success('Notes saved');
        }
    };

    const handleAddTag = async () => {
        if (!newTag.trim() || localTags.includes(newTag.trim())) return;

        const updatedTags = [...localTags, newTag.trim()];
        setLocalTags(updatedTags);
        setNewTag('');

        const { error } = await supabase
            .from('customers')
            .update({ tags: updatedTags })
            .eq('id', contact.customer_id);

        if (!error) {
            onUpdate({ tags: updatedTags });
        }
    };

    const handleRemoveTag = async (tag: string) => {
        const updatedTags = localTags.filter(t => t !== tag);
        setLocalTags(updatedTags);

        const { error } = await supabase
            .from('customers')
            .update({ tags: updatedTags })
            .eq('id', contact.customer_id);

        if (!error) {
            onUpdate({ tags: updatedTags });
        }
    };

    const handleCopyBookingLink = () => {
        const bookingUrl = `${window.location.origin}/book/${merchantId}`;
        navigator.clipboard.writeText(bookingUrl);
        toast.success('Booking link copied!');
    };

    const getStatusConfig = (s: string) => {
        switch (s) {
            case 'new_lead': return { label: '🔵 New Lead', color: 'bg-blue-50 text-blue-700 border-blue-200' };
            case 'conversation': return { label: '🟡 Conversation', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
            case 'booked': return { label: '🟢 Booked', color: 'bg-green-50 text-green-700 border-green-200' };
            case 'lost': return { label: '🔴 Lost/Ghosting', color: 'bg-red-50 text-red-700 border-red-200' };
            default: return { label: '🔵 New Lead', color: 'bg-blue-50 text-blue-700 border-blue-200' };
        }
    };

    const isUnknownCaller = contact.display_name.toLowerCase().includes('unknown') ||
        contact.display_name.match(/^\+?[0-9\s-]+$/);

    return (
        <div className="w-[300px] border-l bg-white hidden xl:flex flex-col shrink-0 h-full">
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* HEADER: Editable Identity */}
                <div className="text-center">
                    <Avatar className="h-16 w-16 mx-auto mb-3">
                        <AvatarFallback className="text-lg bg-gradient-to-br from-[#906CDD] to-[#7a5bb5] text-white font-bold">
                            {contact.display_name[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                    </Avatar>

                    {isEditingName ? (
                        <div className="flex items-center justify-center gap-1">
                            <Input
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="h-8 text-center font-bold w-40"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName}>
                                <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditingName(false)}>
                                <X className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-1">
                            <h2 className="font-bold text-lg">{contact.display_name}</h2>
                            {isUnknownCaller && (
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                    setEditedName(contact.display_name);
                                    setIsEditingName(true);
                                }}>
                                    <Pencil className="h-3 w-3 text-slate-400" />
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Collapsible Contact Details */}
                    <Collapsible open={contactOpen} onOpenChange={setContactOpen}>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-6 mt-1">
                                {contact.contact_point}
                                {contactOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center justify-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span>{contact.contact_point}</span>
                            </div>
                            {customerData?.email && (
                                <div className="flex items-center justify-center gap-2">
                                    <Mail className="h-3 w-3" />
                                    <span>{customerData.email}</span>
                                </div>
                            )}
                        </CollapsibleContent>
                    </Collapsible>
                </div>

                {/* STATUS DROPDOWN */}
                <div>
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lead Status</h4>
                    <Select value={status} onValueChange={handleStatusChange}>
                        <SelectTrigger className={`w-full h-9 text-sm font-medium ${getStatusConfig(status).color}`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new_lead">🔵 New Lead</SelectItem>
                            <SelectItem value="conversation">🟡 Conversation</SelectItem>
                            <SelectItem value="booked">🟢 Booked</SelectItem>
                            <SelectItem value="lost">🔴 Lost/Ghosting</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* COPY BOOKING LINK */}
                <Button
                    variant="outline"
                    className="w-full gap-2 border-dashed"
                    onClick={handleCopyBookingLink}
                >
                    <Copy className="h-4 w-4" />
                    Copy Booking Link
                </Button>

                {/* QUICK NOTE */}
                <div>
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Internal Notes</h4>
                    <Textarea
                        placeholder="Add quick notes... (auto-saves)"
                        className="min-h-[80px] text-sm bg-amber-50/50 border-amber-100 resize-none"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={handleNotesBlur}
                    />
                </div>

                {/* RAPID TAGGING */}
                <div>
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {localTags.map((tag, i) => (
                            <Badge
                                key={i}
                                variant="secondary"
                                className="pl-2 pr-1 py-0.5 text-xs flex items-center gap-1 cursor-pointer hover:bg-slate-200"
                                onClick={() => handleRemoveTag(tag)}
                            >
                                {tag}
                                <X className="h-3 w-3" />
                            </Badge>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        <Input
                            placeholder="Add tag..."
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            className="h-8 text-sm"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleAddTag}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* VIEW FULL PROFILE BUTTON */}
            <div className="p-4 border-t">
                <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setIsSheetOpen(true)}
                >
                    <ExternalLink className="h-4 w-4" />
                    View Full Profile →
                </Button>
            </div>

            {/* CUSTOMER SHEET */}
            <CustomerSheet
                customer={customerData}
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
            />
        </div>
    );
}

// --- MAIN COMPONENT ---

export function InboxClient({ initialConversations, merchantId, isAiEnabled: initialAiEnabled }: InboxClientProps) {
    const [conversations, setConversations] = useState(initialConversations);
    const [selectedContact, setSelectedContact] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [filter, setFilter] = useState<'needs_attention' | 'all'>('needs_attention');
    const [aiEnabled, setAiEnabled] = useState(initialAiEnabled);
    const [aiToggling, setAiToggling] = useState(false);
    const [trainAi, setTrainAi] = useState(false);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
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
        let shouldRefresh = false;

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
                    status: newMsg.direction === 'inbound' ? 'needs_attention' : 'responded',
                    messages: [...exists.messages, newMsg]
                };

                const others = prev.filter(c => c.customer_id !== newMsg.customer_id);
                return [updatedConvo, ...others];
            } else {
                // New conversation - flag for refresh
                shouldRefresh = true;
                return prev;
            }
        });

        // Refresh outside of setState to avoid React warning
        if (shouldRefresh) {
            setTimeout(() => router.refresh(), 0);
        }

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

        // Show loading toast
        const loadingToast = toast.loading(`Sending ${channel.toUpperCase()}...`);

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

            // If Train AI is enabled, create a KB article from the Q&A
            if (trainAi && messages.length > 0) {
                const lastInboundMsg = [...messages].reverse().find(m => m.direction === 'inbound');
                if (lastInboundMsg) {
                    try {
                        const trainRes = await fetch("/api/kb/train", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                merchantId: merchantId,
                                customerQuestion: lastInboundMsg.content,
                                merchantAnswer: textToSend
                            })
                        });

                        if (trainRes.ok) {
                            const trainData = await trainRes.json();
                            toast.success(`📚 AI trained! Article: "${trainData.article?.title}"`);
                            setTrainAi(false); // Reset toggle
                        }
                    } catch (trainError) {
                        console.error("Train AI error:", trainError);
                        // Don't fail the send if training fails
                    }
                }
            }

            // Success toast
            toast.dismiss(loadingToast);
            toast.success(`${channel.toUpperCase()} sent!`);

        } catch (error) {
            console.error(`Failed to send ${channel}:`, error);
            toast.dismiss(loadingToast);
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
                        <div className="flex items-center gap-2">
                            <div
                                className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium transition-colors
                                    ${aiEnabled ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}
                            >
                                <Sparkles className="h-3 w-3" />
                                <span>AI</span>
                                <Switch
                                    checked={aiEnabled}
                                    disabled={aiToggling}
                                    onCheckedChange={async (checked) => {
                                        setAiToggling(true);
                                        try {
                                            await toggleAutomation(merchantId, 'ai_auto_reply', !checked);
                                            setAiEnabled(checked);
                                            toast.success(checked ? 'AI Auto-Reply enabled' : 'AI Auto-Reply disabled');
                                        } catch (e) {
                                            toast.error('Failed to update AI setting');
                                        } finally {
                                            setAiToggling(false);
                                        }
                                    }}
                                    className="h-4 w-7 data-[state=checked]:bg-purple-600"
                                />
                            </div>
                        </div>
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
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={async () => {
                                            if (!selectedContact) return;
                                            setIsGeneratingLink(true);
                                            try {
                                                const link = await createSmartLink({ contactId: selectedContact.customer_id });
                                                if (selectedContact.last_channel === 'email') {
                                                    // Email mode: Insert anchor tag
                                                    setNewMessage(prev => prev + `\n\nBook your appointment: ${link}`);
                                                } else {
                                                    // SMS mode: Append URL
                                                    setNewMessage(prev => prev + (prev ? ' ' : '') + link);
                                                }
                                                toast.success('Booking link added!');
                                            } catch (err: any) {
                                                toast.error(err.message || 'Failed to generate link');
                                            } finally {
                                                setIsGeneratingLink(false);
                                            }
                                        }}
                                        disabled={isGeneratingLink}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                                    >
                                        {isGeneratingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
                                        <span>Quick Book</span>
                                    </button>
                                    <button
                                        onClick={() => setTrainAi(!trainAi)}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all
                                            ${trainAi
                                                ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        <BookOpen className="h-3 w-3" />
                                        <span>Train AI</span>
                                    </button>
                                </div>
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

            {/* --- COLUMN 3: LEAD CONTEXT PANEL --- */}
            {selectedContact && (
                <LeadContextPanel
                    contact={selectedContact}
                    merchantId={merchantId}
                    onUpdate={(updates) => {
                        // Update local state
                        setConversations(prev => prev.map(c =>
                            c.customer_id === selectedContact.customer_id
                                ? { ...c, ...updates }
                                : c
                        ));
                        setSelectedContact(prev => prev ? { ...prev, ...updates } : null);
                    }}
                />
            )}

        </div>
    );
}