"use client";

import { useState } from "react";
import {
    Phone,
    MessageSquare,
    CalendarX,
    PhoneMissed,
    Clock,
    CheckCircle2,
    XCircle,
    MoreHorizontal,
    Search,
    Flame,
    UserX,
    RefreshCw,
    DollarSign,
    Sparkles,
    Target,
    PhoneOutgoing,
    Check,
    BellOff,
    Eye,
    ChevronDown,
    ChevronRight,
    Zap,
    TrendingUp,
    AlertTriangle,
    Car,
    Filter,
    ArrowUpRight,
    SearchX
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCall } from "@/components/call-context";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============= TYPES =============
interface ActionItem {
    id: string;
    name: string;
    phone: string;
    vehicle?: string;
    tags: string[];
    type: "missed_call" | "unbooked_lead" | "cancellation" | "no_show" | "reactivation" | "follow_up";
    priority: "urgent" | "high" | "medium" | "low";
    reason: string;
    context: string;
    value: number;
    timeAgo: string;
    customerData?: {
        lastVisit?: string;
        totalSpend?: number;
        visits?: number;
        openDeal?: { service: string; value: number; stage: string };
        notes?: string;
    };
}

// ============= MOCK ACTIONS =============
const MOCK_ACTIONS: ActionItem[] = [
    {
        id: "a1", name: "Sarah Miller", phone: "+1 604-555-1234",
        vehicle: "2020 Toyota RAV4", tags: ["Warm Lead"], type: "missed_call", priority: "urgent",
        reason: "Missed inbound call — tried calling back, no answer",
        context: "Called about brake squeaking noise. First-time caller from Google Ads.",
        value: 0, timeAgo: "45 min ago",
        customerData: { notes: "Found us via Google. Mentioned brake noise at low speeds." }
    },
    {
        id: "a2", name: "Mike Ross", phone: "+1 604-555-5678",
        vehicle: "2019 Honda Civic", tags: ["Cancelled Today"], type: "cancellation", priority: "urgent",
        reason: "Cancelled 3:00 PM appointment — \"something came up\"",
        context: "Had a $420 brake pad replacement scheduled. Confirmed yesterday via SMS.",
        value: 420, timeAgo: "1 hour ago",
        customerData: { lastVisit: "2 months ago", totalSpend: 1200, visits: 4, openDeal: { service: "Brake Pad Replacement", value: 420, stage: "Booked → Cancelled" }, notes: "Reliable customer. Usually responds to rescheduling offers." }
    },
    {
        id: "a3", name: "Harvey Specter", phone: "+1 604-555-9012",
        vehicle: "2022 BMW 530i", tags: ["VIP", "No-Show"], type: "no_show", priority: "urgent",
        reason: "No-show for 10:00 AM oil change + inspection",
        context: "Confirmed yesterday. This is his 3rd visit. High lifetime value.",
        value: 350, timeAgo: "3 hours ago",
        customerData: { lastVisit: "3 months ago", totalSpend: 4800, visits: 6, openDeal: { service: "Oil Change + Full Inspection", value: 350, stage: "Booked → No Show" }, notes: "VIP customer. Very busy schedule. Offer flexible rescheduling." }
    },
    {
        id: "a4", name: "Jessica Pearson", phone: "+1 604-555-3456",
        vehicle: "2021 Mercedes GLC 300", tags: ["Price Concern"], type: "unbooked_lead", priority: "high",
        reason: "Requested quote for timing belt — hasn't booked yet",
        context: "Called 3 days ago. Seemed interested but said she'd \"think about it.\" Quote: $1,200.",
        value: 1200, timeAgo: "3 days ago",
        customerData: { lastVisit: undefined, totalSpend: 0, visits: 0, openDeal: { service: "Timing Belt Replacement", value: 1200, stage: "Quote Sent" }, notes: "First-time customer. Comparing prices. Offer price match guarantee." }
    },
    {
        id: "a5", name: "Rachel Zane", phone: "+1 604-555-7890",
        vehicle: "2023 Audi Q5", tags: ["Follow-Up"], type: "follow_up", priority: "high",
        reason: "Diagnosis complete — needs approval for transmission service",
        context: "Dropped off car yesterday. Diagnosis found transmission fluid leak. Estimate: $1,800.",
        value: 1800, timeAgo: "Yesterday",
        customerData: { lastVisit: "Yesterday", totalSpend: 2400, visits: 3, openDeal: { service: "Transmission Fluid Leak Repair", value: 1800, stage: "Follow-Up" }, notes: "Waiting for her approval. She asked to call after 2 PM." }
    },
    {
        id: "a6", name: "Louis Litt", phone: "+1 604-555-2345",
        vehicle: "2018 Lexus RX 350", tags: ["Lapsed"], type: "reactivation", priority: "medium",
        reason: "Last visit was 8 months ago — likely needs service",
        context: "Regular customer who came in quarterly. May have switched shops.",
        value: 0, timeAgo: "8 months since last visit",
        customerData: { lastVisit: "June 2025", totalSpend: 5600, visits: 11, notes: "Was a quarterly regular. High lifetime value. Worth a personal call to win back." }
    },
    {
        id: "a7", name: "Donna Paulsen", phone: "+1 604-555-6789",
        tags: ["New Lead"], type: "unbooked_lead", priority: "medium",
        reason: "Submitted online form — \"Check engine light on\"",
        context: "Form submitted 5 hours ago. No phone call yet. Provided email only initially.",
        value: 0, timeAgo: "5 hours ago",
        customerData: { notes: "Online form lead. Check engine light. No vehicle details provided yet." }
    },
    {
        id: "a8", name: "Robert Zane", phone: "+1 604-555-0123",
        vehicle: "2017 Ford Explorer", tags: ["Recall"], type: "reactivation", priority: "low",
        reason: "Service reminder — oil change due based on mileage estimate",
        context: "Last oil change was 6 months ago. Based on his driving pattern, he's due.",
        value: 89, timeAgo: "Due this week",
        customerData: { lastVisit: "Aug 2025", totalSpend: 1800, visits: 7, notes: "Consistent customer. Always books same-day when called. Prefers mornings." }
    },
];

