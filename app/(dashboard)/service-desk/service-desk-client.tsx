"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase-client";
import { formatDistanceToNow, format } from "date-fns";
import {
    Search, Phone, MessageSquare, CheckCircle2, Send, Clock, Loader2, Car,
    Image, Zap, Lock, Ticket, Plus, X, ChevronRight, User, PanelRightClose, PanelRight,
    AlertCircle, DollarSign, Edit2, MoreHorizontal, History, Wrench, Tag, FileText, Bot
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    stage: "new_inquiry" | "quote_sent" | "follow_up" | "booked";
    value?: number;
}

interface TranscriptEntry {
    role?: string;
    speaker?: string;
    content?: string;
    words?: string;
    text?: string;
    transcript?: string;
}

interface Message {
    id: string;
    type: "customer" | "agent" | "internal" | "system";
    content: string;
    sender?: string;
    timestamp: string;
    callSummary?: string;
    callTranscript?: TranscriptEntry[];
}

interface Conversation {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    vehicle?: Vehicle;
    vehicleYear?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    serviceRequested?: string;
    ltv?: number;
    lastVisit?: string;
    messages: Message[];
    ticket?: TicketInfo;
    deal?: DealInfo;
    unread: boolean;
    lastMessageAt: string;
    pastTickets?: { date: string; subject: string; status: string }[];
    tags?: string[];
}

