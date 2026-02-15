"use client";

import { useState, useEffect } from "react"; // Added useEffect
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
    SearchX,
    Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner"; // Added missing import
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase-client";
import { useCall } from "@/components/call-context";
import { useDemo } from "@/components/demo-provider";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ============= TYPES =============
export interface ActionItem {
    id: string;
    name: string;
    customer_name?: string; // From database actions
    phone: string;
    customer_phone?: string; // From database actions
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

// ============= MOCK ACTIONS (Fallback) =============
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
];

// ============= CONFIGURATION =============
const TYPE_CONFIG: Record<string, { label: string; icon: any }> = {
    missed_call: { label: "Missed Call", icon: PhoneMissed },
    unbooked_lead: { label: "Unbooked Lead", icon: Target },
    cancellation: { label: "Cancellation", icon: CalendarX },
    no_show: { label: "No-Show", icon: UserX },
    reactivation: { label: "Win-Back", icon: RefreshCw },
    follow_up: { label: "Follow-Up", icon: Clock },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
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
    const typeConfig = TYPE_CONFIG[action.type] || TYPE_CONFIG.missed_call;
    const TypeIcon = typeConfig.icon;
    const priority = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.low;

    return (
        <div className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col h-full">
            <div className="p-5 flex-1">
                {/* Header */}
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
                    <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight">{action.customer_name || action.name || 'Unknown'}</h3>
                    <p className="text-sm text-slate-600 mb-3">{action.reason}</p>

                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-3">
                        <p className="text-xs text-slate-500 italic leading-relaxed">
                            &ldquo;{action.context}&rdquo;
                        </p>
                    </div>

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

            {/* Actions */}
            <div className="p-3 border-t border-slate-100 flex gap-2 bg-slate-50/30 rounded-b-xl">
                <Button onClick={onCall} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs shadow-sm">
                    <Phone className="h-3.5 w-3.5 mr-2" /> Call
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 hover:bg-white text-slate-500">
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
export function ActionClient({ initialActions }: { initialActions: ActionItem[] }) {
    const { initiateCall } = useCall();
    const { data: demoData, isDemo, industry } = useDemo(); // Use demo context
    const supabase = createClient();

    const [actions, setActions] = useState<ActionItem[]>([]);
    const [activeFilter, setActiveFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

    // Create Action State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newAction, setNewAction] = useState({
        title: "",
        description: "",
        customerName: "",
        customerPhone: "",
        priority: "medium",
        type: "follow_up"
    });

    // Customer Autocomplete State
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    const fetchActions = async () => {
        const baseActions = (isDemo && demoData?.actions) ? demoData.actions : initialActions;

        try {
            // Fetch real actions from API (which handles the joins)
            const res = await fetch("/api/actions");
            if (!res.ok) throw new Error("Failed to fetch actions");

            const actionsData = await res.json();

            let dbActions: ActionItem[] = [];
            if (actionsData) {
                dbActions = actionsData.map((a: any) => {
                    const cRaw = a.customers;
                    const c = Array.isArray(cRaw) ? cRaw[0] || {} : cRaw || {};
                    // Calculate time ago roughly
                    const diffMs = new Date().getTime() - new Date(a.created_at).getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const timeAgo = diffMins < 60 ? `${diffMins} min ago` : `${Math.floor(diffMins / 60)} hours ago`;

                    return {
                        id: a.id,
                        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
                        customer_name: a.customer_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
                        phone: c.phone_number || '',
                        customer_phone: a.customer_phone || c.phone_number || '',
                        vehicle: `${c.vehicle_year || ''} ${c.vehicle_make || ''} ${c.vehicle_model || ''}`.trim(),
                        tags: ['Live'],
                        type: (a.type as any) || 'follow_up',
                        priority: (a.priority as any) || 'medium',
                        reason: a.title,
                        context: a.description,
                        value: 0,
                        timeAgo: timeAgo,
                        customerData: {
                            notes: a.description
                        }
                    };
                });
            }

            // Merge: Real actions first, then mock/initial actions
            setActions([...dbActions, ...baseActions]);

        } catch (e) {
            console.error("Error fetching actions:", e);
            setActions(baseActions);
        }
    };

    useEffect(() => {
        fetchActions();
    }, [isDemo, demoData, initialActions, supabase]);

    // Search customers as user types
    const searchCustomers = async (query: string) => {
        if (!query || query.length < 2) {
            setCustomerSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const res = await fetch('/api/customers');
            if (!res.ok) throw new Error('Failed to fetch customers');

            const customers = await res.json();

            // Filter customers by name or phone
            const filtered = customers.filter((c: any) => {
                const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
                const phone = c.phone_number || '';
                const searchLower = query.toLowerCase();

                return fullName.includes(searchLower) || phone.includes(searchLower);
            }).slice(0, 5); // Limit to 5 suggestions

            setCustomerSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } catch (e) {
            console.error('Failed to search customers:', e);
        }
    };

    const handleCreateAction = async () => {
        if (!newAction.title || !newAction.customerName) {
            toast.error("Please fill in required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newAction.title,
                    description: newAction.description,
                    customer_name: newAction.customerName,
                    customer_phone: newAction.customerPhone,
                    priority: newAction.priority,
                    type: newAction.type,
                    status: 'open'
                })
            });

            if (!res.ok) throw new Error(await res.text());

            toast.success("Action created successfully");
            setIsCreateOpen(false);
            setNewAction({
                title: "",
                description: "",
                customerName: "",
                customerPhone: "",
                priority: "medium",
                type: "follow_up"
            });
            // Reset customer search state
            setCustomerSearch("");
            setCustomerSuggestions([]);
            setShowSuggestions(false);
            setSelectedCustomerId(null);
            fetchActions(); // Refresh list
        } catch (e) {
            console.error("Failed to create action", e);
            toast.error("Failed to create action");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCall = (action: ActionItem) => {
        // toast.info(`Calling ${action.name}...`);
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
        // For demo, we just hide it locally
        setCompletedIds(prev => new Set([...prev, id]));
    };

    const toggleFilter = (filterId: string) => {
        setActiveFilter(filterId);
    };

    // Filter Logic
    const pendingActions = actions.filter((a: ActionItem) => !completedIds.has(a.id));

    const filteredActions = pendingActions.filter((a: ActionItem) => {
        const matchesFilter = activeFilter === "all" || a.type === activeFilter;
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.phone.includes(searchQuery) ||
            (a.vehicle && a.vehicle.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    // Counts for Sidebar
    const getCount = (type: string) => pendingActions.filter((a: ActionItem) => a.type === type).length;
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
                        <Zap className="h-5 w-5 fill-slate-900" /> {industry === 'medspa' || industry === 'dental' ? 'Patient Actions' : 'Actions'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-2">
                        {totalCount} pending tasks requiring your attention.
                    </p>
                    <Button onClick={() => setIsCreateOpen(true)} className="w-full mt-4 bg-slate-900 text-white hover:bg-slate-800">
                        <Plus className="h-4 w-4 mr-2" /> Create Action
                    </Button>
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
                                ${pendingActions.reduce((acc: number, curr: ActionItem) => acc + curr.value, 0).toLocaleString()}
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
                            placeholder={`Search ${industry === 'auto' ? 'customers' : 'patients'}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        />
                    </div>
                </div>

                {/* Grid Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredActions.map((action: ActionItem) => (
                            <ActionCard
                                key={action.id}
                                action={action}
                                onCall={() => handleCall(action)}
                                onComplete={() => handleComplete(action.id)}
                                onDismiss={() => handleDismiss(action.id)}
                            />
                        ))}

                        {filteredActions.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                                <SearchX className="h-10 w-10 mb-4 opacity-20" />
                                <p>No actions found matching "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Action Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Action</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Action Title</Label>
                            <Input
                                id="title"
                                value={newAction.title}
                                onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                                placeholder="E.g. Call back about tires"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Customer Name</Label>
                            <div className="relative">
                                <Input
                                    id="name"
                                    value={customerSearch}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setCustomerSearch(value);
                                        setNewAction({ ...newAction, customerName: value });
                                        searchCustomers(value);
                                    }}
                                    onFocus={() => {
                                        if (customerSuggestions.length > 0) {
                                            setShowSuggestions(true);
                                        }
                                    }}
                                    placeholder="Start typing to search..."
                                    autoComplete="off"
                                />

                                {/* Autocomplete Dropdown */}
                                {showSuggestions && customerSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                                        {customerSuggestions.map((customer) => (
                                            <button
                                                key={customer.id}
                                                type="button"
                                                onClick={() => {
                                                    const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
                                                    setCustomerSearch(fullName);
                                                    setNewAction({
                                                        ...newAction,
                                                        customerName: fullName,
                                                        customerPhone: customer.phone_number || ''
                                                    });
                                                    setSelectedCustomerId(customer.id);
                                                    setShowSuggestions(false);
                                                }}
                                                className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                                            >
                                                <div className="font-medium text-slate-900">
                                                    {customer.first_name} {customer.last_name}
                                                </div>
                                                <div className="text-sm text-slate-500">
                                                    {customer.phone_number}
                                                </div>
                                            </button>
                                        ))}
                                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowSuggestions(false);
                                                    setSelectedCustomerId(null);
                                                }}
                                                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Create new customer "{customerSearch}"
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {selectedCustomerId && (
                                <p className="text-xs text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Existing customer selected
                                </p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                value={newAction.customerPhone}
                                onChange={(e) => setNewAction({ ...newAction, customerPhone: e.target.value })}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={newAction.priority}
                                    onValueChange={(val) => setNewAction({ ...newAction, priority: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={newAction.type}
                                    onValueChange={(val) => setNewAction({ ...newAction, type: val as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="follow_up">Follow Up</SelectItem>
                                        <SelectItem value="missed_call">Missed Call</SelectItem>
                                        <SelectItem value="unbooked_lead">Unbooked Lead</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="desc">Notes / Context</Label>
                            <Textarea
                                id="desc"
                                value={newAction.description}
                                onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
                                placeholder="Any additional details..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateAction} disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Action"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
