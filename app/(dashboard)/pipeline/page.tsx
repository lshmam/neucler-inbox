"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { formatDistanceToNow } from "date-fns";
import {
    Phone, MessageSquare, Globe, TrendingUp, DollarSign,
    Users, AlertCircle, Clock, Car, Kanban, Database,
    Search, Upload, X, Plus, ChevronRight, Truck, Crown, UserX, Hash, Loader2,
    List, RefreshCw, CheckCircle2, XCircle, CalendarClock, ArrowRight, RotateCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ============= TYPES =============
interface Deal {
    id: string;
    vehicle: { year: string; make: string; model: string; };
    customer_name: string;
    customer_phone?: string;
    issue: string;
    value: number;
    source: "phone" | "sms" | "google" | "service_desk";
    created_at: string;
    status: "new_inquiry" | "quote_sent" | "follow_up" | "booked" | "not_booked" | "completed";
}

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    vehicles: { year: string; make: string; model: string }[];
    lastVisit: string;
    isVip: boolean;
    isFleet: boolean;
    tags?: string[];
    totalSpend: number;
}



type ColumnId = "new_inquiry" | "quote_sent" | "follow_up" | "booked" | "not_booked" | "completed";

interface Column {
    id: ColumnId;
    title: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

// ============= COLUMNS CONFIG =============
const COLUMNS: Column[] = [
    { id: "new_inquiry", title: "New Inquiry", color: "text-slate-700", bgColor: "bg-slate-100", borderColor: "border-slate-300" },
    { id: "quote_sent", title: "Quote Sent", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
    { id: "follow_up", title: "Follow-Up Needed", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
    { id: "booked", title: "Booked", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-200" },
    { id: "not_booked", title: "Not Booked", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200" },
    { id: "completed", title: "Completed", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
];

// ============= HELPER FUNCTIONS =============
function triggerAutoFollowUp(dealId: string, customerName: string) {
    toast.info(`📧 Auto-follow-up scheduled for ${customerName}`, { description: "SMS will be sent in 2 hours if no response" });
}

function triggerLostDeal(customerName: string) {
    toast.error(`😞 ${customerName} not booked`, { description: "Consider a win-back outreach in 30 days" });
}

// ============= CONVERSION SCOREBOARD =============
function ConversionScoreboard({ deals }: { deals: Deal[] }) {
    const newLeads = deals.filter(d => d.status === "new_inquiry").length;
    const booked = deals.filter(d => d.status === "booked").length;
    const completed = deals.filter(d => d.status === "completed").length;
    const notBooked = deals.filter(d => d.status === "not_booked").length;
    const activeDeals = deals.filter(d => !["not_booked", "completed"].includes(d.status));
    const closeRate = activeDeals.length + completed + notBooked > 0 ? Math.round(((booked + completed) / (activeDeals.length + completed + notBooked)) * 100) : 0;
    const pipelineValue = activeDeals.reduce((sum, d) => sum + d.value, 0);
    const wonRevenue = deals.filter(d => d.status === "completed").reduce((sum, d) => sum + d.value, 0);

    const cards = [
        { label: "New Leads", value: newLeads, icon: Users, color: "text-slate-700" },
        { label: "Close Rate", value: `${closeRate}%`, icon: TrendingUp, color: "text-green-600" },
        { label: "Pipeline Value", value: `$${pipelineValue.toLocaleString()}`, icon: DollarSign, color: "text-blue-600" },
        { label: "Not Booked", value: notBooked, icon: XCircle, color: notBooked > 0 ? "text-red-600" : "text-slate-500" },
        { label: "Won Revenue", value: `$${wonRevenue.toLocaleString()}`, icon: CheckCircle2, color: "text-emerald-600" },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {cards.map((card) => (
                <Card key={card.label} className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <card.icon className="h-4 w-4" /> {card.label}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className={`text-2xl font-mono font-bold ${card.color}`}>{card.value}</span>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ============= DEAL CARD =============
function DealCard({ deal, index, onClick }: { deal: Deal; index: number; onClick: () => void }) {
    const getSourceIcon = (source: string) => {
        switch (source) {
            case "phone": return <Phone className="h-3 w-3" />;
            case "sms": return <MessageSquare className="h-3 w-3" />;
            case "google": return <Globe className="h-3 w-3" />;
            default: return <MessageSquare className="h-3 w-3" />;
        }
    };

    return (
        <Draggable draggableId={deal.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={onClick}
                    className={`bg-white rounded-lg border p-3 mb-2 cursor-pointer transition-shadow ${snapshot.isDragging ? "shadow-lg border-blue-300 ring-2 ring-blue-200" : "border-slate-200 hover:shadow-md hover:border-blue-300"}`}
                >
                    <div className="flex items-center gap-1.5 mb-2">
                        <Car className="h-4 w-4 text-slate-400" />
                        <span className="font-bold text-sm text-slate-900">{deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}</span>
                    </div>
                    <div className="mb-2">
                        <p className="text-sm text-slate-700">{deal.customer_name}</p>
                        <p className="text-xs text-slate-500">{deal.issue}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <Badge variant="secondary" className="bg-green-100 text-green-700 font-mono">${deal.value}</Badge>
                        <div className="flex items-center gap-3 text-slate-400">
                            <span className="flex items-center gap-1">{getSourceIcon(deal.source)}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(deal.created_at), { addSuffix: false })}</span>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
}

// ============= DEAL BOARD (KANBAN) =============
function DealBoard({ deals, setDeals, onSelectDeal }: { deals: Deal[]; setDeals: (deals: Deal[]) => void; onSelectDeal: (deal: Deal) => void }) {
    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const deal = deals.find(d => d.id === draggableId);
        if (!deal) return;

        const newStatus = destination.droppableId as ColumnId;
        const oldStatus = deal.status;

        // Optimistically update UI
        const updatedDeals = deals.map(d => d.id === draggableId ? { ...d, status: newStatus } : d);
        setDeals(updatedDeals);

        // Persist to database
        try {
            const response = await fetch("/api/deals", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: deal.id, status: newStatus })
            });

            if (!response.ok) {
                // Revert on error
                setDeals(deals);
                toast.error("Failed to update deal status");
                return;
            }
        } catch (error) {
            setDeals(deals);
            toast.error("Failed to update deal status");
            return;
        }

        if (newStatus === "follow_up" && oldStatus !== "follow_up") triggerAutoFollowUp(deal.id, deal.customer_name);
        if (newStatus === "booked") toast.success(`🎉 ${deal.customer_name} booked!`, { description: `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model} - $${deal.value}` });
        if (newStatus === "not_booked" && oldStatus !== "not_booked") triggerLostDeal(deal.customer_name);
        if (newStatus === "completed") toast.success(`✅ ${deal.customer_name} completed!`, { description: `$${deal.value} revenue earned` });
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid gap-3 flex-1 min-h-0" style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(300px, 1fr))` }}>
                {COLUMNS.map((column) => {
                    const columnDeals = deals.filter(d => d.status === column.id);
                    return (
                        <div key={column.id} className="flex flex-col min-h-0">
                            <div className={`${column.bgColor} ${column.borderColor} border rounded-t-lg px-3 py-2 flex items-center justify-between`}>
                                <span className={`font-semibold text-sm ${column.color}`}>{column.title}</span>
                                <Badge variant="secondary" className="bg-white/80 text-slate-600 text-xs">{columnDeals.length}</Badge>
                            </div>
                            <Droppable droppableId={column.id}>
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 p-2 rounded-b-lg border border-t-0 ${column.borderColor} min-h-[200px] transition-colors ${snapshot.isDraggingOver ? "bg-blue-50" : "bg-slate-50"}`}>
                                        {columnDeals.map((deal, index) => (<DealCard key={deal.id} deal={deal} index={index} onClick={() => onSelectDeal(deal)} />))}
                                        {provided.placeholder}
                                        {columnDeals.length === 0 && !snapshot.isDraggingOver && (<div className="h-full flex items-center justify-center text-slate-400 text-sm">Drop deals here</div>)}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}
            </div>
        </DragDropContext>
    );
}

// ============= DEAL DETAIL PANEL (RIGHT POPUP) =============
function DealDetailPanel({
    deal,
    isOpen,
    onClose,
    onStatusChange,
    onShowDeleteConfirm
}: {
    deal: Deal | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange: (id: string, status: Deal["status"]) => void;
    onShowDeleteConfirm: () => void;
}) {
    if (!isOpen || !deal) return null;

    const statusOptions: { value: Deal["status"]; label: string; color: string }[] = [
        { value: "new_inquiry", label: "New Inquiry", color: "bg-slate-500" },
        { value: "quote_sent", label: "Quote Sent", color: "bg-blue-500" },
        { value: "follow_up", label: "Follow-Up", color: "bg-amber-500" },
        { value: "booked", label: "Booked", color: "bg-green-500" },
        { value: "not_booked", label: "Not Booked", color: "bg-red-500" },
        { value: "completed", label: "Completed", color: "bg-emerald-500" },
    ];

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-lg text-slate-900">Deal Details</h3>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Primary Action - Go to Service Desk */}
                <a
                    href="/service-desk"
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold">Open in Service Desk</p>
                                <p className="text-xs text-blue-200">View conversation & send messages</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                </a>

                {/* Customer Info */}
                <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase mb-2">Customer</p>
                    <p className="font-bold text-slate-900 text-lg">{deal.customer_name}</p>
                    {deal.customer_phone && (
                        <p className="text-sm text-slate-500">{deal.customer_phone}</p>
                    )}
                </div>

                {/* Vehicle */}
                {deal.vehicle && deal.vehicle.year !== "Unknown" && (
                    <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 uppercase mb-2">Vehicle</p>
                        <p className="font-semibold text-slate-900">
                            {deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}
                        </p>
                    </div>
                )}

                {/* Deal Value */}
                <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-xs text-green-700 uppercase mb-1">Estimated Value</p>
                    <p className="font-bold text-3xl text-green-600">${deal.value.toLocaleString()}</p>
                </div>

                {/* Issue/Service */}
                <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase mb-2">Issue / Service</p>
                    <p className="text-slate-900">{deal.issue}</p>
                </div>

                {/* Status */}
                <div>
                    <p className="text-xs text-slate-500 uppercase mb-2">Pipeline Stage</p>
                    <div className="flex gap-1 flex-wrap">
                        {statusOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => onStatusChange(deal.id, opt.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${deal.status === opt.value
                                    ? `${opt.color} text-white shadow-sm`
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Source & Time */}
                <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                        <span className="capitalize">{deal.source.replace("_", " ")}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(deal.created_at), { addSuffix: true })}
                    </span>
                </div>

                {/* Delete Button */}
                <div className="pt-4 border-t border-slate-100">
                    <Button
                        variant="outline"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={onShowDeleteConfirm}
                    >
                        Delete Deal
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ============= CUSTOMER DATABASE COMPONENT =============
function CustomerDatabase({ onAddDeal }: { onAddDeal: (customer: Customer) => void }) {
    // Real data will come from database - start empty
    const customers: Customer[] = [];

    const [activeFilter, setActiveFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false);
    const [newSegmentName, setNewSegmentName] = useState("");
    const [customSegments, setCustomSegments] = useState<{ id: string; name: string; customerIds: string[] }[]>([]);

    const FILTERS = [
        { id: "all", label: "All Contacts", icon: Users, count: customers.length },
        { id: "vip", label: "VIPs (>$2k)", icon: Crown, count: customers.filter(c => c.isVip).length },
        { id: "fleet", label: "Fleets", icon: Truck, count: customers.filter(c => c.isFleet).length },
        { id: "inactive", label: "Inactive (>1yr)", icon: UserX, count: customers.filter(c => new Date(c.lastVisit) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)).length },
    ];

    const TAGS = ["WinterTires", "AudiClub", "SubaruFan"];

    const filteredCustomers = customers.filter(c => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!c.name.toLowerCase().includes(q) && !c.phone.includes(q) && !c.vehicles.some(v => `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q))) return false;
        }
        // Custom segments
        const customSegment = customSegments.find(s => s.id === activeFilter);
        if (customSegment) return customSegment.customerIds.includes(c.id);

        switch (activeFilter) {
            case "vip": return c.isVip;
            case "fleet": return c.isFleet;
            case "inactive": return new Date(c.lastVisit) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
            default: return true;
        }
    });

    const handleAddDeal = (customer: Customer) => {
        onAddDeal(customer);
        toast.success(`Added ${customer.name} to pipeline!`);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredCustomers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleCreateSegment = () => {
        if (!newSegmentName.trim() || selectedIds.size === 0) return;
        const newSegment = {
            id: `custom_${Date.now()}`,
            name: newSegmentName,
            customerIds: Array.from(selectedIds)
        };
        setCustomSegments(prev => [...prev, newSegment]);
        setShowCreateSegmentModal(false);
        setNewSegmentName("");
        setSelectedIds(new Set());
        toast.success(`Segment "${newSegmentName}" created with ${selectedIds.size} customers!`);
    };

    const handleBulkAddDeals = () => {
        const selectedCustomers = customers.filter(c => selectedIds.has(c.id));
        selectedCustomers.forEach(c => onAddDeal(c));
        toast.success(`Added ${selectedCustomers.length} customers to pipeline!`);
        setSelectedIds(new Set());
    };

    return (
        <>
            {/* Full-page dark overlay when modal is open */}
            {showCreateSegmentModal && (
                <div className="fixed inset-0 bg-black/70 z-40" />
            )}

            <div className={`flex gap-6 h-full relative ${showCreateSegmentModal ? "z-50" : ""}`}>
                {/* SIDEBAR - Premium dark styling */}
                <div className={`w-64 flex-shrink-0 space-y-6 bg-slate-50 rounded-xl p-4 border border-slate-200 transition-all ${showCreateSegmentModal ? "opacity-50 pointer-events-none" : ""}`}>
                    {/* Smart Segments */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Smart Segments</h4>
                            <Badge variant="outline" className="text-xs">{customers.length} total</Badge>
                        </div>
                        <div className="space-y-1">
                            {FILTERS.map(f => {
                                const Icon = f.icon;
                                return (
                                    <button
                                        key={f.id}
                                        onClick={() => setActiveFilter(f.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeFilter === f.id
                                            ? "bg-slate-900 text-white shadow-lg"
                                            : "text-slate-700 hover:bg-white hover:shadow-sm"}`}
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <Icon className="h-4 w-4" />
                                            {f.label}
                                        </span>
                                        <Badge variant={activeFilter === f.id ? "secondary" : "outline"} className={`text-xs ${activeFilter === f.id ? "bg-white/20 text-white border-0" : ""}`}>
                                            {f.count}
                                        </Badge>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom Segments */}
                    {customSegments.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Segments</h4>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>
                            <div className="space-y-1">
                                {customSegments.map(seg => (
                                    <button
                                        key={seg.id}
                                        onClick={() => setActiveFilter(seg.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeFilter === seg.id
                                            ? "bg-blue-600 text-white shadow-lg"
                                            : "text-slate-700 hover:bg-white hover:shadow-sm"}`}
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <Users className="h-4 w-4" />
                                            {seg.name}
                                        </span>
                                        <Badge variant={activeFilter === seg.id ? "secondary" : "outline"} className={`text-xs ${activeFilter === seg.id ? "bg-white/20 text-white border-0" : ""}`}>
                                            {seg.customerIds.length}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tags</h4>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {TAGS.map(tag => (
                                <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-white hover:shadow-sm transition-all py-1.5 px-2.5">
                                    <Hash className="h-3 w-3 mr-1 text-slate-400" />
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white">
                        <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Database Value</p>
                        <p className="text-2xl font-bold">${customers.reduce((sum, c) => sum + c.totalSpend, 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-1">Lifetime customer spend</p>
                    </div>
                </div>

                {/* MAIN AREA */}
                <div className={`flex-1 flex flex-col min-w-0 transition-all ${showCreateSegmentModal ? "opacity-50 pointer-events-none" : ""}`}>
                    {/* Header Actions */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search Name, Phone, or VIN..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-11 bg-white border-slate-200 shadow-sm"
                            />
                        </div>
                        <Button onClick={() => setShowImportModal(true)} className="h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                            <Upload className="h-4 w-4 mr-2" />
                            Import CSV
                        </Button>
                    </div>

                    {/* Selection Toolbar */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-3 mb-4 p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-lg">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <Users className="h-4 w-4" />
                            </div>
                            <span className="font-semibold">{selectedIds.size} customers selected</span>
                            <div className="flex-1" />
                            <Button size="sm" onClick={() => setShowCreateSegmentModal(true)} className="bg-white text-slate-900 hover:bg-slate-100">
                                <Users className="h-4 w-4 mr-1.5" />
                                Create Segment
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleBulkAddDeals} className="bg-white/20 text-white hover:bg-white/30 border-0">
                                <Plus className="h-4 w-4 mr-1.5" />
                                Add to Pipeline
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-white/70 hover:text-white hover:bg-white/10">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Table */}
                    <Card className="flex-1 overflow-hidden shadow-lg border-slate-200">
                        <div className="overflow-auto h-full">
                            <table className="w-full">
                                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-4 w-12">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                                                onChange={toggleSelectAll}
                                                className="rounded border-slate-300 w-4 h-4"
                                            />
                                        </th>
                                        <th className="px-4 py-4 font-semibold">Customer</th>
                                        <th className="px-4 py-4 font-semibold">Phone</th>
                                        <th className="px-4 py-4 font-semibold">Vehicles</th>
                                        <th className="px-4 py-4 font-semibold">Total Spend</th>
                                        <th className="px-4 py-4 font-semibold">Last Visit</th>
                                        <th className="px-4 py-4 font-semibold w-28">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {filteredCustomers.map((customer) => (
                                        <tr
                                            key={customer.id}
                                            className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${selectedIds.has(customer.id) ? "bg-blue-50/70" : ""}`}
                                        >
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(customer.id)}
                                                    onChange={(e) => { e.stopPropagation(); toggleSelect(customer.id); }}
                                                    className="rounded border-slate-300 w-4 h-4"
                                                />
                                            </td>
                                            <td className="px-4 py-4" onClick={() => setSelectedCustomer(customer)}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-900">{customer.name}</span>
                                                    {customer.isVip && (
                                                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                                            <Crown className="h-3 w-3" /> VIP
                                                        </span>
                                                    )}
                                                    {customer.isFleet && (
                                                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                            <Truck className="h-3 w-3" /> Fleet
                                                        </span>
                                                    )}
                                                </div>
                                                {customer.tags && customer.tags.length > 0 && (
                                                    <div className="flex gap-1 mt-1.5">
                                                        {customer.tags.map(t => (
                                                            <span key={t} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                                #{t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600 font-mono text-sm">{customer.phone}</td>
                                            <td className="px-4 py-4">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                                    <Car className="h-3 w-3 mr-1" />
                                                    {customer.vehicles.length} {customer.vehicles.length === 1 ? "Car" : "Cars"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`font-mono font-bold text-lg ${customer.totalSpend >= 2000 ? "text-green-600" : "text-slate-700"}`}>
                                                    ${customer.totalSpend.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-slate-500 text-sm">{new Date(customer.lastVisit).toLocaleDateString()}</td>
                                            <td className="px-4 py-4">
                                                <Button
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); handleAddDeal(customer); }}
                                                    className="bg-slate-900 hover:bg-black text-white"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Deal
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* CREATE SEGMENT MODAL - Centered and prominent */}
                {showCreateSegmentModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={() => setShowCreateSegmentModal(false)}>
                        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">Create Segment</h3>
                                    <p className="text-sm text-slate-500 mt-1">{selectedIds.size} customers selected</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setShowCreateSegmentModal(false)} className="rounded-full h-8 w-8 p-0">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 block mb-2">Segment Name</label>
                                    <Input
                                        placeholder="e.g., Winter Campaign 2024"
                                        value={newSegmentName}
                                        onChange={(e) => setNewSegmentName(e.target.value)}
                                        className="h-12 text-base"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" onClick={() => setShowCreateSegmentModal(false)} className="flex-1 h-11">
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCreateSegment} disabled={!newSegmentName.trim()} className="flex-1 h-11 bg-slate-900 hover:bg-black">
                                        <Users className="h-4 w-4 mr-2" />
                                        Create Segment
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MINI PROFILE SLIDE-OUT */}
                {selectedCustomer && (
                    <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 p-4 overflow-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg">{selectedCustomer.name}</h3>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Contact</p>
                                <p className="text-sm">{selectedCustomer.phone}</p>
                                <p className="text-sm text-slate-600">{selectedCustomer.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Vehicles</p>
                                {selectedCustomer.vehicles.map((v, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm py-1">
                                        <Car className="h-4 w-4 text-slate-400" />
                                        {v.year} {v.make} {v.model}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Spend</p>
                                    <p className="text-xl font-bold text-green-600">${selectedCustomer.totalSpend.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Last Visit</p>
                                    <p className="text-sm">{new Date(selectedCustomer.lastVisit).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <Button className="w-full" onClick={() => handleAddDeal(selectedCustomer)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add to Pipeline
                            </Button>
                        </div>
                    </div>
                )}

                {/* IMPORT MODAL */}
                {showImportModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]" onClick={() => setShowImportModal(false)}>
                        <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold">Import Customer Data</h3>
                                <Button variant="ghost" size="sm" onClick={() => setShowImportModal(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-sm text-slate-600 mb-6">Import your existing customer database from your shop management software.</p>

                            {/* Dropzone with file input */}
                            <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer mb-4 block">
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            const text = event.target?.result as string;
                                            if (!text) return;

                                            // Parse CSV
                                            const lines = text.split('\n');
                                            const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase());

                                            if (!headers) {
                                                toast.error("Invalid CSV format");
                                                return;
                                            }

                                            let importedCount = 0;
                                            for (let i = 1; i < lines.length; i++) {
                                                const values = lines[i].split(',');
                                                if (values.length < 2) continue;

                                                // Map common CSV headers to customer fields
                                                const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('customer'));
                                                const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('cell'));

                                                if (nameIdx >= 0 && values[nameIdx]?.trim()) {
                                                    importedCount++;
                                                }
                                            }

                                            if (importedCount > 0) {
                                                toast.success(`Successfully parsed ${importedCount} customers from CSV`, {
                                                    description: "Customer import is currently in preview mode"
                                                });
                                            } else {
                                                toast.error("No valid customer data found in CSV");
                                            }
                                            setShowImportModal(false);
                                        };
                                        reader.readAsText(file);
                                    }}
                                />
                                <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                                <p className="font-medium text-slate-700">Drop your CSV file here or click to browse</p>
                                <p className="text-sm text-slate-500 mt-2">Supported formats: Mitchell 1, Manager SE, Tekmetric</p>
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="h-20 flex-col">
                                    <span className="font-semibold">Mitchell 1 / Manager SE</span>
                                    <span className="text-xs text-slate-500">Export from Reports → Customers</span>
                                </Button>
                                <Button variant="outline" className="h-20 flex-col">
                                    <span className="font-semibold">Tekmetric</span>
                                    <span className="text-xs text-slate-500">Export from Customers tab</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// ============= ALL DEALS TABLE =============
function AllDealsTable({ deals, onSelectDeal }: { deals: Deal[]; onSelectDeal: (deal: Deal) => void }) {
    const [search, setSearch] = useState("");
    const [stageFilter, setStageFilter] = useState<ColumnId | "all">("all");

    const filtered = deals.filter(d => {
        if (stageFilter !== "all" && d.status !== stageFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return d.customer_name.toLowerCase().includes(q) ||
                d.issue.toLowerCase().includes(q) ||
                `${d.vehicle.year} ${d.vehicle.make} ${d.vehicle.model}`.toLowerCase().includes(q);
        }
        return true;
    });

    const getStageBadge = (status: string) => {
        const col = COLUMNS.find(c => c.id === status);
        if (!col) return null;
        return <Badge className={`${col.bgColor} ${col.color} border ${col.borderColor} text-xs`}>{col.title}</Badge>;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search deals by customer, vehicle, or service..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 bg-white"
                    />
                </div>
                <div className="flex gap-1 flex-wrap">
                    <button
                        onClick={() => setStageFilter("all")}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${stageFilter === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
                    >All ({deals.length})</button>
                    {COLUMNS.map(col => {
                        const count = deals.filter(d => d.status === col.id).length;
                        return (
                            <button
                                key={col.id}
                                onClick={() => setStageFilter(col.id)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${stageFilter === col.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
                            >{col.title} ({count})</button>
                        );
                    })}
                </div>
            </div>
            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <div className="overflow-auto max-h-[calc(100vh-320px)]">
                    <table className="w-full">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                            <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                                <th className="px-4 py-3 font-semibold">Customer</th>
                                <th className="px-4 py-3 font-semibold">Vehicle</th>
                                <th className="px-4 py-3 font-semibold">Service</th>
                                <th className="px-4 py-3 font-semibold">Value</th>
                                <th className="px-4 py-3 font-semibold">Stage</th>
                                <th className="px-4 py-3 font-semibold">Source</th>
                                <th className="px-4 py-3 font-semibold">Created</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No deals match your filters</td></tr>
                            )}
                            {filtered.map(deal => (
                                <tr key={deal.id} onClick={() => onSelectDeal(deal)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-900">{deal.customer_name}</div>
                                        {deal.customer_phone && <div className="text-xs text-slate-500 font-mono">{deal.customer_phone}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700">
                                        {deal.vehicle.year !== "" ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}` : "\u2014"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">{deal.issue}</td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-bold text-green-600">${deal.value.toLocaleString()}</span>
                                    </td>
                                    <td className="px-4 py-3">{getStageBadge(deal.status)}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500 capitalize">{deal.source.replace("_", " ")}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{formatDistanceToNow(new Date(deal.created_at), { addSuffix: true })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

// ============= REACTIVATION TAB =============
interface LapsedCustomer {
    id: string;
    name: string;
    phone: string;
    lastVisit: string;
    daysSinceVisit: number;
    totalSpend: number;
    lastService: string;
    vehicle: string;
    visits: number;
}

function ReactivationTab({ onWinBack }: { onWinBack: (customer: LapsedCustomer) => void }) {
    const [urgencyFilter, setUrgencyFilter] = useState<"all" | "90-180" | "180-365" | "365+">("all");
    const [search, setSearch] = useState("");

    const lapsedCustomers: LapsedCustomer[] = [
        { id: "lc1", name: "Robert Chen", phone: "+1 604-555-0101", lastVisit: "2025-08-15", daysSinceVisit: 179, totalSpend: 3200, lastService: "Full brake replacement", vehicle: "2020 Honda Civic", visits: 8 },
        { id: "lc2", name: "Sarah Mitchell", phone: "+1 604-555-0202", lastVisit: "2025-06-01", daysSinceVisit: 254, totalSpend: 5800, lastService: "Transmission service", vehicle: "2019 BMW X3", visits: 12 },
        { id: "lc3", name: "James Thompson", phone: "+1 604-555-0303", lastVisit: "2025-03-10", daysSinceVisit: 337, totalSpend: 1500, lastService: "Oil change", vehicle: "2021 Toyota Corolla", visits: 4 },
        { id: "lc4", name: "Maria Garcia", phone: "+1 604-555-0404", lastVisit: "2024-11-20", daysSinceVisit: 447, totalSpend: 8200, lastService: "Engine diagnostics", vehicle: "2018 Mercedes C300", visits: 15 },
        { id: "lc5", name: "David Kim", phone: "+1 604-555-0505", lastVisit: "2025-09-22", daysSinceVisit: 141, totalSpend: 2100, lastService: "Tire rotation + alignment", vehicle: "2022 Subaru Outback", visits: 5 },
        { id: "lc6", name: "Emily Watson", phone: "+1 604-555-0606", lastVisit: "2025-01-15", daysSinceVisit: 391, totalSpend: 4500, lastService: "Suspension repair", vehicle: "2017 Ford F-150", visits: 9 },
        { id: "lc7", name: "Michael Brown", phone: "+1 604-555-0707", lastVisit: "2025-07-30", daysSinceVisit: 195, totalSpend: 1800, lastService: "AC recharge", vehicle: "2020 Hyundai Tucson", visits: 6 },
        { id: "lc8", name: "Lisa Nguyen", phone: "+1 604-555-0808", lastVisit: "2024-09-05", daysSinceVisit: 523, totalSpend: 12400, lastService: "Major engine repair", vehicle: "2016 Audi Q5", visits: 22 },
    ];

    const filtered = lapsedCustomers.filter(c => {
        if (urgencyFilter === "90-180" && (c.daysSinceVisit < 90 || c.daysSinceVisit > 180)) return false;
        if (urgencyFilter === "180-365" && (c.daysSinceVisit < 180 || c.daysSinceVisit > 365)) return false;
        if (urgencyFilter === "365+" && c.daysSinceVisit < 365) return false;
        if (search) {
            const q = search.toLowerCase();
            return c.name.toLowerCase().includes(q) || c.vehicle.toLowerCase().includes(q) || c.phone.includes(q);
        }
        return true;
    });

    const getUrgencyColor = (days: number) => {
        if (days >= 365) return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Critical" };
        if (days >= 180) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "At Risk" };
        return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Cooling" };
    };

    const totalLostRevenue = lapsedCustomers.reduce((sum, c) => sum + Math.round(c.totalSpend / c.visits * 2), 0);
    const criticalCount = lapsedCustomers.filter(c => c.daysSinceVisit >= 365).length;
    const atRiskCount = lapsedCustomers.filter(c => c.daysSinceVisit >= 180 && c.daysSinceVisit < 365).length;

    return (
        <div className="space-y-6">
            {/* Reactivation Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
                    <CardHeader className="pb-1"><CardTitle className="text-xs text-slate-400 uppercase">Lapsed Customers</CardTitle></CardHeader>
                    <CardContent><span className="text-3xl font-bold">{lapsedCustomers.length}</span></CardContent>
                </Card>
                <Card className="bg-white border-slate-200">
                    <CardHeader className="pb-1"><CardTitle className="text-xs text-slate-500 uppercase flex items-center gap-1"><DollarSign className="h-3 w-3" /> Est. Lost Revenue/Year</CardTitle></CardHeader>
                    <CardContent><span className="text-2xl font-bold text-red-600">${totalLostRevenue.toLocaleString()}</span></CardContent>
                </Card>
                <Card className="bg-white border-slate-200">
                    <CardHeader className="pb-1"><CardTitle className="text-xs text-slate-500 uppercase flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Critical (1yr+)</CardTitle></CardHeader>
                    <CardContent><span className="text-2xl font-bold text-red-600">{criticalCount}</span></CardContent>
                </Card>
                <Card className="bg-white border-slate-200">
                    <CardHeader className="pb-1"><CardTitle className="text-xs text-slate-500 uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> At Risk (6mo+)</CardTitle></CardHeader>
                    <CardContent><span className="text-2xl font-bold text-amber-600">{atRiskCount}</span></CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, vehicle, or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 bg-white"
                    />
                </div>
                <div className="flex gap-1 flex-wrap">
                    {[
                        { id: "all" as const, label: "All", count: lapsedCustomers.length },
                        { id: "90-180" as const, label: "90-180 days", count: lapsedCustomers.filter(c => c.daysSinceVisit >= 90 && c.daysSinceVisit <= 180).length },
                        { id: "180-365" as const, label: "6-12 months", count: lapsedCustomers.filter(c => c.daysSinceVisit >= 180 && c.daysSinceVisit <= 365).length },
                        { id: "365+" as const, label: "1yr+", count: lapsedCustomers.filter(c => c.daysSinceVisit >= 365).length },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setUrgencyFilter(f.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${urgencyFilter === f.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
                        >{f.label} ({f.count})</button>
                    ))}
                </div>
            </div>

            {/* Customer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(customer => {
                    const urgency = getUrgencyColor(customer.daysSinceVisit);
                    return (
                        <Card key={customer.id} className={`border shadow-sm hover:shadow-md transition-all ${urgency.border}`}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-900">{customer.name}</h3>
                                        <p className="text-xs text-slate-500 font-mono">{customer.phone}</p>
                                    </div>
                                    <Badge className={`${urgency.bg} ${urgency.text} border ${urgency.border} text-xs`}>
                                        {urgency.label}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                    <Car className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-700">{customer.vehicle}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-500">Last Visit</p>
                                        <p className="text-sm font-semibold text-slate-900">{customer.daysSinceVisit}d ago</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Total Spend</p>
                                        <p className="text-sm font-semibold text-green-600">${customer.totalSpend.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Visits</p>
                                        <p className="text-sm font-semibold text-slate-900">{customer.visits}</p>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-600">
                                    <span className="font-medium">Last service:</span> {customer.lastService}
                                </div>

                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    size="sm"
                                    onClick={() => onWinBack(customer)}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Win Back — Create Deal
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

// ============= MAIN PAGE =============
export default function PipelinePage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [activeTab, setActiveTab] = useState<"deals" | "all" | "reactivation">("deals");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newDealForm, setNewDealForm] = useState({
        customerName: "",
        customerPhone: "",
        issue: "",
        value: 0,
        status: "new_inquiry" as Deal["status"]
    });

    // Fetch deals from database on mount
    useEffect(() => {
        async function fetchDeals() {
            try {
                const response = await fetch("/api/deals");
                if (response.ok) {
                    const data = await response.json();
                    // Transform database format to component format
                    const transformedDeals = (data.deals || []).map((d: any) => ({
                        id: d.id,
                        vehicle: {
                            year: d.vehicle_year || "",
                            make: d.vehicle_make || "Unknown",
                            model: d.vehicle_model || ""
                        },
                        customer_name: d.customer_name || "Unknown",
                        customer_phone: d.customer_phone || null,
                        issue: d.title || d.description || "Deal",
                        value: d.value || 0,
                        source: d.source || "phone",
                        created_at: d.created_at,
                        status: d.status || "new_inquiry"
                    }));
                    setDeals(transformedDeals);
                }
            } catch (error) {
                console.error("[Pipeline] Failed to fetch deals:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDeals();
    }, []);



    const handleWinBack = (customer: LapsedCustomer) => {
        const newDeal: Deal = {
            id: `d${Date.now()}`,
            vehicle: { year: customer.vehicle.split(" ")[0] || "", make: customer.vehicle.split(" ")[1] || "", model: customer.vehicle.split(" ").slice(2).join(" ") || "" },
            customer_name: customer.name,
            customer_phone: customer.phone,
            issue: `Reactivation — Last: ${customer.lastService}`,
            value: Math.round(customer.totalSpend / customer.visits),
            source: "service_desk",
            created_at: new Date().toISOString(),
            status: "new_inquiry"
        };
        setDeals(prev => [newDeal, ...prev]);
        setActiveTab("deals");
        toast.success(`🎉 Win-back deal created for ${customer.name}!`, { description: `Added to New Inquiry pipeline` });
    };

    const handleCreateDeal = async () => {
        if (!newDealForm.customerName.trim()) {
            toast.error("Customer name is required");
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch("/api/deals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: newDealForm.customerName,
                    customerPhone: newDealForm.customerPhone || null,
                    title: newDealForm.issue,
                    description: newDealForm.issue,
                    status: newDealForm.status,
                    value: newDealForm.value,
                    source: "manual"
                })
            });

            if (response.ok) {
                const data = await response.json();
                const newDeal: Deal = {
                    id: data.deal.id,
                    vehicle: { year: "", make: "", model: "" },
                    customer_name: newDealForm.customerName,
                    customer_phone: newDealForm.customerPhone || undefined,
                    issue: newDealForm.issue || "New Deal",
                    value: newDealForm.value,
                    source: "service_desk",
                    created_at: new Date().toISOString(),
                    status: newDealForm.status
                };
                setDeals(prev => [newDeal, ...prev]);
                setShowCreateModal(false);
                setNewDealForm({ customerName: "", customerPhone: "", issue: "", value: 0, status: "new_inquiry" });
                toast.success("Deal created!");
            } else {
                const error = await response.json();
                toast.error(`Failed: ${error.error}`);
            }
        } catch (error) {
            toast.error("Failed to create deal");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <>
            {/* Create Deal Modal - Outside main div to cover sidebar */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">New Deal</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                                <Input
                                    value={newDealForm.customerName}
                                    onChange={(e) => setNewDealForm(prev => ({ ...prev, customerName: e.target.value }))}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
                                <Input
                                    value={newDealForm.customerPhone}
                                    onChange={(e) => setNewDealForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                                    placeholder="+1 555 123 4567"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Issue / Service</label>
                                <Input
                                    value={newDealForm.issue}
                                    onChange={(e) => setNewDealForm(prev => ({ ...prev, issue: e.target.value }))}
                                    placeholder="Oil change, brake inspection..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Value ($)</label>
                                <Input
                                    type="number"
                                    value={newDealForm.value || ""}
                                    onChange={(e) => setNewDealForm(prev => ({ ...prev, value: e.target.value === "" ? 0 : parseInt(e.target.value) }))}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Starting Stage</label>
                                <div className="flex gap-1 flex-wrap">
                                    {[
                                        { value: "new_inquiry", label: "New Inquiry" },
                                        { value: "quote_sent", label: "Quote Sent" },
                                        { value: "follow_up", label: "Follow-Up" },
                                        { value: "booked", label: "Booked" },
                                        { value: "not_booked", label: "Not Booked" },
                                        { value: "completed", label: "Completed" }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setNewDealForm(prev => ({ ...prev, status: opt.value as Deal["status"] }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${newDealForm.status === opt.value
                                                ? "bg-slate-900 text-white"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
                                onClick={handleCreateDeal}
                                disabled={isCreating}
                            >
                                {isCreating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Deal"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal - At fragment level to cover sidebar */}
            {showDeleteConfirm && selectedDeal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 mx-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Deal?</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            This will permanently remove the deal for "{selectedDeal.customer_name}" from your pipeline.
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                onClick={async () => {
                                    setIsDeleting(true);
                                    try {
                                        const response = await fetch(`/api/deals?id=${selectedDeal.id}`, {
                                            method: "DELETE"
                                        });
                                        if (response.ok) {
                                            setDeals(prev => prev.filter(d => d.id !== selectedDeal.id));
                                            setSelectedDeal(null);
                                            setShowDeleteConfirm(false);
                                            toast.success("Deal deleted");
                                        } else {
                                            toast.error("Failed to delete deal");
                                        }
                                    } catch (error) {
                                        toast.error("Failed to delete deal");
                                    }
                                    setIsDeleting(false);
                                }}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</>
                                ) : (
                                    "Delete"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="h-full flex flex-col p-6 bg-slate-100 overflow-hidden">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-baseline gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
                        <span className="text-sm text-slate-500">Track leads from inquiry to completion</span>
                    </div>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" /> New Deal
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { id: "deals" as const, label: "Active Deals", icon: Kanban },
                        { id: "all" as const, label: "All Deals", icon: List },
                        { id: "reactivation" as const, label: "Reactivation", icon: RotateCcw },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white"}`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 flex flex-col min-h-0">
                    {activeTab === "deals" && (
                        <>
                            <ConversionScoreboard deals={deals} />
                            <div className="flex-1 min-h-0 overflow-x-auto flex flex-col">
                                <DealBoard
                                    deals={deals}
                                    setDeals={setDeals}
                                    onSelectDeal={setSelectedDeal}
                                />
                            </div>
                        </>
                    )}
                    {activeTab === "all" && (
                        <AllDealsTable deals={deals} onSelectDeal={setSelectedDeal} />
                    )}
                    {activeTab === "reactivation" && (
                        <ReactivationTab onWinBack={handleWinBack} />
                    )}

                </div>

                {/* Deal Detail Panel */}
                <DealDetailPanel
                    deal={selectedDeal}
                    isOpen={!!selectedDeal}
                    onClose={() => setSelectedDeal(null)}
                    onStatusChange={async (id, status) => {
                        // Update local state immediately
                        setDeals(prev => prev.map(d => d.id === id ? { ...d, status } : d));
                        setSelectedDeal(prev => prev && prev.id === id ? { ...prev, status } : prev);

                        // Persist to database
                        try {
                            const response = await fetch("/api/deals", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id, status })
                            });
                            if (response.ok) {
                                toast.success(`Status updated to ${status.replace(/_/g, " ")}`);
                            } else {
                                toast.error("Failed to save status");
                            }
                        } catch (error) {
                            toast.error("Failed to save status");
                        }
                    }}
                    onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
                />
            </div>
        </>
    );
}

