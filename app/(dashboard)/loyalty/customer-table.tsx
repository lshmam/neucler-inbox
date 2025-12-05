"use client";

import { useState } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Plus, Minus, Search } from "lucide-react";
import { adjustCustomerPoints } from "@/app/actions/loyalty";
import { toast } from "sonner"; // Assuming you have a toast lib, or use alert

export function CustomerPointsTable({ customers, merchantId, terminology }: any) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [adjustAmount, setAdjustAmount] = useState(10);
    const [reason, setReason] = useState("Manual Adjustment");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const filtered = customers.filter((c: any) =>
        c.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdjust = async (direction: 'add' | 'remove') => {
        if (!selectedCustomer) return;
        const amount = direction === 'add' ? adjustAmount : -adjustAmount;

        try {
            await adjustCustomerPoints(merchantId, selectedCustomer.id, amount, reason);
            toast.success(`Points updated for ${selectedCustomer.first_name}`);
            setIsDialogOpen(false);
        } catch (e) {
            toast.error("Failed to update points");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((c: any) => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                                <TableCell className="text-muted-foreground">{c.email || c.phone_number || "N/A"}</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {c.loyalty_balance || 0} {terminology}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { setSelectedCustomer(c); setIsDialogOpen(true); }}
                                    >
                                        Adjust
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adjust Balance: {selectedCustomer?.first_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Current Balance</span>
                            <span className="text-xl font-bold">{selectedCustomer?.loyalty_balance || 0}</span>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount</label>
                            <Input
                                type="number"
                                value={adjustAmount}
                                onChange={(e) => setAdjustAmount(Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reason</label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Service Apology"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => handleAdjust('remove')}>
                                <Minus className="mr-2 h-4 w-4" /> Remove
                            </Button>
                            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleAdjust('add')}>
                                <Plus className="mr-2 h-4 w-4" /> Add
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}