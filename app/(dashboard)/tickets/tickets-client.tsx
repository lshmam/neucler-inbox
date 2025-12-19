"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
    Ticket, Search, Filter, Plus, MoreHorizontal, Clock, AlertCircle,
    CheckCircle2, Circle, Loader2, User, Calendar, Tag, ChevronDown,
    ArrowUpRight, MessageSquare, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types
interface Customer {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
}

interface TicketType {
    id: string;
    title: string;
    description: string;
    status: "open" | "in_progress" | "pending" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "urgent";
    category: string | null;
    assigned_to: string | null;
    customer_id: string | null;
    customers: Customer | null;
    tags: string[];
    created_at: string;
    updated_at: string;
    due_date: string | null;
    source: string;
    // Score fields
    outcome: string | null;
    outcome_confidence: number | null;
    score: {
        total_score: number;
        quickness_score: number;
        knowledge_score: number;
        hospitality_score: number;
        intro_score: number;
        cta_score: number;
        feedback_summary: string;
    } | null;
    // Booking details for shop management software
    transcript: string | null;
    booking_details: {
        customer: {
            first_name: string | null;
            last_name: string | null;
            phone: string | null;
            email: string | null;
        };
        vehicle: {
            year: string | null;
            make: string | null;
            model: string | null;
            vin: string | null;
            license_plate: string | null;
            mileage: string | null;
        };
        service: {
            primary_complaint: string | null;
            requested_service: string | null;
            notes: string | null;
        };
        logistics: {
            date: string | null;
            time: string | null;
            is_drop_off: boolean | null;
            needs_shuttle: boolean | null;
        };
        missing_info: string[];
    } | null;
}

interface TicketStats {
    total: number;
    open: number;
    in_progress: number;
    pending: number;
    resolved: number;
    closed: number;
    urgent: number;
    high: number;
    avgResolutionHours: number;
}

interface TicketsClientProps {
    initialTickets: TicketType[];
    initialStats: TicketStats;
    merchantId: string;
}

// Priority config
const priorityConfig = {
    urgent: { label: "Urgent", color: "bg-red-100 text-red-700 border-red-200", icon: "🔴" },
    high: { label: "High", color: "bg-orange-100 text-orange-700 border-orange-200", icon: "🟠" },
    medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: "🟡" },
    low: { label: "Low", color: "bg-gray-100 text-gray-600 border-gray-200", icon: "⚪" }
};

