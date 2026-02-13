"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
    Search, Phone, Mail, MessageSquare, CheckCircle2,
    MoreHorizontal, Send, Mic, Clock, Loader2, Bot, Archive, Sparkles, BookOpen,
    Pencil, Check, X, Plus, Link2, ChevronDown, ChevronUp, ExternalLink, Copy, CalendarPlus,
    ArrowLeft, Ticket
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
    onResolve: () => void;
    onClose: () => void;
    messages: any[];
}

// Mock activity data - in real app this would come from database
interface ActivityItem {
    id: string;
    type: 'survey' | 'payment' | 'call' | 'note' | 'status_change' | 'assignment' | 'message';
    title: string;
    description?: string;
    time: string;
    user?: string;
    icon?: string;
}

function LeadContextPanel({ contact, merchantId, onUpdate, onResolve, onClose, messages }: LeadContextPanelProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
    const [status, setStatus] = useState(contact.status || 'new_lead');
    const [newTag, setNewTag] = useState('');
    const [localTags, setLocalTags] = useState<string[]>(contact.tags || []);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [customerData, setCustomerData] = useState<any>(null);
    const [isTraining, setIsTraining] = useState(false);

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
                        setLocalTags(data.tags || contact.tags || []);
                        setStatus(data.status || contact.status || 'new_lead');
                    }
                });
        }
    }, [contact.customer_id]);

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

    const getStatusConfig = (s: string) => {
        switch (s) {
            case 'new_lead': return { label: 'New', color: 'text-slate-500' };
            case 'qualifying': return { label: 'Qualifying', color: 'text-slate-600' };
            case 'conversation': return { label: 'Conversation', color: 'text-slate-700' };
            case 'booked': return { label: 'Booked', color: 'text-slate-900' };
            case 'lost': return { label: 'Lost', color: 'text-slate-400' };
            default: return { label: 'New', color: 'text-slate-500' };
        }
    };

    // Generate mock recent activity based on messages
    const recentActivity: ActivityItem[] = [
        { id: '1', type: 'survey', title: 'Completed Feedback Survey', time: '59m', icon: '📋' },
        { id: '2', type: 'payment', title: '$149.00 payment received', time: '2d', icon: '💳' },
        { id: '3', type: 'call', title: 'Missed call', time: '3d', icon: '📞' },
    ];

    // Generate mock activity timeline
    const activityTimeline = {
        today: [
            { id: 't1', type: 'status_change', title: `Rita moved ${contact.display_name} to`, description: '🎯 Qualifying', time: 'just now', user: 'Rita' },
            { id: 't2', type: 'assignment', title: `${contact.display_name} was assigned to Rita`, time: 'just now' },
            { id: 't3', type: 'survey', title: 'Completed Feedback Survey', description: 'Left positive feedback', time: '59m', user: 'Aura Medical Spa' },
            { id: 't4', type: 'note', title: 'Mai made a note', description: 'Last time Will came in, we didn\'t have the...', time: '1h', user: 'Aura Medical Spa' },
        ],
        '2_days_ago': [
            { id: 'd1', type: 'payment', title: '$149.00 payment received', description: 'Invoice 12345', time: '2d', user: 'Aura Medical Spa' },
            { id: 'd2', type: 'assignment', title: 'Steve was assigned to Jane', time: '59m' },
            { id: 'd3', type: 'note', title: 'Elena made a note', description: 'Last time Will came in, we didn\'t have the...', time: '2d', user: 'Aura Medical Spa' },
            { id: 'd4', type: 'message', title: `${contact.display_name}`, description: 'New lead from Squarespace', time: '2d', user: 'Aura Medical Spa' },
        ]
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'survey': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"><CheckCircle2 className="h-4 w-4" /></div>;
            case 'payment': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"><span className="text-sm">💳</span></div>;
            case 'call': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"><Phone className="h-4 w-4" /></div>;
            case 'note': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"><Pencil className="h-4 w-4" /></div>;
            case 'status_change': return <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700"><span className="text-sm">⚡</span></div>;
            case 'assignment': return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"><span className="text-sm">👤</span></div>;
            case 'message': return <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700"><MessageSquare className="h-4 w-4" /></div>;
            default: return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"><Clock className="h-4 w-4" /></div>;
        }
    };

    // Visible tags (max 4) with overflow indicator
    const visibleTags = localTags.slice(0, 4);
    const overflowCount = localTags.length - 4;

    return (
        <div className="w-[320px] border-l border-slate-200 bg-white text-slate-900 hidden xl:flex flex-col shrink-0 h-full min-h-0 overflow-hidden">
            {/* HEADER */}
            <div className="p-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-lg bg-slate-900 text-white font-bold">
                            {contact.display_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="font-semibold text-base text-slate-900">{contact.display_name}</h2>
                        <p className="text-xs text-slate-500">{contact.contact_point}</p>
                    </div>
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* RECENT ACTIVITY SUMMARY */}
            <div className="px-4 pb-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Recent Activity</p>
                {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-2 text-xs">
                        <span>{activity.icon}</span>
                        <span className="text-slate-700">{activity.title}</span>
                        <span className="text-slate-400 ml-auto">{activity.time}</span>
                    </div>
                ))}
            </div>

            {/* ACTION BUTTONS */}
            <div className="px-4 py-3 flex items-center justify-center gap-2 border-t border-b border-slate-200">
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-200">
                    <Phone className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-200">
                    <MessageSquare className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-200">
                    <Mail className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-200">
                    <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-200">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </div>

            {/* TABS */}
            <div className="px-4 pt-3">
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === 'details' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Details
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === 'activity' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Activity
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {activeTab === 'details' ? (
                    <div className="p-4 space-y-4">
                        {/* STATUS */}
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</p>
                            <Select value={status} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-full h-9 text-sm bg-white border-slate-300 text-slate-900">
                                    <div className="flex items-center gap-2">
                                        <span className={getStatusConfig(status).color}>⭐</span>
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200">
                                    <SelectItem value="new_lead">New</SelectItem>
                                    <SelectItem value="qualifying">Qualifying</SelectItem>
                                    <SelectItem value="conversation">Conversation</SelectItem>
                                    <SelectItem value="booked">Booked</SelectItem>
                                    <SelectItem value="lost">Lost</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* NAME */}
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Name</p>
                            <p className="text-sm">{contact.display_name}</p>
                        </div>

                        {/* PHONE */}
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</p>
                            <p className="text-sm">{contact.contact_point}</p>
                        </div>

                        {/* EMAIL */}
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</p>
                            <p className="text-sm">{customerData?.email || 'Not provided'}</p>
                        </div>

                        {/* CARD ON FILE */}
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Card on File</p>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">VISA</div>
                                <span>Visa •••• 1234</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Expires 12/28</p>
                        </div>

                        {/* TAGS */}
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tags</p>
                            <div className="flex flex-wrap gap-1.5">
                                {visibleTags.length > 0 ? (
                                    <>
                                        {visibleTags.map((tag, i) => (
                                            <Badge
                                                key={i}
                                                variant="secondary"
                                                className="px-2 py-0.5 text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                                                onClick={() => handleRemoveTag(tag)}
                                            >
                                                {tag}
                                            </Badge>
                                        ))}
                                        {overflowCount > 0 && (
                                            <Badge variant="secondary" className="px-2 py-0.5 text-xs bg-slate-300 text-slate-600">
                                                +{overflowCount}
                                            </Badge>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-xs text-slate-500">No tags</span>
                                )}
                            </div>
                            <div className="flex gap-1 mt-2">
                                <Input
                                    placeholder="Add tag..."
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                    className="h-7 text-xs bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-slate-500 hover:text-slate-900" onClick={handleAddTag}>
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        {/* MEMBERSHIP */}
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Membership ⓘ</p>
                            <Select defaultValue="diamond">
                                <SelectTrigger className="w-full h-8 text-sm bg-white border-slate-300 text-slate-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200">
                                    <SelectItem value="diamond">Diamond Care Member</SelectItem>
                                    <SelectItem value="gold">Gold Member</SelectItem>
                                    <SelectItem value="silver">Silver Member</SelectItem>
                                    <SelectItem value="none">No Membership</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* FAVORITE SERVICES */}
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Favorite Services</p>
                            <p className="text-sm">Facial Botox, Red Light Therapy</p>
                        </div>

                        {/* BIRTHDAY */}
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Birthday</p>
                            <p className="text-sm">{customerData?.birthday || 'January 10'}</p>
                        </div>

                        {/* ALLERGIES */}
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Allergies</p>
                            <p className="text-sm">{customerData?.allergies || 'None listed'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-4">
                        {/* ACTIVITY TIMELINE HEADER */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm text-slate-900">Activity Timeline</h3>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-slate-900">
                                <ExternalLink className="h-3 w-3" />
                            </Button>
                        </div>

                        {/* TODAY SECTION */}
                        <div className="mb-6">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Today ({activityTimeline.today.length})</p>
                            <div className="space-y-3">
                                {activityTimeline.today.map((item) => (
                                    <div key={item.id} className="flex gap-3">
                                        {getActivityIcon(item.type)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                                                <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                                            </div>
                                            {item.description && (
                                                <p className="text-xs text-slate-500 truncate">{item.description}</p>
                                            )}
                                            {item.user && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Avatar className="h-4 w-4">
                                                        <AvatarFallback className="text-[8px] bg-slate-300 text-slate-700">{item.user[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-[10px] text-slate-400">{item.user}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2 DAYS AGO SECTION */}
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">2 Days Ago ({activityTimeline['2_days_ago'].length})</p>
                            <div className="space-y-3">
                                {activityTimeline['2_days_ago'].map((item) => (
                                    <div key={item.id} className="flex gap-3">
                                        {getActivityIcon(item.type)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                                                <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                                            </div>
                                            {item.description && (
                                                <p className="text-xs text-slate-500 truncate">{item.description}</p>
                                            )}
                                            {item.user && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Avatar className="h-4 w-4">
                                                        <AvatarFallback className="text-[8px] bg-slate-300 text-slate-700">{item.user[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-[10px] text-slate-400">{item.user}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* BOTTOM ACTION BUTTONS */}
            <div className="p-3 border-t border-slate-200 space-y-2">
                <Button
                    className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm"
                    onClick={onResolve}
                >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve Conversation
                </Button>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1 gap-1.5 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 h-8 text-xs"
                        onClick={async () => {
                            const sortedMsgs = [...messages].sort((a, b) =>
                                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                            );
                            const lastInbound = [...sortedMsgs].reverse().find(m => m.direction === 'inbound');
                            const lastOutbound = [...sortedMsgs].reverse().find(m => m.direction === 'outbound');

                            if (!lastInbound || !lastOutbound) {
                                toast.error("Need both a customer question and your reply to train AI");
                                return;
                            }

                            setIsTraining(true);
                            try {
                                const res = await fetch("/api/kb/train", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        merchantId,
                                        customerQuestion: lastInbound.content || lastInbound.body,
                                        merchantAnswer: lastOutbound.content || lastOutbound.body
                                    })
                                });

                                if (res.ok) {
                                    const data = await res.json();
                                    toast.success(`📚 AI trained! Article: "${data.article?.title}"`);
                                } else {
                                    throw new Error("Failed to train");
                                }
                            } catch (error) {
                                toast.error("Failed to train AI");
                            } finally {
                                setIsTraining(false);
                            }
                        }}
                        disabled={isTraining}
                    >
                        {isTraining ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3" />}
                        Train AI
                    </Button>

                    <Button
                        variant="outline"
                        className="flex-1 gap-1.5 border-slate-300 text-slate-600 hover:bg-slate-200 hover:text-slate-900 h-8 text-xs"
                        onClick={() => setIsSheetOpen(true)}
                    >
                        <ExternalLink className="h-3 w-3" />
                        Full Profile
                    </Button>
                </div>

                {/* Create Ticket Button */}
                <Button
                    variant="outline"
                    className="w-full gap-2 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 h-9 text-sm"
                    onClick={async () => {
                        try {
                            const lastInbound = [...messages].reverse().find(m => m.direction === 'inbound');
                            const ticketTitle = lastInbound?.content?.substring(0, 100) || `Support request from ${contact.display_name}`;

                            const res = await fetch("/api/tickets", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    title: ticketTitle,
                                    description: `Conversation converted to ticket.\n\nCustomer: ${contact.display_name}\nContact: ${contact.contact_point}\nChannel: ${contact.last_channel}`,
                                    customer_id: contact.customer_id,
                                    source: contact.last_channel || 'chat',
                                    priority: 'medium'
                                })
                            });

                            if (res.ok) {
                                toast.success("Ticket created! View in Tickets page.");
                            } else {
                                throw new Error("Failed to create ticket");
                            }
                        } catch (error) {
                            toast.error("Failed to create ticket");
                        }
                    }}
                >
                    <Ticket className="h-4 w-4" />
                    Create Ticket
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
    const [showSidebar, setShowSidebar] = useState(true);
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
        if (filter === 'needs_attention') {
            // Don't show resolved conversations in Needs Attention
            if (c.status === 'resolved') return false;

            // Show in Needs Attention if:
            // 1. Status is needs_attention
            // 2. Has the 'needs_human' tag (AI handed off)
            return c.status === 'needs_attention' ||
                c.tags?.includes('needs_human');
        }
        // All Messages shows everything
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

    const handleResolve = async () => {
        if (!selectedContact) return;

        // Update local state immediately
        setConversations(prev => prev.map(c =>
            c.customer_id === selectedContact.customer_id
                ? { ...c, status: 'resolved', tags: c.tags?.filter(t => t !== 'needs_human') || [] }
                : c
        ));

        // Persist to database - update customer status and remove needs_human tag
        try {
            // Try to find customer by ID first, then by phone/email
            let { data: customer } = await supabase
                .from('customers')
                .select('id, tags')
                .eq('id', selectedContact.customer_id)
                .single();

            // If not found by ID, try by phone number or email
            if (!customer) {
                const { data: customerByContact } = await supabase
                    .from('customers')
                    .select('id, tags')
                    .or(`phone_number.eq.${selectedContact.contact_point},email.eq.${selectedContact.contact_point}`)
                    .single();
                customer = customerByContact;
            }

            if (customer) {
                const currentTags = customer.tags || [];
                const updatedTags = currentTags.filter((t: string) => t !== 'needs_human');

                const { error } = await supabase
                    .from('customers')
                    .update({
                        status: 'resolved',
                        tags: updatedTags
                    })
                    .eq('id', customer.id);

                if (error) {
                    console.error("Update error:", error);
                } else {
                    toast.success("Conversation resolved");
                }
            } else {
                console.log("No customer found for:", selectedContact.customer_id, selectedContact.contact_point);
                toast.success("Conversation resolved locally");
            }
        } catch (error) {
            console.error("Failed to persist resolve status:", error);
            toast.success("Conversation resolved locally");
        }

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
        <div className="flex h-full bg-white border-t overflow-hidden">

            {/* --- COLUMN 1: CONVERSATION LIST --- */}
            {/* On mobile: hide when a contact is selected. On desktop: always show */}
            <div className={`
                w-full md:w-[350px] border-r flex flex-col bg-slate-50/50 shrink-0 h-full overflow-hidden
                ${selectedContact ? 'hidden md:flex' : 'flex'}
            `}>
                {/* Header Section */}
                <div className="p-4 space-y-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-lg">Inbox</h2>
                        <div className="flex items-center gap-2">
                            <div
                                className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium transition-colors
                                    ${aiEnabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
                            >
                                <Sparkles className="h-3 w-3" />
                                <span>AI Auto Reply</span>
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
                                    className="h-4 w-7 data-[state=checked]:bg-slate-900"
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

                {/* Scrollable Conversations List */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        {filteredConversations.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <MessageSquare className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                                <p>No {filter === 'needs_attention' ? 'new' : ''} conversations</p>
                            </div>
                        ) : (
                            filteredConversations.map((convo) => (
                                <div
                                    key={convo.customer_id}
                                    onClick={() => {
                                        setSelectedContact(convo);
                                        setShowSidebar(true);
                                    }}
                                    className={`
                                    p-4 border-b cursor-pointer transition-colors hover:bg-slate-100
                                    ${selectedContact?.customer_id === convo.customer_id ? 'bg-slate-100 border-l-4 border-l-slate-900' : 'border-l-4 border-l-transparent'}
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
                                        p-1 rounded
                                        ${convo.last_channel === 'sms' ? 'bg-slate-200 text-slate-600' : convo.last_channel === 'email' ? 'bg-slate-200 text-slate-600' : convo.last_channel === 'widget' ? 'bg-slate-300 text-slate-700' : 'bg-slate-200 text-slate-600'}
                                    `}>
                                            {getIcon(convo.last_channel)}
                                        </div>
                                        <p className={`truncate flex-1 ${convo.status === 'needs_attention' ? 'font-medium text-slate-700' : ''}`}>
                                            {convo.last_message_preview}
                                        </p>
                                        {convo.tags?.includes('needs_human') && (
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 animate-pulse bg-slate-900 text-white border-0">
                                                🙋 Needs You
                                            </Badge>
                                        )}
                                        {convo.status === 'needs_attention' && (
                                            <div className="h-2 w-2 rounded-full bg-slate-900 shrink-0" />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </ScrollArea>
                </div>
            </div>

            {/* --- COLUMN 2: CHAT THREAD --- */}
            {/* On mobile: show only when contact selected (full screen). On desktop: always show */}
            <div className={`
                flex-1 flex flex-col bg-white min-w-0 h-full overflow-hidden
                ${selectedContact ? 'flex' : 'hidden md:flex'}
            `}>
                {selectedContact ? (
                    <>
                        {/* Header */}
                        <div className="h-16 border-b flex items-center justify-between px-4 md:px-6 shrink-0">
                            <div className="flex items-center gap-3">
                                {/* Back button - mobile only */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden h-8 w-8 mr-1"
                                    onClick={() => setSelectedContact(null)}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <Avatar>
                                    <AvatarFallback>{selectedContact.display_name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-sm">{selectedContact.display_name}</h3>
                                    <p className="text-xs text-muted-foreground">{selectedContact.contact_point}</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-50/30">
                            <div className="space-y-6 pb-4">
                                {messages.map((msg, idx) => (
                                    <div key={msg.id || idx} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`
                                            max-w-[80%] rounded-xl p-4 text-sm shadow-sm
                                            ${msg.channel === 'call' ? 'w-full max-w-md bg-white border border-slate-200' : ''}
                                            ${msg.channel !== 'call' && msg.direction === 'outbound' ? 'bg-slate-900 text-white rounded-tr-none' : ''}
                                            ${msg.channel !== 'call' && msg.direction === 'inbound' ? 'bg-white border border-slate-200 rounded-tl-none' : ''}
                                        `}>

                                            {/* CALL BANNER */}
                                            {msg.channel === 'call' && (
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-slate-100 p-2 rounded-full">
                                                        <Phone className="h-4 w-4 text-slate-600" />
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

                                            <div className={`text-[10px] mt-1 text-right ${msg.direction === 'outbound' && msg.channel !== 'call' ? 'text-slate-300' : 'text-slate-400'}`}>
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
                                <Button size="icon" className="absolute right-1 top-1 h-10 w-10 bg-slate-900 hover:bg-slate-800" onClick={handleSendMessage} disabled={isSending}>
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
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                                    >
                                        {isGeneratingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
                                        <span>Quick Book</span>
                                    </button>
                                    <button
                                        onClick={() => setTrainAi(!trainAi)}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all
                                            ${trainAi
                                                ? 'bg-slate-900 text-white ring-1 ring-slate-700'
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
            {
                selectedContact && showSidebar && (
                    <LeadContextPanel
                        contact={selectedContact}
                        merchantId={merchantId}
                        messages={messages}
                        onResolve={handleResolve}
                        onClose={() => setShowSidebar(false)}
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
                )
            }

        </div >
    );
}