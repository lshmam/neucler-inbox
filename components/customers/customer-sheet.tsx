"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, MessageSquare, Mic, Calendar, DollarSign, Tag, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CustomerSheetProps {
    customer: any | null; // Replace 'any' with your Customer type
    isOpen: boolean;
    onClose: () => void;
}

export function CustomerSheet({ customer, isOpen, onClose }: CustomerSheetProps) {
    if (!customer) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col gap-0 p-0 bg-white">

                {/* HEADER: Identity & Quick Actions */}
                <div className="p-6 border-b bg-slate-50">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex gap-4">
                            <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-blue-600 text-white text-xl">
                                    {customer.first_name?.[0]}{customer.last_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <SheetTitle className="text-xl font-bold">
                                    {customer.first_name} {customer.last_name}
                                </SheetTitle>                                <div className="flex gap-2 mt-1">
                                    <Badge variant="outline" className="bg-white">{customer.status || 'Lead'}</Badge>
                                    {customer.total_spend_cents > 100000 && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">VIP</Badge>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700">
                            <MessageSquare className="mr-2 h-4 w-4" /> Send SMS
                        </Button>
                        <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                            <Mic className="mr-2 h-4 w-4" /> AI Call
                        </Button>
                    </div>
                </div>

                {/* TABS: The "Meat" of the profile */}
                <Tabs defaultValue="activity" className="flex-1 flex flex-col">
                    <div className="px-6 pt-4 border-b">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="activity">Timeline</TabsTrigger>
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="automations">Automations</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 p-6 h-full bg-slate-50/50">

                        {/* TAB 1: TIMELINE */}
                        <TabsContent value="activity" className="mt-0 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Activity</h3>

                                {/* Mock Activity Item: Call */}
                                <div className="flex gap-4">
                                    <div className="mt-1 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                        <Phone className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Incoming Call from {customer.first_name}</p>
                                        <p className="text-xs text-muted-foreground">Duration: 2m 14s • Handled by AI Agent</p>
                                        <p className="text-xs text-slate-400">Today, 2:30 PM</p>
                                    </div>
                                </div>

                                {/* Mock Activity Item: SMS */}
                                <div className="flex gap-4">
                                    <div className="mt-1 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <MessageSquare className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Campaign Sent: "Winter Promo"</p>
                                        <p className="text-xs text-muted-foreground">Delivered successfully.</p>
                                        <p className="text-xs text-slate-400">Yesterday, 9:00 AM</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* TAB 2: DETAILS */}
                        <TabsContent value="details" className="mt-0 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-white rounded-lg border shadow-sm">
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="font-medium text-sm truncate">{customer.email}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border shadow-sm">
                                    <p className="text-xs text-muted-foreground">Phone</p>
                                    <p className="font-medium text-sm">{customer.phone_number}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border shadow-sm">
                                    <p className="text-xs text-muted-foreground">Lifetime Value</p>
                                    <p className="font-medium text-sm">${(customer.total_spend_cents / 100).toFixed(2)}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border shadow-sm">
                                    <p className="text-xs text-muted-foreground">Total Visits</p>
                                    <p className="font-medium text-sm">{customer.visit_count || 0}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {customer.tags?.map((tag: string) => (
                                        <Badge key={tag} variant="secondary">{tag}</Badge>
                                    )) || <span className="text-sm text-slate-400">No tags yet</span>}
                                    <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">+ Add</Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Private Notes</label>
                                <textarea
                                    className="w-full p-3 text-sm border rounded-md bg-white min-h-[100px] focus:outline-none focus:ring-1 ring-slate-200"
                                    placeholder="Add a note about this customer..."
                                    defaultValue={customer.notes}
                                />
                            </div>
                        </TabsContent>

                        {/* TAB 3: AUTOMATIONS */}
                        <TabsContent value="automations" className="mt-0">
                            <div className="p-4 border rounded-lg bg-white space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-orange-500" />
                                        <span className="font-medium text-sm">Review Booster</span>
                                    </div>
                                    <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Active</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">Will send a review request SMS 2 hours after next visit.</p>
                            </div>
                        </TabsContent>

                    </ScrollArea>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}