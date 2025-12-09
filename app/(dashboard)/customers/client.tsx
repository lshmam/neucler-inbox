"use client";

import { useState } from "react";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { CustomerSheet } from "@/components/customers/customer-sheet";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Search, Filter, Download, MoreHorizontal,
    Users, UserPlus, AlertCircle,
    MessageSquare, Tag, Trash2, Sparkles, Plus
} from "lucide-react";

// Helper for relative time
const getRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
};

// Status badge styling
const getStatusBadge = (status: string | null) => {
    switch (status?.toLowerCase()) {
        case 'active':
            return { label: "Active", color: "bg-green-100 text-green-800 border-green-200" };
        case 'cold':
            return { label: "Cold", color: "bg-gray-100 text-gray-600 border-gray-200" };
        case 'new':
        case 'new_lead':
        default:
            return { label: "New Lead", color: "bg-blue-100 text-blue-800 border-blue-200" };
    }
};

interface CustomersClientProps {
    initialCustomers: any[];
    merchantId: string;
}

export function CustomersClient({ initialCustomers, merchantId }: CustomersClientProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    // Sheet state
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // FILTER LOGIC
    const filteredCustomers = initialCustomers.filter((c) => {
        const matchesSearch =
            c.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone_number?.includes(searchQuery);

        if (!matchesSearch) return false;

        if (activeTab === "active") return c.status === "active";
        if (activeTab === "new") return c.status === "new" || c.status === "new_lead" || !c.status;
        if (activeTab === "cold") return c.status === "cold";
        return true; // "all"
    });

    // SELECTION LOGIC
    const handleSelectAll = () => {
        setSelectedIds(selectedIds.length === filteredCustomers.length ? [] : filteredCustomers.map(c => c.id));
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // Open customer sheet
    const handleRowClick = (customer: any) => {
        setSelectedCustomer(customer);
        setIsSheetOpen(true);
    };

    // METRICS CALCULATION
    const totalCustomers = initialCustomers.length;
    const newLeads = initialCustomers.filter(c => !c.status || c.status === 'new' || c.status === 'new_lead').length;
    const activeCount = initialCustomers.filter(c => c.status === 'active').length;
    const coldCount = initialCustomers.filter(c => c.status === 'cold').length;

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 relative min-h-screen bg-gray-50/50">
            {/* HEADING */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center border shadow-sm">
                        <Users className="h-6 w-6 text-[#906CDD]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
                        <p className="text-sm text-muted-foreground">Manage leads, track conversations, and build relationships.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" className="bg-white border-slate-200 shadow-sm hover:bg-slate-50">
                        <Download className="mr-2 h-4 w-4 text-slate-500" /> Export
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(true)} className="bg-[#906CDD] hover:bg-[#7a5bb5] text-white shadow-md shadow-purple-100">
                        <Plus className="mr-2 h-4 w-4" /> Add Customer
                    </Button>
                </div>
            </div>

            {/* SNAPSHOT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
                        <Users className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{totalCustomers}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">New Leads</CardTitle>
                        <UserPlus className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{newLeads}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                        <Sparkles className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-orange-100 bg-orange-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700">Cold Leads</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700">{coldCount}</div>
                        <p className="text-xs text-orange-600/80">Needs follow-up</p>
                    </CardContent>
                </Card>
            </div>

            {/* ACTIONS & FILTERS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-1 rounded-lg border shadow-sm">
                <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={setActiveTab}>
                    <TabsList className="bg-transparent p-0">
                        <TabsTrigger value="all" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 rounded-md px-4 py-2">All</TabsTrigger>
                        <TabsTrigger value="new" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 rounded-md px-4 py-2">New Leads</TabsTrigger>
                        <TabsTrigger value="active" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 rounded-md px-4 py-2">Active</TabsTrigger>
                        <TabsTrigger value="cold" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 rounded-md px-4 py-2">Cold</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex items-center gap-2 w-full sm:w-auto p-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email, phone..."
                            className="pl-8 bg-slate-50 border-slate-200 focus-visible:ring-[#906CDD]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* DATA TABLE */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Name / Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead>Last Contact</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.map((customer) => {
                            const statusBadge = getStatusBadge(customer.status);
                            const tags = customer.tags || [];

                            return (
                                <TableRow
                                    key={customer.id}
                                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                    onClick={() => handleRowClick(customer)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedIds.includes(customer.id)}
                                            onCheckedChange={() => toggleSelection(customer.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900">
                                                {customer.first_name} {customer.last_name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {customer.phone_number || customer.email || "No contact info"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${statusBadge.color} font-medium border`}>
                                            {statusBadge.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 flex-wrap">
                                            {tags.slice(0, 2).map((tag: string, i: number) => (
                                                <Badge key={i} variant="secondary" className="text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                            {tags.length > 2 && (
                                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                                    +{tags.length - 2}
                                                </Badge>
                                            )}
                                            {tags.length === 0 && (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-slate-700">
                                                {getRelativeTime(customer.last_contacted_at)}
                                            </span>
                                            {customer.last_contact_channel && (
                                                <span className="text-xs text-muted-foreground capitalize">
                                                    via {customer.last_contact_channel}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* FLOATING ACTION BAR */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-auto bg-slate-900 text-white p-3 rounded-xl shadow-2xl flex items-center z-50 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-4 pl-2">
                        <div className="bg-[#906CDD] text-white px-3 py-1 rounded-full text-xs font-bold">{selectedIds.length} Selected</div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="secondary" className="h-8">
                            <MessageSquare className="h-3 w-3 mr-2" /> Send SMS
                        </Button>
                        <Button size="sm" variant="outline" className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 h-8">
                            <Tag className="h-3 w-3 mr-2" /> Add Tag
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-900/20 hover:text-red-300 h-8 px-2">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ADD CUSTOMER DIALOG */}
            <AddCustomerDialog
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                merchantId={merchantId}
            />

            {/* CUSTOMER SHEET (Slide-over) */}
            <CustomerSheet
                customer={selectedCustomer}
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
            />
        </div>
    );
}