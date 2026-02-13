"use client";

import { useState } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
    Search, Users, Upload, X, Plus, Crown, Truck, Hash, Car, Check, ChevronRight
} from "lucide-react";

// ============= TYPES =============
export interface Customer {
    id: string;
    name: string;
    first_name?: string; // Handling both potential shapes
    last_name?: string;
    phone: string;
    email: string;
    vehicles: { year: string; make: string; model: string; }[];
    totalSpend: number;
    lastVisit: string;
    tags: string[];
    isVip: boolean;
    isFleet: boolean;
    status?: string;
    last_contacted_at?: string;
}

interface CustomersClientProps {
    initialCustomers: any[]; // Accepting any for now to map to our internal Customer type
    merchantId: string;
}

export function CustomersClient({ initialCustomers, merchantId }: CustomersClientProps) {
    // Map initialCustomers to our internal Customer type if needed
    // For now we assume the shape is close enough or we normalize it.
    // In a real app we'd do a proper mapping here.
    const normalizedCustomers: Customer[] = initialCustomers.map(c => ({
        id: c.id,
        name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
        phone: c.phone || c.phone_number || '',
        email: c.email || '',
        vehicles: c.vehicles || [], // Assume vehicles is a jsonb or array field
        totalSpend: c.total_spend || c.totalSpend || 0,
        lastVisit: c.last_visit || c.lastVisit || new Date().toISOString(),
        tags: c.tags || [],
        isVip: c.is_vip || c.isVip || false,
        isFleet: c.is_fleet || c.isFleet || false,
        status: c.status,
        last_contacted_at: c.last_contacted_at
    }));

    const [activeFilter, setActiveFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false);
    const [newSegmentName, setNewSegmentName] = useState("");
    const [customSegments, setCustomSegments] = useState<{ id: string; name: string; customerIds: string[] }[]>([]);

    const FILTERS = [
        { id: "all", label: "All Contacts", icon: Users, count: normalizedCustomers.length },
        { id: "vip", label: "VIPs (>$2k)", icon: Crown, count: normalizedCustomers.filter(c => c.isVip).length },
        { id: "fleet", label: "Fleets", icon: Truck, count: normalizedCustomers.filter(c => c.isFleet).length },
        { id: "inactive", label: "Inactive (>1yr)", icon: Users, count: normalizedCustomers.filter(c => new Date(c.lastVisit).getTime() < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).getTime()).length },
    ];

    const TAGS = ["WinterTires", "AudiClub", "SubaruFan"];

    const filteredCustomers = normalizedCustomers.filter(c => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const vehiclesStr = c.vehicles.map(v => `${v.year} ${v.make} ${v.model}`).join(' ').toLowerCase();
            if (!c.name.toLowerCase().includes(q) && !c.phone.includes(q) && !vehiclesStr.includes(q)) return false;
        }

        // Custom segments
        const customSegment = customSegments.find(s => s.id === activeFilter);
        if (customSegment) return customSegment.customerIds.includes(c.id);

        switch (activeFilter) {
            case "vip": return c.isVip;
            case "fleet": return c.isFleet;
            case "inactive": return new Date(c.lastVisit).getTime() < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).getTime();
            default: return true;
        }
    });

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

    // Placeholder for adding a deal - in the customers page context, this might redirect to pipeline or open a modal
    const handleAddDeal = (customer: Customer) => {
        toast.success(`Creating deal for ${customer.name}...`, {
            description: "Redirecting to pipeline..."
        });
        // Logic to actually create deal would go here
    };

    const handleBulkAction = () => {
        toast.success(`Applied action to ${selectedIds.size} customers`);
        setSelectedIds(new Set());
    };

    return (
        <div className="flex-1 p-8 pt-6 h-full flex flex-col min-h-screen bg-gray-50/50">
            {/* HEADING */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
                    <p className="text-sm text-muted-foreground">Manage your customer database and segments.</p>
                </div>
            </div>

            {/* FULL CONTENT AREA */}
            <div className="flex gap-6 h-full relative items-start">

                {/* Full-page dark overlay when modal is open */}
                {showCreateSegmentModal && (
                    <div className="fixed inset-0 bg-black/70 z-40" onClick={() => setShowCreateSegmentModal(false)} />
                )}

                {/* SIDEBAR - Premium dark styling logic ported from pipeline */}
                <div className={`w-64 flex-shrink-0 space-y-6 bg-white rounded-xl p-4 border border-slate-200 shadow-sm transition-all ${showCreateSegmentModal ? "opacity-50 pointer-events-none" : ""}`}>
                    {/* Smart Segments */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Smart Segments</h4>
                            <Badge variant="outline" className="text-xs">{normalizedCustomers.length} total</Badge>
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
                                            : "text-slate-700 hover:bg-slate-50 hover:shadow-sm"}`}
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
                            <div className="flex items-center gap-2 mb-3 mt-6">
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
                                            : "text-slate-700 hover:bg-slate-50 hover:shadow-sm"}`}
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
                        <div className="flex items-center gap-2 mb-3 mt-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tags</h4>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {TAGS.map(tag => (
                                <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-slate-100 transition-all py-1.5 px-2.5">
                                    <Hash className="h-3 w-3 mr-1 text-slate-400" />
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white mt-6">
                        <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Database Value</p>
                        <p className="text-2xl font-bold">${normalizedCustomers.reduce((sum, c) => sum + c.totalSpend, 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-1">Lifetime customer spend</p>
                    </div>
                </div>

                {/* MAIN TABLE AREA */}
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
                        <Button onClick={() => setShowImportModal(true)} className="h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                            <Upload className="h-4 w-4 mr-2" />
                            Import CSV
                        </Button>
                    </div>

                    {/* Selection Toolbar */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-3 mb-4 p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-lg animate-in slide-in-from-top-2">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <Users className="h-4 w-4" />
                            </div>
                            <span className="font-semibold">{selectedIds.size} customers selected</span>
                            <div className="flex-1" />
                            <Button size="sm" onClick={() => setShowCreateSegmentModal(true)} className="bg-white text-slate-900 hover:bg-slate-100">
                                <Users className="h-4 w-4 mr-1.5" />
                                Create Segment
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleBulkAction} className="bg-white/20 text-white hover:bg-white/30 border-0">
                                <Check className="h-4 w-4 mr-1.5" />
                                Bulk Action
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-white/70 hover:text-white hover:bg-white/10">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Table */}
                    <Card className="flex-1 overflow-hidden shadow-sm border-slate-200">
                        <div className="overflow-auto max-h-[calc(100vh-250px)]">
                            <table className="w-full">
                                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-4 w-12 bg-slate-50">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                                                onChange={toggleSelectAll}
                                                className="rounded border-slate-300 w-4 h-4"
                                            />
                                        </th>
                                        <th className="px-4 py-4 font-semibold bg-slate-50">Customer</th>
                                        <th className="px-4 py-4 font-semibold bg-slate-50">Phone</th>
                                        <th className="px-4 py-4 font-semibold bg-slate-50">Vehicles</th>
                                        <th className="px-4 py-4 font-semibold bg-slate-50">Total Spend</th>
                                        <th className="px-4 py-4 font-semibold bg-slate-50">Last Visit</th>
                                        <th className="px-4 py-4 font-semibold w-28 bg-slate-50">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {filteredCustomers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                                                No customers found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCustomers.map((customer) => (
                                            <tr
                                                key={customer.id}
                                                className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${selectedIds.has(customer.id) ? "bg-blue-50/70" : ""}`}
                                            >
                                                <td className="px-4 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(customer.id)}
                                                        onChange={(e) => { e.stopPropagation(); toggleSelect(customer.id); }}
                                                        className="rounded border-slate-300 w-4 h-4 cursor-pointer"
                                                        onClick={(e) => e.stopPropagation()}
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
                                                <td className="px-4 py-4 text-slate-600 font-mono text-sm" onClick={() => setSelectedCustomer(customer)}>{customer.phone}</td>
                                                <td className="px-4 py-4" onClick={() => setSelectedCustomer(customer)}>
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                                        <Car className="h-3 w-3 mr-1" />
                                                        {customer.vehicles.length} {customer.vehicles.length === 1 ? "Car" : "Cars"}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4" onClick={() => setSelectedCustomer(customer)}>
                                                    <span className={`font-mono font-bold text-lg ${customer.totalSpend >= 2000 ? "text-green-600" : "text-slate-700"}`}>
                                                        ${customer.totalSpend.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-slate-500 text-sm" onClick={() => setSelectedCustomer(customer)}>{new Date(customer.lastVisit).toLocaleDateString()}</td>
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
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* CREATE SEGMENT MODAL */}
                {showCreateSegmentModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto" onClick={e => e.stopPropagation()}>
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
                    <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 p-4 shadow-xl z-20 h-full overflow-auto absolute right-0 top-0 bottom-0 lg:relative lg:h-auto lg:shadow-none animate-in slide-in-from-right-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-slate-900">{selectedCustomer.name}</h3>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Contact</p>
                                <p className="text-sm font-medium text-slate-900">{selectedCustomer.phone}</p>
                                <p className="text-sm text-slate-600">{selectedCustomer.email}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Vehicles</p>
                                {selectedCustomer.vehicles.length === 0 ? <p className="text-sm text-slate-400">No vehicles</p> :
                                    selectedCustomer.vehicles.map((v, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm py-1">
                                            <Car className="h-4 w-4 text-slate-400" />
                                            {v.year} {v.make} {v.model}
                                        </div>
                                    ))
                                }
                            </div>
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Spend</p>
                                    <p className="text-xl font-bold text-green-600">${selectedCustomer.totalSpend.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Last Visit</p>
                                    <p className="text-sm text-slate-900">{new Date(selectedCustomer.lastVisit).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <Button className="w-full bg-[#906CDD] hover:bg-[#7a5bb5]" onClick={() => handleAddDeal(selectedCustomer)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Start Deal / Quote
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => toast.info("Opening conversion history...")}>
                                View Conversation
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

                                            // Parse CSV logic (same as before)
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
                                                // Basic valid check
                                                if (values[0]) importedCount++;
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
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-10 w-10 text-slate-300" />
                                    <span className="font-semibold text-slate-700">Click to upload .CSV</span>
                                    <span className="text-xs text-slate-500">or drag and drop here</span>
                                </div>
                            </label>

                            <div className="flex justify-end">
                                <Button variant="ghost" onClick={() => setShowImportModal(false)}>Cancel</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}