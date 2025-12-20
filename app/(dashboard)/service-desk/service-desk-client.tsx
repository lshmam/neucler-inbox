"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
    Search, Phone, MessageSquare, CheckCircle2, Send, Clock, Loader2, Car,
    Image, Zap, Lock, Ticket, Plus, X, ChevronRight, User, PanelRightClose, PanelRight,
    AlertCircle, DollarSign, Edit2, MoreHorizontal, History, Wrench
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// ============= TYPES =============
interface Vehicle {
    year: string;
    make: string;
    model: string;
    color?: string;
    vin?: string;
}

interface TicketInfo {
    id: string;
    number: number;
    subject: string;
    status: "open" | "waiting" | "resolved";
    priority: "low" | "normal" | "high";
    assignee?: string;
    createdAt: string;
}

interface DealInfo {
    id: string;
    title: string;
    stage: "new_lead" | "contacted" | "quote_sent" | "negotiating" | "won" | "lost";
    value?: number;
}

interface Message {
    id: string;
    type: "customer" | "agent" | "internal" | "system";
    content: string;
    sender?: string;
    timestamp: string;
}

interface Conversation {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    vehicle?: Vehicle;
    ltv?: number;
    lastVisit?: string;
    messages: Message[];
    ticket?: TicketInfo;
    deal?: DealInfo;
    unread: boolean;
    lastMessageAt: string;
    pastTickets?: { date: string; subject: string; status: string }[];
}