interface TeamMember {
    id: string; // This will map to assigned_to which might be user_id
    user_id: string;
    role: string;
    email: string;
    name: string;
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
        <div className="w-full bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
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
                            className={`relative p-3 rounded-lg cursor-pointer transition-all mb-1 overflow-hidden ${selectedId === c.id
                                ? "bg-blue-50 border border-blue-200"
                                : "hover:bg-slate-50 border border-transparent"
                                }`}
                        >
                            {/* High Priority Indicator */}
                            {c.ticket?.priority === "high" && (
                                <div className="absolute left-0 top-2 bottom-2 w-1 bg-red-500 rounded-full" />
                            )}
                            {/* Row 1: Name + Time */}
                            <div className={`flex items-center justify-between mb-1 ${c.ticket?.priority === "high" ? "pl-2" : ""}`}>
                                <span className={`text-sm truncate ${c.unread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                                    {c.customerName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: false })}
                                </span>
                            </div>

                            {/* Row 2: Last message */}
                            <p className={`text-xs mb-2 line-clamp-1 ${c.unread ? "text-slate-700" : "text-slate-500"} ${c.ticket?.priority === "high" ? "pl-2" : ""}`}>
                                {c.messages[c.messages.length - 1]?.content}
                            </p>

                            {/* Row 3: Badges */}
                            <div className={`flex gap-1.5 ${c.ticket?.priority === "high" ? "pl-2" : ""}`}>
                                {c.ticket && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                                        🎫 #{c.ticket.number}: {c.ticket.status === "open" ? "Open" : c.ticket.status === "waiting" ? "Waiting" : "Resolved"}
                                    </Badge>
                                )}
                                {c.deal && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-50 text-green-700 border-green-200">
                                        💰 {c.deal.stage === "quote_sent" ? "Quote Sent" : c.deal.stage === "new_inquiry" ? "New Inquiry" : c.deal.stage}
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
function ActionStream({ conversation, onSendMessage, onCreateTicket, onTogglePanel, isPanelOpen, onBack, onShowDetails }: {
    conversation: Conversation | null;
    onSendMessage: (content: string, isInternal: boolean) => void;
    onCreateTicket: () => void;
    onTogglePanel: () => void;
    isPanelOpen: boolean;
    onBack: () => void;
    onShowDetails: () => void;
}) {
    const [message, setMessage] = useState("");
    const [isNoteMode, setIsNoteMode] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);
    const [activeTranscript, setActiveTranscript] = useState<TranscriptEntry[]>([]);
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
                <div className="flex items-center gap-3 min-w-0">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 md:hidden"
                        onClick={onBack}
                    >
                        <ChevronRight className="h-5 w-5 rotate-180" />
                    </Button>
                    <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-slate-200 text-slate-700 font-medium">
                            {conversation.customerName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <h2 className="font-semibold text-slate-900 whitespace-normal break-words">{conversation.customerName}</h2>
                        <p className="text-xs text-slate-500 truncate">{conversation.customerPhone}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs md:hidden"
                        onClick={onShowDetails}
                    >
                        Details
                    </Button>
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
                        // System Message (Call with Summary)
                        if (msg.type === "system") {
                            const hasTranscript = msg.callTranscript && msg.callTranscript.length > 0;
                            const hasSummary = msg.callSummary && msg.callSummary.trim().length > 0;

                            return (
                                <div key={msg.id} className="space-y-2">
                                    {/* Call Divider */}
                                    <div className="flex items-center gap-3 py-2">
                                        <div className="flex-1 h-px bg-slate-200" />
                                        <span className="text-xs text-slate-500 px-2 flex items-center gap-1.5">
                                            <Phone className="h-3 w-3" />
                                            {msg.content}
                                        </span>
                                        <div className="flex-1 h-px bg-slate-200" />
                                    </div>

                                    {/* Call Summary Card */}
                                    {(hasSummary || hasTranscript) && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mx-auto max-w-[85%]">
                                            {hasSummary && (
                                                <div className="mb-3">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <Bot className="h-4 w-4 text-blue-600" />
                                                        <span className="text-xs font-medium text-slate-600">AI Call Summary</span>
                                                    </div>
                                                    <p className="text-sm text-slate-700 leading-relaxed">{msg.callSummary}</p>
                                                </div>
                                            )}

                                            {hasTranscript && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full mt-2"
                                                    onClick={() => {
                                                        setActiveTranscript(msg.callTranscript || []);
                                                        setTranscriptModalOpen(true);
                                                    }}
                                                >
                                                    <FileText className="h-4 w-4 mr-2" />
                                                    View Full Transcript
                                                </Button>
                                            )}
                                        </div>
                                    )}
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
                                        <p className="text-[10px] text-slate-400 mt-1 text-right" suppressHydrationWarning>
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
                                        <p className="text-[10px] text-slate-400 mt-1 ml-2" suppressHydrationWarning>
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
                                    <p className="text-[10px] text-slate-400 mt-1 text-right" suppressHydrationWarning>
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

            {/* Transcript Modal */}
            <Dialog open={transcriptModalOpen} onOpenChange={setTranscriptModalOpen}>
                <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Call Transcript
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 pr-4" style={{ maxHeight: 'calc(80vh - 80px)' }}>
                        <div className="space-y-3 pb-4">
                            {activeTranscript.map((entry, index) => {
                                // Handle various Retell transcript formats
                                const role = (entry.role || entry.speaker || '').toLowerCase();
                                const content = entry.content || entry.words || entry.text || entry.transcript || '';

                                const isAgent = role.includes('agent') ||
                                    role.includes('assistant') ||
                                    role.includes('ai') ||
                                    role === 'agent';

                                // Default to customer if not agent
                                const displayAsAgent = isAgent;

                                return (
                                    <div
                                        key={index}
                                        className={`flex ${displayAsAgent ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[80%] ${displayAsAgent ? 'order-2' : 'order-1'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${displayAsAgent
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {displayAsAgent ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                                </div>
                                                <span className={`text-xs font-medium ${displayAsAgent ? 'text-blue-600' : 'text-slate-600'
                                                    }`}>
                                                    {displayAsAgent ? 'AI Agent' : 'Customer'}
                                                </span>
                                            </div>
                                            <div className={`rounded-2xl px-4 py-2.5 ${displayAsAgent
                                                ? 'bg-blue-600 text-white rounded-tr-sm'
                                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                                                }`}>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                    {content || '(No content)'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {activeTranscript.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    No transcript available
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ============= CONTEXT PANEL (RIGHT PANE) =============
function ContextPanel({ conversation, isOpen, onClose, onUpdateTicket, onCreateTicket, onSendToPipeline, onUpdateTags, onUpdateCustomerInfo, teamMembers, onBack }: {
    conversation: Conversation | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateTicket: (updates: Partial<TicketInfo>) => void;
    onCreateTicket: () => void;
    onSendToPipeline: (stage: string) => void;
    onUpdateTags: (customerId: string, tags: string[]) => void;
    onUpdateCustomerInfo?: (customerId: string, updates: { firstName?: string; lastName?: string; vehicleYear?: string; vehicleMake?: string; vehicleModel?: string; serviceRequested?: string }) => void;
    teamMembers: TeamMember[];
    onBack?: () => void;
}) {
    const [selectedStage, setSelectedStage] = useState("new_inquiry");
    const [isSending, setIsSending] = useState(false);
    const [newTag, setNewTag] = useState("");
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [isEditingVehicle, setIsEditingVehicle] = useState(false);
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editVehicleYear, setEditVehicleYear] = useState("");
    const [editVehicleMake, setEditVehicleMake] = useState("");
    const [editVehicleModel, setEditVehicleModel] = useState("");
    const [editService, setEditService] = useState("");
    const [isSavingVehicle, setIsSavingVehicle] = useState(false);

    if (!isOpen || !conversation) return null;

    const pipelineStages = [
        { value: "new_inquiry", label: "New Inquiry", color: "bg-blue-500" },
        { value: "quote_sent", label: "Quote Sent", color: "bg-yellow-500" },
        { value: "follow_up", label: "Follow-Up", color: "bg-purple-500" },
        { value: "booked", label: "Booked", color: "bg-green-500" },
    ];

    const handleSendToPipeline = async () => {
        setIsSending(true);
        await onSendToPipeline(selectedStage);
        setIsSending(false);
    };

    const handleAddTag = async () => {
        const tagToAdd = newTag.trim().toLowerCase();
        if (!tagToAdd) return;

        setIsAddingTag(true);
        const updatedTags = [...(conversation.tags || []), tagToAdd];
        await onUpdateTags(conversation.customerId, updatedTags);
        setNewTag("");
        setIsAddingTag(false);
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        const updatedTags = (conversation.tags || []).filter(t => t !== tagToRemove);
        await onUpdateTags(conversation.customerId, updatedTags);
    };

    // Common suggested tags for quick add
    const suggestedTags = ["VIP", "New Customer", "Returning", "High Value", "Fleet", "Commercial"];
    const availableSuggestions = suggestedTags.filter(
        t => !(conversation.tags || []).includes(t.toLowerCase())
    );

    return (
        <div className="w-full bg-slate-50 border-l border-slate-200 flex flex-col h-full shrink-0 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 md:hidden"
                            onClick={onBack}
                        >
                            <ChevronRight className="h-5 w-5 rotate-180" />
                        </Button>
                    )}
                    <h3 className="font-semibold text-slate-900">Details</h3>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-4">
                    {/* Section A: Customer Info (Vehicle & Service) - MOVED TO TOP */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold text-sm text-slate-900">Customer Info</span>
                            </div>
                            {!isEditingVehicle && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => {
                                        // Split name into first/last for editing
                                        const names = (conversation.customerName || "").split(" ");
                                        setEditFirstName(names[0] || "");
                                        setEditLastName(names.slice(1).join(" ") || "");

                                        setEditVehicleYear(conversation.vehicleYear || "");
                                        setEditVehicleMake(conversation.vehicleMake || "");
                                        setEditVehicleModel(conversation.vehicleModel || "");
                                        setEditService(conversation.serviceRequested || "");
                                        setIsEditingVehicle(true);
                                    }}
                                >
                                    <Edit2 className="h-3 w-3 text-slate-400" />
                                </Button>
                            )}
                        </div>

                        {isEditingVehicle ? (
                            <div className="space-y-3">
                                {/* Name Editing */}
                                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">First Name</label>
                                        <Input
                                            value={editFirstName}
                                            onChange={(e) => setEditFirstName(e.target.value)}
                                            placeholder="John"
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Last Name</label>
                                        <Input
                                            value={editLastName}
                                            onChange={(e) => setEditLastName(e.target.value)}
                                            placeholder="Doe"
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Year</label>
                                        <Input
                                            value={editVehicleYear}
                                            onChange={(e) => setEditVehicleYear(e.target.value)}
                                            placeholder="2023"
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Make</label>
                                        <Input
                                            value={editVehicleMake}
                                            onChange={(e) => setEditVehicleMake(e.target.value)}
                                            placeholder="Toyota"
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Model</label>
                                        <Input
                                            value={editVehicleModel}
                                            onChange={(e) => setEditVehicleModel(e.target.value)}
                                            placeholder="Camry"
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Service Requested</label>
                                    <Input
                                        value={editService}
                                        onChange={(e) => setEditService(e.target.value)}
                                        placeholder="Oil change, brake inspection..."
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-8"
                                        onClick={() => setIsEditingVehicle(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1 h-8 bg-blue-600 hover:bg-blue-700"
                                        disabled={isSavingVehicle}
                                        onClick={async () => {
                                            if (onUpdateCustomerInfo) {
                                                setIsSavingVehicle(true);
                                                await onUpdateCustomerInfo(conversation.customerId, {
                                                    firstName: editFirstName || undefined,
                                                    lastName: editLastName || undefined,
                                                    vehicleYear: editVehicleYear || undefined,
                                                    vehicleMake: editVehicleMake || undefined,
                                                    vehicleModel: editVehicleModel || undefined,
                                                    serviceRequested: editService || undefined
                                                });
                                                setIsSavingVehicle(false);
                                                setIsEditingVehicle(false);
                                            }
                                        }}
                                    >
                                        {isSavingVehicle ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Customer Name */}
                                <div className="pb-3 border-b border-slate-100">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Customer</p>
                                    <p className="font-bold text-lg text-slate-900 whitespace-normal break-words">{conversation.customerName}</p>
                                    <p className="text-xs text-slate-500">{conversation.customerPhone}</p>
                                </div>

                                {/* Vehicle Info */}
                                {(conversation.vehicleYear || conversation.vehicleMake || conversation.vehicleModel) ? (
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Vehicle</p>
                                        <p className="font-medium text-slate-900 whitespace-normal break-words">
                                            {[conversation.vehicleYear, conversation.vehicleMake, conversation.vehicleModel].filter(Boolean).join(" ")}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs text-slate-400 italic">No vehicle info yet</p>
                                    </div>
                                )}

                                {/* Service Requested */}
                                {conversation.serviceRequested ? (
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <p className="text-[10px] uppercase tracking-wider text-blue-600 mb-1">Service Requested</p>
                                        <p className="text-sm text-blue-900 whitespace-normal break-words">{conversation.serviceRequested}</p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs text-slate-400 italic">No service info yet</p>
                                    </div>
                                )}

                                {/* LTV and Last Visit */}
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
                    </div>

                    {/* Section B: Active Ticket */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Ticket className="h-4 w-4 text-slate-600" />
                            <span className="font-semibold text-sm text-slate-900">Active Ticket</span>
                        </div>

                        {conversation.ticket ? (
                            <div className="space-y-3">
                                {/* Subject */}
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Subject</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-900 flex-1 whitespace-normal break-words">{conversation.ticket.subject}</span>
                                        <Button size="icon" variant="ghost" className="h-6 w-6">
                                            <Edit2 className="h-3 w-3 text-slate-400" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Status</label>
                                    <Select
                                        value={conversation.ticket.status}
                                        onValueChange={(val) => onUpdateTicket({ status: val as "open" | "waiting" | "resolved" })}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="open">Open</SelectItem>
                                            <SelectItem value="waiting">Waiting</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Priority */}
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Priority</label>
                                    <Select
                                        value={conversation.ticket.priority}
                                        onValueChange={(val) => onUpdateTicket({ priority: val as "low" | "normal" | "high" })}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
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
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Assignee</label>
                                    <Select
                                        value={conversation.ticket.assignee}
                                        onValueChange={(val) => onUpdateTicket({ assignee: val })}
                                    >
                                        <SelectTrigger className="h-8 text-xs border-slate-200 bg-slate-50">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                                                        {(teamMembers.find(m => m.user_id === conversation.ticket?.assignee || m.name === conversation.ticket?.assignee)?.name || conversation.ticket.assignee || "?").substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="truncate">
                                                    {teamMembers.find(m => m.user_id === conversation.ticket?.assignee || m.name === conversation.ticket?.assignee)?.name || conversation.ticket.assignee || "Unassigned"}
                                                </span>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned" className="text-slate-500 italic">Unassigned</SelectItem>
                                            {teamMembers.map(member => (
                                                <SelectItem key={member.id} value={member.user_id}>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                                                                {member.name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span>{member.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : (

                            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-6 text-center">
                                <div className="bg-white p-2 rounded-full w-fit mx-auto shadow-sm mb-3 border border-slate-100">
                                    <Ticket className="h-5 w-5 text-slate-400" />
                                </div>
                                <h4 className="text-sm font-medium text-slate-900 mb-1">No Active Ticket</h4>
                                <p className="text-xs text-slate-500 mb-4 max-w-[180px] mx-auto">
                                    Create a ticket to track resolution for this conversation.
                                </p>
                                <Button size="sm" onClick={onCreateTicket} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    Create Ticket
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Section B: Pipeline Status */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="h-4 w-4 text-slate-600" />
                            <span className="font-semibold text-sm text-slate-900">
                                {conversation.deal ? "In Pipeline" : "Pipeline"}
                            </span>
                        </div>

                        {conversation.deal ? (
                            /* Already in Pipeline - Show current stage and allow change */
                            <div className="space-y-3">
                                <p className="text-xs text-slate-500">
                                    This conversation is in your sales pipeline
                                </p>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Current Stage</label>
                                    <div className="flex gap-1 flex-wrap">
                                        {pipelineStages.map(stage => (
                                            <button
                                                key={stage.value}
                                                onClick={async () => {
                                                    setIsSending(true);
                                                    await onSendToPipeline(stage.value);
                                                    setIsSending(false);
                                                }}
                                                className={`px-2 py-1 rounded text-xs font-medium transition-all ${conversation.deal?.stage === stage.value
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                    }`}
                                            >
                                                {stage.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <a
                                    href="/pipeline"
                                    className="block text-center text-xs text-slate-500 hover:text-slate-700 underline mt-2"
                                >
                                    View in Pipeline →
                                </a>
                            </div>
                        ) : (
                            /* Not in Pipeline - Show add options */
                            <>
                                <p className="text-xs text-slate-500 mb-3">
                                    Add to your sales pipeline
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Pipeline Stage</label>
                                        <Select value={selectedStage} onValueChange={setSelectedStage}>
                                            <SelectTrigger className="h-9 text-sm bg-white border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {pipelineStages.map(stage => (
                                                    <SelectItem key={stage.value} value={stage.value}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                                                            {stage.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                                        onClick={handleSendToPipeline}
                                        disabled={isSending}
                                    >
                                        {isSending ? (
                                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</>
                                        ) : (
                                            <><ChevronRight className="h-4 w-4 mr-2" /> Add to Pipeline</>
                                        )}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Section C: Customer Tags */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Tag className="h-4 w-4 text-purple-600" />
                            <span className="font-semibold text-sm text-slate-900">Customer Tags</span>
                        </div>

                        {/* Current Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {(conversation.tags || []).length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No tags yet</p>
                            ) : (
                                (conversation.tags || []).map(tag => (
                                    <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="text-xs h-6 px-2 bg-purple-50 text-purple-700 border border-purple-200 group cursor-pointer hover:bg-purple-100"
                                    >
                                        {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                        <button
                                            onClick={() => handleRemoveTag(tag)}
                                            className="ml-1 opacity-50 hover:opacity-100"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))
                            )}
                        </div>

                        {/* Add New Tag */}
                        <div className="flex gap-2 mb-2">
                            <Input
                                placeholder="Add tag..."
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleAddTag(); }}
                                className="h-8 text-xs"
                            />
                            <Button
                                size="sm"
                                onClick={handleAddTag}
                                disabled={!newTag.trim() || isAddingTag}
                                className="h-8 px-3"
                            >
                                {isAddingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            </Button>
                        </div>

                        {/* Quick Add Suggestions */}
                        {availableSuggestions.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 mb-1.5">Quick add:</p>
                                <div className="flex flex-wrap gap-1">
                                    {availableSuggestions.slice(0, 4).map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => onUpdateTags(conversation.customerId, [...(conversation.tags || []), tag.toLowerCase()])}
                                            className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 transition-colors"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>



                    {/* Section D: History */}
                    {
                        conversation.pastTickets && conversation.pastTickets.length > 0 && (
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
                        )
                    }
                </div >
            </ScrollArea >
        </div >
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
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    useEffect(() => {
        // Fetch team members
        fetch("/api/team")
            .then(res => res.json())
            .then(data => {
                if (data.members) {
                    setTeamMembers(data.members);
                }
            })
            .catch(err => console.error("Failed to fetch team", err));
    }, []);

    // Real-time subscriptions for new messages and calls
    useEffect(() => {
        const supabase = createClient();

        // Subscribe to new SMS messages
        const messagesChannel = supabase
            .channel('service-desk-messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `merchant_id=eq.${merchantId}`
                },
                (payload) => {
                    const newMessage = payload.new as any;
                    console.log('[ServiceDesk] New message received:', newMessage);

                    // Find or create conversation for this phone number
                    setConversations(prev => {
                        const phone = newMessage.customer_phone || newMessage.contact_phone;
                        if (!phone) return prev;

                        const existingConvoIndex = prev.findIndex(c => c.customerPhone === phone);
                        const msgData: Message = {
                            id: newMessage.id,
                            type: newMessage.direction === 'outbound' ? 'agent' : 'customer',
                            content: newMessage.body || '',
                            sender: newMessage.direction === 'outbound' ? 'Shop' : 'Customer',
                            timestamp: newMessage.created_at
                        };

                        if (existingConvoIndex >= 0) {
                            // Add message to existing conversation
                            const updated = [...prev];
                            updated[existingConvoIndex] = {
                                ...updated[existingConvoIndex],
                                messages: [...updated[existingConvoIndex].messages, msgData],
                                lastMessageAt: newMessage.created_at,
                                unread: newMessage.direction === 'inbound'
                            };
                            // Re-sort by most recent
                            return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
                        } else {
                            // Create new conversation
                            const newConvo: Conversation = {
                                id: `convo-${phone}`,
                                customerId: newMessage.customer_id || `cust-${phone}`,
                                customerName: 'Unknown',
                                customerPhone: phone,
                                messages: [msgData],
                                unread: newMessage.direction === 'inbound',
                                lastMessageAt: newMessage.created_at
                            };
                            return [newConvo, ...prev];
                        }
                    });

                    // Show toast for inbound messages
                    if (newMessage.direction === 'inbound') {
                        toast.info('📱 New SMS received', {
                            description: newMessage.body?.substring(0, 50) || 'New message'
                        });
                    }
                }
            )
            .subscribe();

        // Subscribe to new call logs
        const callsChannel = supabase
            .channel('service-desk-calls')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'call_logs',
                    filter: `merchant_id=eq.${merchantId}`
                },
                (payload) => {
                    const newCall = payload.new as any;
                    console.log('[ServiceDesk] New call received:', newCall);

                    const phone = newCall.customer_phone;
                    if (!phone) return;

                    setConversations(prev => {
                        const existingConvoIndex = prev.findIndex(c => c.customerPhone === phone);
                        const callMsg: Message = {
                            id: newCall.id,
                            type: 'system',
                            content: `📞 Call ${newCall.direction === 'inbound' ? 'received' : 'made'}`,
                            sender: newCall.direction === 'inbound' ? 'Customer' : 'Shop',
                            timestamp: newCall.created_at,
                            callSummary: newCall.summary,
                            callTranscript: newCall.transcript
                        };

                        if (existingConvoIndex >= 0) {
                            const updated = [...prev];
                            updated[existingConvoIndex] = {
                                ...updated[existingConvoIndex],
                                messages: [...updated[existingConvoIndex].messages, callMsg],
                                lastMessageAt: newCall.created_at,
                                unread: newCall.direction === 'inbound'
                            };
                            return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
                        } else {
                            const newConvo: Conversation = {
                                id: `convo-${phone}`,
                                customerId: newCall.customer_id || `cust-${phone}`,
                                customerName: 'Unknown Caller',
                                customerPhone: phone,
                                messages: [callMsg],
                                unread: newCall.direction === 'inbound',
                                lastMessageAt: newCall.created_at
                            };
                            return [newConvo, ...prev];
                        }
                    });

                    // Show toast for new calls
                    toast.info(`📞 ${newCall.direction === 'inbound' ? 'Incoming' : 'Outgoing'} call logged`, {
                        description: newCall.summary?.substring(0, 50) || `Call with ${phone}`
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messagesChannel);
            supabase.removeChannel(callsChannel);
        };
    }, [merchantId]);

    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [view, setView] = useState<'queue' | 'chat' | 'details'>('queue');

    // Automatically switch to chat view on desktop/tablet when a convo is selected if we were stuck
    useEffect(() => {
        if (selectedConvo && view === 'queue' && window.innerWidth >= 768) {
            setView('chat');
        }
    }, [selectedConvo]);

    // Sync selectedConvo with updated data from conversations array (for real-time updates)
    useEffect(() => {
        if (selectedConvo) {
            const updated = conversations.find(c => c.id === selectedConvo.id || c.customerPhone === selectedConvo.customerPhone);
            if (updated && updated.messages.length !== selectedConvo.messages.length) {
                setSelectedConvo(updated);
            }
        }
    }, [conversations, selectedConvo?.id, selectedConvo?.customerPhone]);

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

    const handleUpdateTags = async (customerId: string, tags: string[]) => {
        try {
            const response = await fetch("/api/customers/tags", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customerId, tags })
            });

            if (response.ok) {
                // Update local state
                setConversations(prev => prev.map(c =>
                    c.customerId === customerId ? { ...c, tags } : c
                ));
                setSelectedConvo(prev =>
                    prev?.customerId === customerId ? { ...prev, tags } : prev
                );
                toast.success("Tags updated");
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to update tags");
            }
        } catch (error: any) {
            toast.error("Failed to update tags");
        }
    };

    const handleSendMessage = async (content: string, isInternal: boolean) => {
        if (!selectedConvo) return;

        // For internal notes, just save locally (or to comments API if you have one)
        if (isInternal) {
            const newMsg: Message = {
                id: `m-${Date.now()}`,
                type: "internal",
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
            toast.success("Note added");
            return;
        }

        // For external messages, send via SMS API
        try {
            const res = await fetch("/api/sms/reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: selectedConvo.customerPhone,
                    message: content.trim()
                })
            });

            const result = await res.json();

            if (!res.ok || !result.success) {
                throw new Error(result.error || "Failed to send SMS");
            }

            // Update local state on success
            const newMsg: Message = {
                id: `m-${Date.now()}`,
                type: "agent",
                content: content.trim(),
                sender: "You",
                timestamp: new Date().toISOString()
            };
            setConversations(prev => prev.map(c =>
                c.id === selectedConvo.id
                    ? { ...c, messages: [...c.messages, newMsg], lastMessageAt: newMsg.timestamp }
                    : c
            ));
            setSelectedConvo(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : null);
            toast.success("SMS sent!");

        } catch (error: any) {
            console.error("Failed to send SMS:", error);
            toast.error(error.message || "Failed to send SMS");
        }
    };

    const handleSendToPipeline = async (stage: string) => {
        if (!selectedConvo) return;

        try {
            // Check if deal already exists - use PATCH to update, otherwise POST to create
            const dealExists = selectedConvo.deal?.id;

            const response = await fetch("/api/deals", {
                method: dealExists ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    dealExists
                        ? { id: selectedConvo.deal?.id, status: stage }
                        : {
                            customerId: selectedConvo.customerId,
                            customerName: selectedConvo.customerName,
                            customerPhone: selectedConvo.customerPhone,
                            title: `Deal with ${selectedConvo.customerName}`,
                            description: `From service desk conversation`,
                            status: stage,
                            vehicleYear: selectedConvo.vehicle?.year,
                            vehicleMake: selectedConvo.vehicle?.make,
                            vehicleModel: selectedConvo.vehicle?.model,
                            value: 0,
                            source: "service_desk"
                        }
                )
            });

            if (response.ok) {
                const data = await response.json();
                const stageLabel = stage.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                toast.success(dealExists
                    ? `Stage updated to "${stageLabel}"`
                    : `Added to pipeline as "${stageLabel}"`
                );

                // Update conversation with deal info
                const dealInfo = {
                    id: data.deal?.id || selectedConvo.deal?.id,
                    title: `Deal`,
                    stage: stage as DealInfo["stage"],
                    value: 0
                };

                // Add system message only for new deals
                if (!dealExists) {
                    const systemMsg: Message = {
                        id: `m-${Date.now()}`,
                        type: "system",
                        content: `📋 Added to Pipeline: ${stage.replace(/_/g, " ")}`,
                        timestamp: new Date().toISOString()
                    };
                    setConversations(prev => prev.map(c =>
                        c.id === selectedConvo.id
                            ? { ...c, messages: [...c.messages, systemMsg], deal: dealInfo }
                            : c
                    ));
                    setSelectedConvo(prev => prev ? { ...prev, messages: [...prev.messages, systemMsg], deal: dealInfo } : null);
                } else {
                    // Just update the deal stage
                    setConversations(prev => prev.map(c =>
                        c.id === selectedConvo.id
                            ? { ...c, deal: dealInfo }
                            : c
                    ));
                    setSelectedConvo(prev => prev ? { ...prev, deal: dealInfo } : null);
                }
            } else {
                const error = await response.json();
                toast.error(`Failed: ${error.error}`);
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        }
    };

    const handleUpdateCustomerInfo = async (customerId: string, updates: { firstName?: string; lastName?: string; vehicleYear?: string; vehicleMake?: string; vehicleModel?: string; serviceRequested?: string }) => {
        try {
            const response = await fetch("/api/customers/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId,
                    first_name: updates.firstName,
                    last_name: updates.lastName,
                    vehicle_year: updates.vehicleYear,
                    vehicle_make: updates.vehicleMake,
                    vehicle_model: updates.vehicleModel,
                    service_requested: updates.serviceRequested
                })
            });

            if (response.ok) {
                // Update local state
                setConversations(prev => prev.map(c =>
                    c.customerId === customerId ? {
                        ...c,
                        customerName: (updates.firstName || updates.lastName)
                            ? `${updates.firstName || c.customerName.split(' ')[0]} ${updates.lastName || c.customerName.split(' ').slice(1).join(' ')}`.trim()
                            : c.customerName,
                        vehicleYear: updates.vehicleYear || c.vehicleYear,
                        vehicleMake: updates.vehicleMake || c.vehicleMake,
                        vehicleModel: updates.vehicleModel || c.vehicleModel,
                        serviceRequested: updates.serviceRequested || c.serviceRequested
                    } : c
                ));
                setSelectedConvo(prev =>
                    prev?.customerId === customerId ? {
                        ...prev,
                        customerName: (updates.firstName || updates.lastName)
                            ? `${updates.firstName || prev.customerName.split(' ')[0]} ${updates.lastName || prev.customerName.split(' ').slice(1).join(' ')}`.trim()
                            : prev.customerName,
                        vehicleYear: updates.vehicleYear || prev.vehicleYear,
                        vehicleMake: updates.vehicleMake || prev.vehicleMake,
                        vehicleModel: updates.vehicleModel || prev.vehicleModel,
                        serviceRequested: updates.serviceRequested || prev.serviceRequested
                    } : prev
                );
                toast.success("Customer info updated");
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to update customer info");
            }
        } catch (error: any) {
            toast.error("Failed to update customer info");
        }
    };

    return (
        <div className="h-full w-full flex overflow-hidden bg-slate-100">
            {/* Queue Pane */}
            <div className={cn(
                "h-full shrink-0 border-r border-slate-200 md:w-72 md:flex",
                view === 'queue' ? 'flex' : 'hidden md:flex'
            )}>
                <UnifiedQueue
                    conversations={conversations}
                    selectedId={selectedConvo?.id || null}
                    onSelect={(c) => {
                        setSelectedConvo(c);
                        setView('chat');
                    }}
                    filter={filter}
                    onFilterChange={setFilter}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />
            </div>

            {/* Chat Pane */}
            <div className={cn(
                "h-full flex-1 min-w-0 md:flex flex-col bg-white",
                view === 'chat' ? 'flex' : 'hidden md:flex'
            )}>
                <ActionStream
                    conversation={selectedConvo}
                    onSendMessage={handleSendMessage}
                    onCreateTicket={handleCreateTicket}
                    onTogglePanel={() => {
                        if (window.innerWidth < 768) {
                            setView('details');
                        } else {
                            setIsPanelOpen(!isPanelOpen);
                        }
                    }}
                    isPanelOpen={isPanelOpen}
                    onBack={() => setView('queue')}
                    onShowDetails={() => setView('details')}
                />
            </div>

            {/* Details Pane */}
            {(view === 'details' || isPanelOpen) && (
                <div className={cn(
                    "h-full shrink-0 border-l border-slate-200 flex flex-col overflow-hidden",
                    view === 'details' ? 'w-full' : 'hidden md:flex md:w-80'
                )}>
                    <ContextPanel
                        conversation={selectedConvo}
                        isOpen={isPanelOpen}
                        onClose={() => {
                            setIsPanelOpen(false);
                            if (view === 'details') setView('chat');
                        }}
                        onUpdateTicket={handleUpdateTicket}
                        onCreateTicket={handleCreateTicket}
                        onSendToPipeline={handleSendToPipeline}
                        onUpdateTags={handleUpdateTags}
                        onUpdateCustomerInfo={handleUpdateCustomerInfo}
                        teamMembers={teamMembers}
                        onBack={() => setView('chat')}
                    />
                </div>
            )}
        </div>
    );
}
