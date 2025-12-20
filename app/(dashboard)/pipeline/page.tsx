"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { formatDistanceToNow } from "date-fns";
import {
    Phone, MessageSquare, Globe, TrendingUp, DollarSign,
    Users, AlertCircle, Clock, Car, Kanban, Database,
    Search, Upload, X, Plus, ChevronRight, Truck, Crown, UserX, Hash
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
    issue: string;
    value: number;
    source: "phone" | "sms" | "google";
    created_at: string;
    status: "new_inquiry" | "quote_sent" | "follow_up" | "booked";
}

interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string;
    vehicles: { year: string; make: string; model: string; }[];
    totalSpend: number;
    lastVisit: string;
    tags: string[];
    isVip: boolean;
    isFleet: boolean;
}

type ColumnId = "new_inquiry" | "quote_sent" | "follow_up" | "booked";

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
];

// ============= MOCK DEALS DATA =============
const MOCK_DEALS: Deal[] = [
    { id: "d1", vehicle: { year: "2018", make: "Ford", model: "F-150" }, customer_name: "John Martinez", issue: "Brake Squeak", value: 850, source: "phone", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), status: "new_inquiry" },
    { id: "d2", vehicle: { year: "2020", make: "Toyota", model: "Camry" }, customer_name: "Sarah Chen", issue: "Check Engine Light", value: 1200, source: "sms", created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), status: "new_inquiry" },
    { id: "d3", vehicle: { year: "2017", make: "Honda", model: "Accord" }, customer_name: "Mike Thompson", issue: "Transmission Flush", value: 450, source: "google", created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), status: "quote_sent" },
    { id: "d4", vehicle: { year: "2019", make: "Chevrolet", model: "Silverado" }, customer_name: "Robert Davis", issue: "AC Not Cooling", value: 980, source: "phone", created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), status: "quote_sent" },
    { id: "d5", vehicle: { year: "2021", make: "Subaru", model: "Outback" }, customer_name: "Emily Wilson", issue: "Tire Alignment", value: 150, source: "sms", created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), status: "follow_up" },
    { id: "d6", vehicle: { year: "2016", make: "BMW", model: "X5" }, customer_name: "James Anderson", issue: "Oil Change + Inspection", value: 350, source: "google", created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), status: "booked" }
];