// ============= UNIFIED QUEUE (LEFT PANE) =============
function UnifiedQueue({ conversations, selectedId, onSelect, filter, onFilterChange, searchQuery, onSearchChange }: {
    conversations: Conversation[];
    selectedId: string | null;
    onSelect: (c: Conversation) => void;
    filter: "inbox" | "tickets" | "urgent";
    onFilterChange: (f: "inbox" | "tickets" | "urgent") => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
}) {
    const filtered = conversations.filter(c => {
        // Search filter
        const matchesSearch = !searchQuery ||
            c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.customerPhone.includes(searchQuery) ||
            c.vehicle?.vin?.includes(searchQuery);

        if (!matchesSearch) return false;

        // Tab filter
        if (filter === "inbox") return true; // All conversations
        if (filter === "tickets") return !!c.ticket;
        if (filter === "urgent") return c.unread || c.ticket?.priority === "high";
        return true;
    });

    return (
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
            {/* Search */}
            <div className="p-3 border-b border-slate-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search name, phone, VIN..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 h-9 bg-slate-50 border-slate-200 text-sm"
                    />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-3 py-2 border-b border-slate-100">
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                    {[
                        { key: "inbox", label: "Inbox" },
                        { key: "tickets", label: "Tickets" },
                        { key: "urgent", label: "Urgent" }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => onFilterChange(tab.key as typeof filter)}
                            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${filter === tab.key
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {filtered.map(c => (
                        <div
                            key={c.id}
                            onClick={() => onSelect(c)}
                            className={`relative p-3 rounded-lg cursor-pointer transition-all mb-1 ${selectedId === c.id
                                ? "bg-blue-50 border border-blue-200"
                                : "hover:bg-slate-50 border border-transparent"
                                } ${c.ticket?.priority === "high" ? "border-l-4 border-l-red-500" : ""}`}
                        >
                            {/* Row 1: Name + Time */}
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm ${c.unread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                                    {c.customerName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: false })}
                                </span>
                            </div>

                            {/* Row 2: Last message */}
                            <p className={`text-xs mb-2 line-clamp-1 ${c.unread ? "text-slate-700" : "text-slate-500"}`}>
                                {c.messages[c.messages.length - 1]?.content}
                            </p>

                            {/* Row 3: Badges */}
                            <div className="flex gap-1.5">
                                {c.ticket && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                                        🎫 #{c.ticket.number}: {c.ticket.status === "open" ? "Open" : c.ticket.status === "waiting" ? "Waiting" : "Resolved"}
                                    </Badge>
                                )}
                                {c.deal && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-50 text-green-700 border-green-200">
                                        💰 {c.deal.stage === "quote_sent" ? "Quote Sent" : c.deal.stage === "new_lead" ? "New Lead" : c.deal.stage}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

// ============= ACTION STREAM (CENTER PANE) =============
function ActionStream({ conversation, onSendMessage, onCreateTicket, onTogglePanel, isPanelOpen }: {
    conversation: Conversation | null;
    onSendMessage: (content: string, isInternal: boolean) => void;
    onCreateTicket: () => void;
    onTogglePanel: () => void;
    isPanelOpen: boolean;
}) {
    const [message, setMessage] = useState("");
    const [isNoteMode, setIsNoteMode] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (el) el.scrollTop = el.scrollHeight;
        }
    }, [conversation?.messages]);

    const handleSend = async () => {
        if (!message.trim()) return;
        setIsSending(true);
        await onSendMessage(message, isNoteMode);
        setMessage("");
        setIsSending(false);
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
                <div className="text-center text-slate-400">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="text-sm">Choose from the queue to start</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-white h-full min-w-0 overflow-hidden">
            {/* HUD Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-slate-200 text-slate-700 font-medium">
                            {conversation.customerName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="font-semibold text-slate-900">{conversation.customerName}</h2>
                        <p className="text-xs text-slate-500">{conversation.customerPhone}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {conversation.ticket ? (
                        <Badge className={`h-7 px-2.5 ${conversation.ticket.status === "open" ? "bg-blue-500" :
                            conversation.ticket.status === "waiting" ? "bg-yellow-500" : "bg-green-500"
                            } text-white border-0`}>
                            ● {conversation.ticket.status === "open" ? "Open" : conversation.ticket.status === "waiting" ? "Waiting" : "Resolved"}
                        </Badge>
                    ) : (
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onCreateTicket}>
                            <Plus className="h-3.5 w-3.5" /> Create Ticket
                        </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onTogglePanel}>
                        {isPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
                <div className="space-y-4 max-w-2xl mx-auto">
                    {conversation.messages.map(msg => {
                        // System Message (Divider)
                        if (msg.type === "system") {
                            return (
                                <div key={msg.id} className="flex items-center gap-3 py-2">
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-xs text-slate-500 px-2">— {msg.content} —</span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>
                            );
                        }

                        // Internal Note
                        if (msg.type === "internal") {
                            return (
                                <div key={msg.id} className="flex justify-end">
                                    <div className="max-w-[75%]">
                                        <div className="bg-amber-50 border border-amber-200 rounded-2xl rounded-tr-sm px-4 py-2.5">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Lock className="h-3 w-3 text-amber-600" />
                                                <span className="text-[10px] font-medium text-amber-700">Internal Note</span>
                                            </div>
                                            <p className="text-sm text-amber-900">{msg.content}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 text-right">
                                            {msg.sender} • {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        // Customer Message
                        if (msg.type === "customer") {
                            return (
                                <div key={msg.id} className="flex justify-start">
                                    <div className="max-w-[75%]">
                                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                                            <p className="text-sm text-slate-800">{msg.content}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 ml-2">
                                            {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        // Agent Message
                        return (
                            <div key={msg.id} className="flex justify-end">
                                <div className="max-w-[75%]">
                                    <div className="bg-blue-600 rounded-2xl rounded-tr-sm px-4 py-2.5">
                                        <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 text-right">
                                        {msg.sender} • {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Composer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                <Image className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${isNoteMode ? "text-amber-600" : "text-blue-600"}`}>
                                {isNoteMode ? "📝 Note Mode" : "💬 Reply"}
                            </span>
                            <Switch
                                checked={isNoteMode}
                                onCheckedChange={setIsNoteMode}
                                className="data-[state=checked]:bg-amber-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Textarea
                            placeholder={isNoteMode ? "Add internal note (not visible to customer)..." : "Type your reply..."}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            className={`flex-1 min-h-[60px] max-h-[120px] resize-none ${isNoteMode ? "bg-amber-50 border-amber-300" : "bg-white"}`}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!message.trim() || isSending}
                            className={`h-auto px-5 ${isNoteMode ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}
                        >
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============= CONTEXT PANEL (RIGHT PANE) =============
function ContextPanel({ conversation, isOpen, onClose, onUpdateTicket, onCreateTicket }: {
    conversation: Conversation | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateTicket: (updates: Partial<TicketInfo>) => void;
    onCreateTicket: () => void;
}) {
    if (!isOpen || !conversation) return null;

    return (
        <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col h-full shrink-0 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-slate-900">Details</h3>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-4">
                    {/* Section A: Active Ticket */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Ticket className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-sm text-slate-900">Active Ticket</span>
                        </div>

                        {conversation.ticket ? (
                            <div className="space-y-3">
                                {/* Subject */}
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Subject</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-900 flex-1">{conversation.ticket.subject}</span>
                                        <Button size="icon" variant="ghost" className="h-6 w-6">
                                            <Edit2 className="h-3 w-3 text-slate-400" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Status</label>
                                    <Select value={conversation.ticket.status} onValueChange={(v) => onUpdateTicket({ status: v as TicketInfo["status"] })}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="open">Open</SelectItem>
                                            <SelectItem value="waiting">Waiting on Customer</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Priority */}
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Priority</label>
                                    <Select value={conversation.ticket.priority} onValueChange={(v) => onUpdateTicket({ priority: v as TicketInfo["priority"] })}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Assignee */}
                                {conversation.ticket.assignee && (
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Assignee</label>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                                                    {conversation.ticket.assignee.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm text-slate-700">{conversation.ticket.assignee}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-slate-500 mb-3">No active ticket</p>
                                <Button size="sm" className="gap-1.5" onClick={onCreateTicket}>
                                    <Plus className="h-3.5 w-3.5" /> Create Ticket
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Section B: Vehicle Intelligence */}
                    {conversation.vehicle && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Car className="h-4 w-4 text-slate-600" />
                                <span className="font-semibold text-sm text-slate-900">Vehicle</span>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 mb-3">
                                <p className="font-medium text-slate-900">
                                    {conversation.vehicle.year} {conversation.vehicle.make} {conversation.vehicle.model}
                                </p>
                                {conversation.vehicle.vin && (
                                    <p className="text-xs text-slate-500 mt-1">VIN: ...{conversation.vehicle.vin.slice(-6)}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-green-50 rounded-lg p-2.5">
                                    <p className="text-[10px] text-green-600 font-medium">Lifetime Spend</p>
                                    <p className="text-lg font-bold text-green-700">${conversation.ltv?.toLocaleString() || 0}</p>
                                </div>
                                <div className="bg-slate-100 rounded-lg p-2.5">
                                    <p className="text-[10px] text-slate-600 font-medium">Last Visit</p>
                                    <p className="text-sm font-medium text-slate-700">{conversation.lastVisit || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section C: History */}
                    {conversation.pastTickets && conversation.pastTickets.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <History className="h-4 w-4 text-slate-600" />
                                <span className="font-semibold text-sm text-slate-900">Past Tickets</span>
                            </div>
                            <div className="space-y-2">
                                {conversation.pastTickets.map((t, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                                        <div>
                                            <p className="text-xs font-medium text-slate-700">{t.subject}</p>
                                            <p className="text-[10px] text-slate-400">{t.date}</p>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] h-5">{t.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

// ============= MAIN COMPONENT =============
export function ServiceDeskClient({ initialTickets, merchantId }: { initialTickets: Conversation[]; merchantId: string }) {
    // Use only real data - no mock fallback
    const sortedData = [...initialTickets].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    const [conversations, setConversations] = useState<Conversation[]>(sortedData);
    const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(sortedData[0] || null);
    const [filter, setFilter] = useState<"inbox" | "tickets" | "urgent">("inbox");
    const [searchQuery, setSearchQuery] = useState("");
    const [isPanelOpen, setIsPanelOpen] = useState(true);

    const handleCreateTicket = () => {
        if (!selectedConvo) return;
        const newTicket: TicketInfo = {
            id: `tkt-${Date.now()}`,
            number: 1000 + Math.floor(Math.random() * 100),
            subject: "New Ticket",
            status: "open",
            priority: "normal",
            assignee: "You",
            createdAt: new Date().toISOString()
        };

        const systemMsg: Message = {
            id: `m-${Date.now()}`,
            type: "system",
            content: `Ticket #${newTicket.number} Created by You`,
            timestamp: new Date().toISOString()
        };

        setConversations(prev => prev.map(c =>
            c.id === selectedConvo.id
                ? { ...c, ticket: newTicket, messages: [...c.messages, systemMsg] }
                : c
        ));
        setSelectedConvo(prev => prev ? { ...prev, ticket: newTicket, messages: [...prev.messages, systemMsg] } : null);
        toast.success(`Ticket #${newTicket.number} created`);
    };

    const handleUpdateTicket = (updates: Partial<TicketInfo>) => {
        if (!selectedConvo?.ticket) return;
        setConversations(prev => prev.map(c =>
            c.id === selectedConvo.id && c.ticket
                ? { ...c, ticket: { ...c.ticket, ...updates } }
                : c
        ));
        setSelectedConvo(prev =>
            prev?.ticket ? { ...prev, ticket: { ...prev.ticket, ...updates } } : prev
        );
        toast.success("Ticket updated");
    };

    const handleSendMessage = async (content: string, isInternal: boolean) => {
        if (!selectedConvo) return;
        const newMsg: Message = {
            id: `m-${Date.now()}`,
            type: isInternal ? "internal" : "agent",
            content,
            sender: "You",
            timestamp: new Date().toISOString()
        };

        setConversations(prev => prev.map(c =>
            c.id === selectedConvo.id
                ? { ...c, messages: [...c.messages, newMsg], lastMessageAt: newMsg.timestamp }
                : c
        ));
        setSelectedConvo(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : null);
        toast.success(isInternal ? "Note added" : "Message sent");
    };

    return (
        <div className="h-screen flex overflow-hidden bg-slate-100">
            <UnifiedQueue
                conversations={conversations}
                selectedId={selectedConvo?.id || null}
                onSelect={setSelectedConvo}
                filter={filter}
                onFilterChange={setFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />
            <ActionStream
                conversation={selectedConvo}
                onSendMessage={handleSendMessage}
                onCreateTicket={handleCreateTicket}
                onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
                isPanelOpen={isPanelOpen}
            />
            <ContextPanel
                conversation={selectedConvo}
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                onUpdateTicket={handleUpdateTicket}
                onCreateTicket={handleCreateTicket}
            />
        </div>
    );
}
