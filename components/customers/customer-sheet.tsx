"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Phone, MessageSquare, Pencil, Check, X,
    Sparkles, MapPin, Heart, Plus,
    PhoneIncoming, MousePointer, Send, Bot, Clock, FileText
} from "lucide-react";

interface CustomerSheetProps {
    customer: any | null;
    isOpen: boolean;
    onClose: () => void;
}

// Helper for relative time
const getRelativeTime = (dateString: string | null) => {
    if (!dateString) return "";
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
};

export function CustomerSheet({ customer, isOpen, onClose }: CustomerSheetProps) {
    const router = useRouter();
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [newTag, setNewTag] = useState("");
    const [localTags, setLocalTags] = useState<string[]>([]);
    const [localStatus, setLocalStatus] = useState("");
    const [note, setNote] = useState("");

    // Reset state when customer changes
    useEffect(() => {
        if (customer) {
            setLocalTags(customer.tags || []);
            setLocalStatus(customer.status || "new_lead");
            setNote(customer.notes || "");
            setIsEditingName(false);
        }
    }, [customer]);

    if (!customer) return null;

    const handleEditName = () => {
        setEditedName(`${customer.first_name || ''} ${customer.last_name || ''}`.trim());
        setIsEditingName(true);
    };

    const handleSaveName = () => {
        // TODO: Save to database
        setIsEditingName(false);
    };

    const handleAddTag = () => {
        if (newTag.trim() && !localTags.includes(newTag.trim())) {
            setLocalTags([...localTags, newTag.trim()]);
            setNewTag("");
            // TODO: Save to database
        }
    };

    const handleRemoveTag = (tag: string) => {
        setLocalTags(localTags.filter(t => t !== tag));
        // TODO: Save to database
    };

    const handleMessage = () => {
        // Navigate to inbox with this customer's thread
        onClose();
        router.push(`/inbox?phone=${encodeURIComponent(customer.phone_number)}`);
    };

    const handleCall = () => {
        // TODO: Initiate AI call
        console.log("Initiating call to", customer.phone_number);
    };

    // Mock activity data (replace with real data later)
    const mockActivity = [
        { type: "call", label: "AI Call", duration: "3m", time: "2h ago", icon: PhoneIncoming, color: "bg-green-100 text-green-600" },
        { type: "click", label: "Clicked Booking Link", time: "Yesterday", icon: MousePointer, color: "bg-blue-100 text-blue-600" },
        { type: "sms", label: "Sent SMS Campaign", time: "3d ago", icon: Send, color: "bg-purple-100 text-purple-600" },
    ];

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[480px] sm:w-[540px] flex flex-col gap-0 p-0 bg-white sm:max-w-[540px]">
                {/* Hidden title for accessibility */}
                <VisuallyHidden>
                    <SheetTitle>Customer Details: {customer.first_name} {customer.last_name}</SheetTitle>
                </VisuallyHidden>

                {/* HEADER - Fixed at top */}
                <div className="p-6 border-b bg-gradient-to-br from-slate-50 to-white shrink-0">
                    <div className="flex items-start gap-4 mb-5">
                        <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                            <AvatarFallback className="bg-gradient-to-br from-[#906CDD] to-[#7a5bb5] text-white text-xl font-bold">
                                {customer.first_name?.[0]?.toUpperCase() || "?"}{customer.last_name?.[0]?.toUpperCase() || ""}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        className="h-8 text-lg font-bold"
                                        autoFocus
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveName}>
                                        <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingName(false)}>
                                        <X className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-slate-900 truncate">
                                        {customer.first_name} {customer.last_name}
                                    </h2>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEditName}>
                                        <Pencil className="h-3 w-3 text-slate-400" />
                                    </Button>
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground truncate">
                                {customer.phone_number || customer.email || "No contact info"}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons - Both Blue */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={handleCall}
                            className="bg-[#906CDD] hover:bg-[#7a5bb5] text-white shadow-sm"
                        >
                            <Phone className="mr-2 h-4 w-4" /> Call
                        </Button>
                        <Button
                            onClick={handleMessage}
                            variant="outline"
                            className="border-[#906CDD] text-[#906CDD] hover:bg-[#906CDD]/10"
                        >
                            <MessageSquare className="mr-2 h-4 w-4" /> Message
                        </Button>
                    </div>
                </div>

                {/* TABS */}
                <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-4 border-b shrink-0">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="details" className="gap-2">
                                <FileText className="h-4 w-4" /> Details
                            </TabsTrigger>
                            <TabsTrigger value="timeline" className="gap-2">
                                <Clock className="h-4 w-4" /> Timeline
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* DETAILS TAB */}
                    <TabsContent value="details" className="flex-1 m-0 data-[state=inactive]:hidden">
                        <ScrollArea className="h-full">
                            {/* SECTION A: Stats Grid */}
                            <div className="p-6 border-b">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                    Lead Details
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {/* Status */}
                                    <Card className="shadow-sm">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-muted-foreground uppercase mb-1">Status</p>
                                            <Select value={localStatus} onValueChange={setLocalStatus}>
                                                <SelectTrigger className="h-8 text-xs font-medium border-0 bg-transparent p-0 shadow-none">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="new_lead">🆕 New Lead</SelectItem>
                                                    <SelectItem value="active">✅ Active</SelectItem>
                                                    <SelectItem value="contacted">📞 Contacted</SelectItem>
                                                    <SelectItem value="qualified">⭐ Qualified</SelectItem>
                                                    <SelectItem value="booked">📅 Booked</SelectItem>
                                                    <SelectItem value="closed">🎉 Closed</SelectItem>
                                                    <SelectItem value="cold">❄️ Cold</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </CardContent>
                                    </Card>

                                    {/* Source */}
                                    <Card className="shadow-sm">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-muted-foreground uppercase mb-1">Source</p>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3 w-3 text-blue-500" />
                                                <span className="text-xs font-medium truncate">
                                                    {customer.source || "Google Call"}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Sentiment */}
                                    <Card className="shadow-sm">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-muted-foreground uppercase mb-1">Sentiment</p>
                                            <div className="flex items-center gap-1.5">
                                                <Heart className="h-3 w-3 text-pink-500" />
                                                <span className="text-xs font-medium">
                                                    {customer.sentiment || "Interested"}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* SECTION B: Tags & Notes */}
                            <div className="p-6 space-y-5">
                                {/* Tags */}
                                <div>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Tags
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {localTags.map((tag: string, i: number) => (
                                            <Badge
                                                key={i}
                                                variant="secondary"
                                                className="pl-2 pr-1 py-1 flex items-center gap-1 cursor-pointer hover:bg-slate-200"
                                                onClick={() => handleRemoveTag(tag)}
                                            >
                                                {tag}
                                                <X className="h-3 w-3" />
                                            </Badge>
                                        ))}
                                        <div className="flex items-center gap-1">
                                            <Input
                                                placeholder="Add tag..."
                                                value={newTag}
                                                onChange={(e) => setNewTag(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                                                className="h-6 w-24 text-xs px-2"
                                            />
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleAddTag}>
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Insight */}
                                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-100">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#906CDD] to-blue-500 flex items-center justify-center shrink-0">
                                                <Sparkles className="h-4 w-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-purple-700 mb-1">AI Insight</p>
                                                <p className="text-sm text-slate-700">
                                                    {customer.ai_summary || "Customer called asking about services. Seemed interested in pricing. Follow up recommended."}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Internal Note */}
                                <div>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Internal Note
                                    </h3>
                                    <Textarea
                                        placeholder="Add a private note about this lead..."
                                        className="min-h-[80px] text-sm bg-amber-50/50 border-amber-100 focus-visible:ring-amber-200"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* TIMELINE TAB */}
                    <TabsContent value="timeline" className="flex-1 m-0 data-[state=inactive]:hidden">
                        <ScrollArea className="h-full">
                            <div className="p-6">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                    Activity History
                                </h3>
                                <div className="space-y-4">
                                    {mockActivity.map((activity, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className={`h-8 w-8 rounded-full ${activity.color} flex items-center justify-center shrink-0`}>
                                                <activity.icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-slate-900">{activity.label}</p>
                                                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                                                </div>
                                                {activity.duration && (
                                                    <p className="text-xs text-muted-foreground">Duration: {activity.duration}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {mockActivity.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No activity yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}