// ============= MOCK CUSTOMERS DATA =============
const MOCK_CUSTOMERS: Customer[] = [
    { id: "c1", name: "Marcus Johnson", phone: "(555) 123-4567", email: "marcus@email.com", vehicles: [{ year: "2021", make: "Mercedes", model: "GLE 350" }, { year: "2019", make: "Porsche", model: "Cayenne" }], totalSpend: 8450, lastVisit: "2024-03-10", tags: ["WinterTires"], isVip: true, isFleet: false },
    { id: "c2", name: "ABC Plumbing Co.", phone: "(555) 234-5678", email: "fleet@abcplumbing.com", vehicles: [{ year: "2022", make: "Ford", model: "Transit" }, { year: "2021", make: "Ford", model: "Transit" }, { year: "2020", make: "Ford", model: "E-350" }], totalSpend: 12800, lastVisit: "2024-03-08", tags: [], isVip: true, isFleet: true },
    { id: "c3", name: "Sandra Williams", phone: "(555) 345-6789", email: "sandra.w@email.com", vehicles: [{ year: "2018", make: "Audi", model: "Q5" }], totalSpend: 4200, lastVisit: "2024-02-15", tags: ["AudiClub"], isVip: true, isFleet: false },
    { id: "c4", name: "Tom's Landscaping", phone: "(555) 456-7890", email: "tom@landscaping.com", vehicles: [{ year: "2019", make: "Chevrolet", model: "Silverado" }, { year: "2020", make: "Chevrolet", model: "Silverado" }], totalSpend: 6700, lastVisit: "2024-03-12", tags: [], isVip: true, isFleet: true },
    { id: "c5", name: "Rachel Green", phone: "(555) 567-8901", email: "rgreen@email.com", vehicles: [{ year: "2017", make: "Honda", model: "CR-V" }], totalSpend: 890, lastVisit: "2023-09-20", tags: [], isVip: false, isFleet: false },
    { id: "c6", name: "Kevin Chen", phone: "(555) 678-9012", email: "kchen@email.com", vehicles: [{ year: "2020", make: "Toyota", model: "RAV4" }], totalSpend: 1250, lastVisit: "2024-01-05", tags: ["WinterTires"], isVip: false, isFleet: false },
    { id: "c7", name: "Quick Delivery Inc.", phone: "(555) 789-0123", email: "dispatch@quickdelivery.com", vehicles: [{ year: "2021", make: "Ram", model: "ProMaster" }, { year: "2020", make: "Ram", model: "ProMaster" }, { year: "2019", make: "Ram", model: "ProMaster" }, { year: "2022", make: "Ford", model: "Transit Connect" }], totalSpend: 18900, lastVisit: "2024-03-14", tags: [], isVip: true, isFleet: true },
    { id: "c8", name: "Lisa Park", phone: "(555) 890-1234", email: "lpark@email.com", vehicles: [{ year: "2022", make: "BMW", model: "X3" }], totalSpend: 2100, lastVisit: "2024-02-28", tags: [], isVip: true, isFleet: false },
    { id: "c9", name: "David Miller", phone: "(555) 901-2345", email: "dmiller@email.com", vehicles: [{ year: "2015", make: "Ford", model: "F-150" }], totalSpend: 450, lastVisit: "2022-11-10", tags: [], isVip: false, isFleet: false },
    { id: "c10", name: "Jennifer Adams", phone: "(555) 012-3456", email: "jadams@email.com", vehicles: [{ year: "2019", make: "Subaru", model: "Forester" }], totalSpend: 3400, lastVisit: "2024-03-01", tags: ["SubaruFan"], isVip: true, isFleet: false },
];

// ============= HELPER FUNCTIONS =============
function triggerAutoFollowUp(dealId: string, customerName: string) {
    toast.info(`📧 Auto-follow-up scheduled for ${customerName}`, { description: "SMS will be sent in 2 hours if no response" });
}