// ============= CONFIG =============
const TYPE_CONFIG = {
    missed_call: { icon: PhoneMissed, label: "Missed Call" },
    unbooked_lead: { icon: Target, label: "Unbooked Lead" },
    cancellation: { icon: CalendarX, label: "Cancellation" },
    no_show: { icon: UserX, label: "No-Show" },
    follow_up: { icon: Clock, label: "Follow-Up" },
    reactivation: { icon: RefreshCw, label: "Win-Back" },
};

const PRIORITY_CONFIG = {
    urgent: { label: "Urgent", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
    high: { label: "High", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
    medium: { label: "Medium", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" },
    low: { label: "Low", color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-100" },
};

// ============= ACTION CARD COMPONENT =============
function ActionCard({ action, onCall, onComplete, onDismiss }: {
    action: ActionItem;
    onCall: () => void;
    onComplete: () => void;
    onDismiss: () => void;
}) {
    const typeConfig = TYPE_CONFIG[action.type];
    const TypeIcon = typeConfig.icon;
    const priority = PRIORITY_CONFIG[action.priority];

    return (
        <div className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col h-full">
            <div className="p-5 flex-1">
                {/* Header: Type & Action Buttons */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-slate-50 text-slate-500")}>
                            <TypeIcon className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">{typeConfig.label}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{action.timeAgo}</span>
                        </div>
                    </div>
                    {action.priority === "urgent" && (
                        <Badge variant="secondary" className="bg-red-50 text-red-600 hover:bg-red-100 border-red-100 gap-1 rounded-full px-2 py-0.5">
                            <Flame className="h-3 w-3" /> Urgent
                        </Badge>
                    )}
                </div>

                {/* Content */}
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight">{action.name}</h3>
                    <p className="text-sm text-slate-600 mb-3">{action.reason}</p>

                    {/* Context Box */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-3">
                        <p className="text-xs text-slate-500 italic leading-relaxed">
                            &ldquo;{action.context}&rdquo;
                        </p>
                    </div>

                    {/* Metadata Tags */}
                    <div className="flex flex-wrap gap-2">
                        {action.vehicle && (
                            <Badge variant="outline" className="text-xs font-normal text-slate-500 bg-white border-slate-200">
                                <Car className="h-3 w-3 mr-1" />
                                {action.vehicle}
                            </Badge>
                        )}
                        {action.value > 0 && (
                            <Badge variant="outline" className="text-xs font-medium text-emerald-600 bg-emerald-50/50 border-emerald-100">
                                <DollarSign className="h-3 w-3 mr-0.5" />
                                {action.value.toLocaleString()}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-slate-100 flex gap-2 bg-slate-50/30 rounded-b-xl">
                <Button
                    onClick={onCall}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs shadow-sm"
                >
                    <Phone className="h-3.5 w-3.5 mr-2" />
                    Call
                </Button>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-slate-200 hover:bg-white text-slate-500"
                        title="SMS"
                    >
                        <MessageSquare className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 hover:bg-white text-slate-500">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={onComplete} className="gap-2">
                                <Check className="h-4 w-4 text-emerald-500" /> Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2">
                                <Clock className="h-4 w-4 text-slate-400" /> Snooze 1 Hour
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 gap-2" onClick={onDismiss}>
                                <XCircle className="h-4 w-4" /> Dismiss
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

// ============= MAIN COMPONENT =============
export function ActionsClient() {
    const [actions, setActions] = useState<ActionItem[]>(MOCK_ACTIONS);
    const [activeFilter, setActiveFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const { initiateCall } = useCall();

    const handleCall = (action: ActionItem) => {
        initiateCall({
            name: action.name,
            phone: action.phone,
            vehicle: action.vehicle,
            lastVisit: action.customerData?.lastVisit,
            totalSpend: action.customerData?.totalSpend,
            visits: action.customerData?.visits,
            openDeal: action.customerData?.openDeal,
            notes: action.customerData?.notes,
        });
    };

    const handleComplete = (id: string) => {
        setCompletedIds(prev => new Set([...prev, id]));
    };

    const handleDismiss = (id: string) => {
        setActions(prev => prev.filter(a => a.id !== id));
    };

    const toggleFilter = (filterId: string) => {
        setActiveFilter(filterId);
    };

    // Filter Logic
    const pendingActions = actions.filter(a => !completedIds.has(a.id));
    const filteredActions = pendingActions.filter(a => {
        const matchesFilter = activeFilter === "all" || a.type === activeFilter;
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.phone.includes(searchQuery) ||
            (a.vehicle && a.vehicle.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    // Counts for Sidebar
    const getCount = (type: string) => pendingActions.filter(a => a.type === type).length;
    const totalCount = pendingActions.length;

    const FILTERS = [
        { id: "all", label: "All Actions", icon: Sparkles, count: totalCount },
        { id: "missed_call", label: "Missed Calls", icon: PhoneMissed, count: getCount("missed_call") },
        { id: "unbooked_lead", label: "Unbooked Leads", icon: Target, count: getCount("unbooked_lead") },
        { id: "cancellation", label: "Cancellations", icon: CalendarX, count: getCount("cancellation") },
        { id: "no_show", label: "No-Shows", icon: UserX, count: getCount("no_show") },
        { id: "follow_up", label: "Follow-Ups", icon: Clock, count: getCount("follow_up") },
        { id: "reactivation", label: "Win-Back", icon: RefreshCw, count: getCount("reactivation") },
    ];

    return (
        <div className="flex h-screen bg-slate-50/50">
            {/* ─── SIDEBAR ─── */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Zap className="h-5 w-5 fill-slate-900" /> Actions
                    </h1>
                    <p className="text-xs text-slate-500 mt-2">
                        {totalCount} pending tasks requiring your attention.
                    </p>
                </div>

                <ScrollArea className="flex-1 px-4">
                    <div className="space-y-1">
                        {FILTERS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => toggleFilter(item.id)}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group",
                                    activeFilter === item.id
                                        ? "bg-slate-900 text-white font-medium shadow-sm"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className={cn(
                                        "h-4 w-4",
                                        activeFilter === item.id ? "text-slate-300" : "text-slate-400 group-hover:text-slate-600"
                                    )} />
                                    {item.label}
                                </div>
                                {item.count > 0 && (
                                    <span className={cn(
                                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-md min-w-[20px] text-center",
                                        activeFilter === item.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                                    )}>
                                        {item.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Impact</h4>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-slate-900">
                                ${pendingActions.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-500">at risk</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── MAIN CONTENT ─── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Toolbar */}
                <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="font-medium text-slate-900">
                            {FILTERS.find(f => f.id === activeFilter)?.label}
                        </span>
                        <span>•</span>
                        <span>{filteredActions.length} items</span>
                    </div>

                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        />
                    </div>
                </div>

                {/* Grid Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {filteredActions.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-6">
                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <SearchX className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">No actions found</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                No pending actions match your current filters. Try changing filters or check back later.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredActions.map(action => (
                                <ActionCard
                                    key={action.id}
                                    action={action}
                                    onCall={() => handleCall(action)}
                                    onComplete={() => handleComplete(action.id)}
                                    onDismiss={() => handleDismiss(action.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