// Status config
const statusConfig = {
    open: { label: "Open", color: "bg-blue-100 text-blue-700", icon: Circle },
    in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-700", icon: Loader2 },
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
    resolved: { label: "Resolved", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    closed: { label: "Closed", color: "bg-gray-100 text-gray-600", icon: CheckCircle2 }
};

// Categories
const CATEGORIES = [
    "Billing",
    "Technical Support",
    "General Inquiry",
    "Feature Request",
    "Bug Report",
    "Account",
    "Other"
];

export function TicketsClient({ initialTickets, initialStats, merchantId }: TicketsClientProps) {
    const [tickets, setTickets] = useState<TicketType[]>(initialTickets);
    const [stats, setStats] = useState<TicketStats>(initialStats);
    const [activeTab, setActiveTab] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);

    // Create ticket form state
    const [newTicket, setNewTicket] = useState({
        title: "",
        description: "",
        priority: "medium",
        category: ""
    });
    const [isCreating, setIsCreating] = useState(false);

    // Filter tickets
    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch =
            ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.customers?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.customers?.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (activeTab === "all") return true;
        if (activeTab === "open") return ticket.status === "open";
        if (activeTab === "in_progress") return ticket.status === "in_progress";
        if (activeTab === "pending") return ticket.status === "pending";
        if (activeTab === "resolved") return ticket.status === "resolved" || ticket.status === "closed";

        return true;
    });

    // Refresh tickets
    const refreshTickets = async () => {
        setIsLoading(true);
        try {
            const [ticketsRes, statsRes] = await Promise.all([
                fetch("/api/tickets"),
                fetch("/api/tickets/stats")
            ]);

            if (ticketsRes.ok) {
                const data = await ticketsRes.json();
                setTickets(data.tickets);
            }
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error("Failed to refresh:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Create ticket
    const handleCreateTicket = async () => {
        if (!newTicket.title.trim()) {
            toast.error("Title is required");
            return;
        }

        setIsCreating(true);
        try {
            const res = await fetch("/api/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTicket)
            });

            if (res.ok) {
                const data = await res.json();
                setTickets(prev => [data.ticket, ...prev]);
                setStats(prev => ({ ...prev, total: prev.total + 1, open: prev.open + 1 }));
                setIsCreateOpen(false);
                setNewTicket({ title: "", description: "", priority: "medium", category: "" });
                toast.success("Ticket created!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to create ticket");
            }
        } catch (error) {
            toast.error("Failed to create ticket");
        } finally {
            setIsCreating(false);
        }
    };

    // Update ticket status
    const updateTicketStatus = async (ticketId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                const data = await res.json();
                setTickets(prev => prev.map(t => t.id === ticketId ? data.ticket : t));
                toast.success(`Status updated to ${statusConfig[newStatus as keyof typeof statusConfig]?.label}`);
                refreshTickets(); // Refresh stats
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    // Update ticket priority
    const updateTicketPriority = async (ticketId: string, newPriority: string) => {
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ priority: newPriority })
            });

            if (res.ok) {
                const data = await res.json();
                setTickets(prev => prev.map(t => t.id === ticketId ? data.ticket : t));
                toast.success(`Priority updated to ${priorityConfig[newPriority as keyof typeof priorityConfig]?.label}`);
            }
        } catch (error) {
            toast.error("Failed to update priority");
        }
    };

    // Delete ticket
    const deleteTicket = async (ticketId: string) => {
        if (!confirm("Are you sure you want to delete this ticket?")) return;

        try {
            const res = await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
            if (res.ok) {
                setTickets(prev => prev.filter(t => t.id !== ticketId));
                toast.success("Ticket deleted");
                refreshTickets();
            }
        } catch (error) {
            toast.error("Failed to delete ticket");
        }
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gray-50/50 h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center border shadow-sm">
                        <Ticket className="h-6 w-6 text-[#004789]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Tickets</h1>
                        <p className="text-sm text-muted-foreground">Track and resolve customer issues</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={refreshTickets}
                        disabled={isLoading}
                        className="bg-white"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-[#004789] hover:bg-[#003660] text-white shadow-md"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Ticket
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
                        <Circle className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
                        <Loader2 className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{stats.in_progress}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-orange-100 bg-orange-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700">Urgent/High</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700">{stats.urgent + stats.high}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-green-100 bg-green-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Resolved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{stats.resolved + stats.closed}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-1 rounded-lg border shadow-sm">
                <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={setActiveTab}>
                    <TabsList className="bg-transparent p-0">
                        <TabsTrigger value="all" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md px-4 py-2">
                            All ({stats.total})
                        </TabsTrigger>
                        <TabsTrigger value="open" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 rounded-md px-4 py-2">
                            Open ({stats.open})
                        </TabsTrigger>
                        <TabsTrigger value="in_progress" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 rounded-md px-4 py-2">
                            In Progress ({stats.in_progress})
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-50 data-[state=active]:text-yellow-700 rounded-md px-4 py-2">
                            Pending ({stats.pending})
                        </TabsTrigger>
                        <TabsTrigger value="resolved" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 rounded-md px-4 py-2">
                            Resolved ({stats.resolved + stats.closed})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex items-center gap-2 w-full sm:w-auto p-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search tickets..."
                            className="pl-8 bg-slate-50 border-slate-200 focus-visible:ring-[#004789]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Tickets List */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {filteredTickets.length === 0 ? (
                    <div className="p-12 text-center">
                        <Ticket className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700">No tickets found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {searchQuery ? "Try a different search term" : "Create your first ticket to get started"}
                        </p>
                        {!searchQuery && (
                            <Button
                                className="mt-4 bg-[#004789] hover:bg-[#003660]"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create Ticket
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredTickets.map((ticket) => {
                            const StatusIcon = statusConfig[ticket.status]?.icon || Circle;
                            const priority = priorityConfig[ticket.priority];

                            return (
                                <div
                                    key={ticket.id}
                                    className="p-4 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedTicket(ticket)}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Priority Indicator */}
                                        <div className="mt-1 text-lg">{priority?.icon}</div>

                                        {/* Main Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-slate-900 truncate">
                                                    {ticket.title}
                                                </h3>
                                                <Badge variant="outline" className={`${statusConfig[ticket.status]?.color} text-xs`}>
                                                    {statusConfig[ticket.status]?.label}
                                                </Badge>
                                                {/* Score Badge */}
                                                {ticket.score && (
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs font-bold ${ticket.score.total_score >= 80
                                                            ? 'bg-green-100 text-green-700 border-green-300'
                                                            : ticket.score.total_score >= 60
                                                                ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                                                : 'bg-red-100 text-red-700 border-red-300'
                                                            }`}
                                                    >
                                                        {ticket.score.total_score}/100
                                                    </Badge>
                                                )}
                                                {/* Outcome Badge */}
                                                {ticket.outcome && (
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] capitalize ${ticket.outcome === 'appointment_booked' || ticket.outcome === 'sale_completed'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : ticket.outcome === 'escalated' || ticket.outcome === 'needs_review'
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-slate-50 text-slate-600 border-slate-200'
                                                            }`}
                                                    >
                                                        {ticket.outcome.replace(/_/g, ' ')}
                                                    </Badge>
                                                )}
                                                {ticket.category && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {ticket.category}
                                                    </Badge>
                                                )}
                                            </div>

                                            {ticket.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                                                    {ticket.description}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                {ticket.customers && (
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        <span>{ticket.customers.first_name} {ticket.customers.last_name}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span suppressHydrationWarning>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                                                </div>
                                                {ticket.source !== "manual" && (
                                                    <Badge variant="outline" className="text-[10px] capitalize">
                                                        via {ticket.source}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Select
                                                value={ticket.status}
                                                onValueChange={(v) => updateTicketStatus(ticket.id, v)}
                                            >
                                                <SelectTrigger className="h-8 w-[130px] text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="open">Open</SelectItem>
                                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                                    <SelectItem value="pending">Pending</SelectItem>
                                                    <SelectItem value="resolved">Resolved</SelectItem>
                                                    <SelectItem value="closed">Closed</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setSelectedTicket(ticket)}>
                                                        <ArrowUpRight className="mr-2 h-4 w-4" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => updateTicketPriority(ticket.id, "urgent")}>
                                                        🔴 Set Urgent
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => updateTicketPriority(ticket.id, "high")}>
                                                        🟠 Set High
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => updateTicketPriority(ticket.id, "medium")}>
                                                        🟡 Set Medium
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => updateTicketPriority(ticket.id, "low")}>
                                                        ⚪ Set Low
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => deleteTicket(ticket.id)}
                                                    >
                                                        Delete Ticket
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Ticket Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New Ticket</DialogTitle>
                        <DialogDescription>
                            Create a support ticket to track a customer issue.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder="Brief description of the issue"
                                value={newTicket.title}
                                onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Detailed description of the issue..."
                                rows={4}
                                value={newTicket.description}
                                onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select
                                    value={newTicket.priority}
                                    onValueChange={(v) => setNewTicket(prev => ({ ...prev, priority: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">⚪ Low</SelectItem>
                                        <SelectItem value="medium">🟡 Medium</SelectItem>
                                        <SelectItem value="high">🟠 High</SelectItem>
                                        <SelectItem value="urgent">🔴 Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select
                                    value={newTicket.category}
                                    onValueChange={(v) => setNewTicket(prev => ({ ...prev, category: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateTicket}
                            disabled={isCreating}
                            className="bg-[#004789] hover:bg-[#003660]"
                        >
                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create Ticket
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ticket Detail Dialog */}
            <TicketDetailDialog
                ticket={selectedTicket}
                isOpen={!!selectedTicket}
                onClose={() => setSelectedTicket(null)}
                onUpdate={(updated) => {
                    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
                }}
            />
        </div>
    );
}

// Ticket Detail Dialog Component
function TicketDetailDialog({
    ticket,
    isOpen,
    onClose,
    onUpdate
}: {
    ticket: TicketType | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (ticket: TicketType) => void;
}) {
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isInternal, setIsInternal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Load comments when ticket changes
    useEffect(() => {
        if (ticket?.id) {
            loadComments();
        }
    }, [ticket?.id]);

    const loadComments = async () => {
        if (!ticket) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/tickets/${ticket.id}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments);
            }
        } catch (error) {
            console.error("Failed to load comments:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const addComment = async () => {
        if (!newComment.trim() || !ticket) return;

        setIsSending(true);
        try {
            const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: newComment,
                    is_internal: isInternal
                })
            });

            if (res.ok) {
                const data = await res.json();
                setComments(prev => [...prev, data.comment]);
                setNewComment("");
                toast.success(isInternal ? "Internal note added" : "Comment added");
            }
        } catch (error) {
            toast.error("Failed to add comment");
        } finally {
            setIsSending(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        if (!ticket) return;
        try {
            const res = await fetch(`/api/tickets/${ticket.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                const data = await res.json();
                onUpdate(data.ticket);
                toast.success(`Status updated to ${statusConfig[newStatus as keyof typeof statusConfig]?.label}`);
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    if (!ticket) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{priorityConfig[ticket.priority]?.icon}</span>
                        <DialogTitle className="text-lg">{ticket.title}</DialogTitle>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={statusConfig[ticket.status]?.color}>
                            {statusConfig[ticket.status]?.label}
                        </Badge>
                        {ticket.category && (
                            <Badge variant="secondary">{ticket.category}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto" suppressHydrationWarning>
                            Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </span>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* Description */}
                    {ticket.description && (
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
                        </div>
                    )}

                    {/* Quality Score Breakdown */}
                    {ticket.score && (
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 space-y-3 border border-slate-200">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm text-slate-700">Call Quality Score</h4>
                                <span className={`text-2xl font-bold ${ticket.score.total_score >= 80
                                    ? 'text-green-600'
                                    : ticket.score.total_score >= 60
                                        ? 'text-yellow-600'
                                        : 'text-red-600'
                                    }`}>
                                    {ticket.score.total_score}/100
                                </span>
                            </div>

                            {/* Score Categories */}
                            <div className="grid grid-cols-5 gap-2 text-xs">
                                {[
                                    { label: 'Quick', value: ticket.score.quickness_score, icon: '⚡' },
                                    { label: 'Knowledge', value: ticket.score.knowledge_score, icon: '🧠' },
                                    { label: 'Hospitality', value: ticket.score.hospitality_score, icon: '💜' },
                                    { label: 'Intro', value: ticket.score.intro_score, icon: '👋' },
                                    { label: 'CTA', value: ticket.score.cta_score, icon: '🎯' },
                                ].map((cat) => (
                                    <div key={cat.label} className="bg-white rounded-md p-2 text-center shadow-sm">
                                        <div className="text-lg">{cat.icon}</div>
                                        <div className="font-bold text-slate-900">{cat.value}/20</div>
                                        <div className="text-muted-foreground">{cat.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Feedback */}
                            {ticket.score.feedback_summary && (
                                <div className="bg-white rounded-md p-3 text-sm text-slate-600 border-l-4 border-[#004789]">
                                    <span className="font-medium text-slate-700">AI Coaching: </span>
                                    {ticket.score.feedback_summary}
                                </div>
                            )}

                            {/* Outcome */}
                            {ticket.outcome && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">Outcome:</span>
                                    <Badge variant="outline" className="capitalize">
                                        {ticket.outcome.replace(/_/g, ' ')}
                                    </Badge>
                                    {ticket.outcome_confidence && (
                                        <span className="text-xs text-muted-foreground">
                                            ({ticket.outcome_confidence}% confidence)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Booking Details for Shop Software */}
                    {ticket.booking_details && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 space-y-3 border border-amber-200">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm text-amber-800 flex items-center gap-2">
                                    📋 Booking Details
                                    <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">
                                        Ready for Tekmetric/Mitchell
                                    </Badge>
                                </h4>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 bg-white"
                                    onClick={() => {
                                        const json = JSON.stringify(ticket.booking_details, null, 2);
                                        navigator.clipboard.writeText(json);
                                        // Could add toast here
                                    }}
                                >
                                    📋 Copy JSON
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {/* Customer */}
                                <div className="bg-white rounded-md p-3 shadow-sm">
                                    <h5 className="font-medium text-slate-700 mb-2">👤 Customer</h5>
                                    <div className="space-y-1 text-xs">
                                        {ticket.booking_details.customer.first_name && (
                                            <div><span className="text-muted-foreground">Name:</span> {ticket.booking_details.customer.first_name} {ticket.booking_details.customer.last_name}</div>
                                        )}
                                        {ticket.booking_details.customer.phone && (
                                            <div><span className="text-muted-foreground">Phone:</span> {ticket.booking_details.customer.phone}</div>
                                        )}
                                        {ticket.booking_details.customer.email && (
                                            <div><span className="text-muted-foreground">Email:</span> {ticket.booking_details.customer.email}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Vehicle */}
                                <div className="bg-white rounded-md p-3 shadow-sm">
                                    <h5 className="font-medium text-slate-700 mb-2">🚗 Vehicle</h5>
                                    <div className="space-y-1 text-xs">
                                        {(ticket.booking_details.vehicle.year || ticket.booking_details.vehicle.make) && (
                                            <div><span className="text-muted-foreground">Vehicle:</span> {ticket.booking_details.vehicle.year} {ticket.booking_details.vehicle.make} {ticket.booking_details.vehicle.model}</div>
                                        )}
                                        {ticket.booking_details.vehicle.vin && (
                                            <div><span className="text-muted-foreground">VIN:</span> {ticket.booking_details.vehicle.vin}</div>
                                        )}
                                        {ticket.booking_details.vehicle.license_plate && (
                                            <div><span className="text-muted-foreground">Plate:</span> {ticket.booking_details.vehicle.license_plate}</div>
                                        )}
                                        {ticket.booking_details.vehicle.mileage && (
                                            <div><span className="text-muted-foreground">Mileage:</span> {ticket.booking_details.vehicle.mileage}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Service */}
                                <div className="bg-white rounded-md p-3 shadow-sm">
                                    <h5 className="font-medium text-slate-700 mb-2">🔧 Service</h5>
                                    <div className="space-y-1 text-xs">
                                        {ticket.booking_details.service.requested_service && (
                                            <div><span className="text-muted-foreground">Service:</span> {ticket.booking_details.service.requested_service}</div>
                                        )}
                                        {ticket.booking_details.service.primary_complaint && (
                                            <div><span className="text-muted-foreground">Complaint:</span> {ticket.booking_details.service.primary_complaint}</div>
                                        )}
                                        {ticket.booking_details.service.notes && (
                                            <div><span className="text-muted-foreground">Notes:</span> {ticket.booking_details.service.notes}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Logistics */}
                                <div className="bg-white rounded-md p-3 shadow-sm">
                                    <h5 className="font-medium text-slate-700 mb-2">📅 Appointment</h5>
                                    <div className="space-y-1 text-xs">
                                        {ticket.booking_details.logistics.date && (
                                            <div><span className="text-muted-foreground">Date:</span> {ticket.booking_details.logistics.date}</div>
                                        )}
                                        {ticket.booking_details.logistics.time && (
                                            <div><span className="text-muted-foreground">Time:</span> {ticket.booking_details.logistics.time}</div>
                                        )}
                                        {ticket.booking_details.logistics.is_drop_off !== null && (
                                            <div><span className="text-muted-foreground">Drop-off:</span> {ticket.booking_details.logistics.is_drop_off ? 'Yes' : 'No'}</div>
                                        )}
                                        {ticket.booking_details.logistics.needs_shuttle !== null && (
                                            <div><span className="text-muted-foreground">Shuttle:</span> {ticket.booking_details.logistics.needs_shuttle ? 'Yes' : 'No'}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Missing Info */}
                            {ticket.booking_details.missing_info && ticket.booking_details.missing_info.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-md p-2 text-xs text-red-700">
                                    <span className="font-medium">⚠️ Missing:</span> {ticket.booking_details.missing_info.join(', ')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Customer Info */}
                    {ticket.customers && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-blue-200 text-blue-700">
                                    {ticket.customers.first_name?.[0]}{ticket.customers.last_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-slate-900">
                                    {ticket.customers.first_name} {ticket.customers.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {ticket.customers.email || ticket.customers.phone_number}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Comments Section */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Activity ({comments.length})
                        </h4>

                        {isLoading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : comments.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No comments yet
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {comments.map((comment) => (
                                    <div
                                        key={comment.id}
                                        className={`p-3 rounded-lg ${comment.is_internal
                                            ? 'bg-amber-50 border border-amber-200'
                                            : 'bg-slate-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm text-slate-900">
                                                {comment.author_name || "Agent"}
                                            </span>
                                            {comment.is_internal && (
                                                <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">
                                                    Internal Note
                                                </Badge>
                                            )}
                                            <span className="text-xs text-muted-foreground ml-auto" suppressHydrationWarning>
                                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Comment */}
                <div className="border-t pt-4 space-y-3">
                    <Textarea
                        placeholder={isInternal ? "Add an internal note..." : "Add a comment..."}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={2}
                    />
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isInternal}
                                onChange={(e) => setIsInternal(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-muted-foreground">Internal note (not visible to customer)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <Select value={ticket.status} onValueChange={updateStatus}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={addComment}
                                disabled={isSending || !newComment.trim()}
                                className="bg-[#004789] hover:bg-[#003660]"
                            >
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