// ============= CONVERSION SCOREBOARD =============
function ConversionScoreboard({ deals }: { deals: Deal[] }) {
    const newLeads = deals.filter(d => d.status === "new_inquiry").length;
    const booked = deals.filter(d => d.status === "booked").length;
    const closeRate = deals.length > 0 ? Math.round((booked / deals.length) * 100) : 0;
    const pipelineValue = deals.reduce((sum, d) => sum + d.value, 0);
    const stalledQuotes = deals.filter(d => d.status === "follow_up").length;

    const cards = [
        { label: "New Leads", value: newLeads, icon: Users, color: "text-slate-700" },
        { label: "Close Rate", value: `${closeRate}%`, icon: TrendingUp, color: "text-green-600" },
        { label: "Pipeline Value", value: `$${pipelineValue.toLocaleString()}`, icon: DollarSign, color: "text-blue-600" },
        { label: "Stalled Quotes", value: stalledQuotes, icon: AlertCircle, color: stalledQuotes > 0 ? "text-amber-600" : "text-slate-500" },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {cards.map((card) => (
                <Card key={card.label} className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <card.icon className="h-4 w-4" /> {card.label}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className={`text-3xl font-mono font-bold ${card.color}`}>{card.value}</span>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ============= DEAL CARD =============
function DealCard({ deal, index }: { deal: Deal; index: number }) {
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
                    className={`bg-white rounded-lg border p-3 mb-2 cursor-grab active:cursor-grabbing transition-shadow ${snapshot.isDragging ? "shadow-lg border-blue-300 ring-2 ring-blue-200" : "border-slate-200 hover:shadow-md"}`}
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
function DealBoard({ deals, setDeals }: { deals: Deal[]; setDeals: (deals: Deal[]) => void }) {
    const handleDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const deal = deals.find(d => d.id === draggableId);
        if (!deal) return;

        const newStatus = destination.droppableId as ColumnId;
        const oldStatus = deal.status;
        const updatedDeals = deals.map(d => d.id === draggableId ? { ...d, status: newStatus } : d);
        setDeals(updatedDeals);

        if (newStatus === "follow_up" && oldStatus !== "follow_up") triggerAutoFollowUp(deal.id, deal.customer_name);
        if (newStatus === "booked") toast.success(`🎉 ${deal.customer_name} booked!`, { description: `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model} - $${deal.value}` });
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 min-h-0">
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
                                        {columnDeals.map((deal, index) => (<DealCard key={deal.id} deal={deal} index={index} />))}
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

// ============= CUSTOMER DATABASE COMPONENT =============
function CustomerDatabase({ onAddDeal }: { onAddDeal: (customer: Customer) => void }) {
    const [activeFilter, setActiveFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false);
    const [newSegmentName, setNewSegmentName] = useState("");
    const [customSegments, setCustomSegments] = useState<{ id: string; name: string; customerIds: string[] }[]>([]);

    const FILTERS = [
        { id: "all", label: "All Contacts", icon: Users, count: MOCK_CUSTOMERS.length },
        { id: "vip", label: "VIPs (>$2k)", icon: Crown, count: MOCK_CUSTOMERS.filter(c => c.isVip).length },
        { id: "fleet", label: "Fleets", icon: Truck, count: MOCK_CUSTOMERS.filter(c => c.isFleet).length },
        { id: "inactive", label: "Inactive (>1yr)", icon: UserX, count: MOCK_CUSTOMERS.filter(c => new Date(c.lastVisit) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)).length },
    ];

    const TAGS = ["WinterTires", "AudiClub", "SubaruFan"];

    const filteredCustomers = MOCK_CUSTOMERS.filter(c => {
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
        const selectedCustomers = MOCK_CUSTOMERS.filter(c => selectedIds.has(c.id));
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
                            <Badge variant="outline" className="text-xs">{MOCK_CUSTOMERS.length} total</Badge>
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
                        <p className="text-2xl font-bold">${MOCK_CUSTOMERS.reduce((sum, c) => sum + c.totalSpend, 0).toLocaleString()}</p>
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
                                                {customer.tags.length > 0 && (
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
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImportModal(false)}>
                        <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold">Import Customer Data</h3>
                                <Button variant="ghost" size="sm" onClick={() => setShowImportModal(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-sm text-slate-600 mb-6">Import your existing customer database from your shop management software.</p>

                            {/* Dropzone */}
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer mb-4">
                                <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                                <p className="font-medium text-slate-700">Drop your CSV file here or click to browse</p>
                                <p className="text-sm text-slate-500 mt-2">Supported formats: Mitchell 1, Manager SE, Tekmetric</p>
                            </div>

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

// ============= MAIN PAGE =============
export default function PipelinePage() {
    const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
    const [activeTab, setActiveTab] = useState<"deals" | "database">("deals");

    const handleAddDealFromCustomer = (customer: Customer) => {
        const newDeal: Deal = {
            id: `d${Date.now()}`,
            vehicle: customer.vehicles[0] || { year: "", make: "Unknown", model: "" },
            customer_name: customer.name,
            issue: "New Inquiry",
            value: 0,
            source: "phone",
            created_at: new Date().toISOString(),
            status: "new_inquiry"
        };
        setDeals(prev => [newDeal, ...prev]);
    };

    return (
        <div className="h-full flex flex-col p-6 bg-slate-100 overflow-hidden">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Revenue Pipeline</h1>
                    <p className="text-slate-500 text-sm">Track leads from inquiry to booked appointment</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab("deals")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "deals" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white"}`}
                >
                    <Kanban className="h-4 w-4" />
                    Active Deals
                </button>
                <button
                    onClick={() => setActiveTab("database")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "database" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white"}`}
                >
                    <Database className="h-4 w-4" />
                    Customer Database
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === "deals" && (
                    <>
                        <ConversionScoreboard deals={deals} />
                        <DealBoard deals={deals} setDeals={setDeals} />
                    </>
                )}
                {activeTab === "database" && (
                    <CustomerDatabase onAddDeal={handleAddDealFromCustomer} />
                )}
            </div>
        </div>
    );
}
