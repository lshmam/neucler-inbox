"use client";

import { useState } from "react";
import {
    Phone, Mail, MessageSquare, Globe,
    PlayCircle, Clock, Search, User, Send,
    MoreVertical, CheckCircle2, Bot, AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface Interaction {
    id: string;
    type: 'sms' | 'voice' | 'email' | 'web_chat';
    direction: 'inbound' | 'outbound';
    customer: string;
    contact_info: string;
    timestamp: string;
    content: string;
    status: string;
    summary?: string;
    subject?: string;
    recording?: string;
    duration?: number;
}

export function CommunicationsClient({ initialData }: { initialData: Interaction[] }) {
    const [selectedId, setSelectedId] = useState<string | null>(initialData[0]?.id || null);
    const [filter, setFilter] = useState("all");

    // Filter logic
    const filteredData = initialData.filter(item =>
        filter === "all" ? true : item.type === filter
    );

    const selectedItem = initialData.find(item => item.id === selectedId);

    // Helper to format dates
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
        });
    };

    // Helper for Icons
    const TypeIcon = ({ type }: { type: string }) => {
        switch (type) {
            case 'voice': return <Phone className="h-4 w-4 text-orange-500" />;
            case 'email': return <Mail className="h-4 w-4 text-blue-500" />;
            case 'web_chat': return <Globe className="h-4 w-4 text-indigo-500" />;
            default: return <MessageSquare className="h-4 w-4 text-green-500" />;
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50/50">

            {/* --- LEFT SIDEBAR: UNIFIED INBOX --- */}
            <div className="w-[400px] border-r bg-white flex flex-col">

                {/* Header & Filters */}
                <div className="p-4 border-b space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Inbox</h2>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">{filteredData.length}</Badge>
                    </div>
                    <div className="flex gap-2">
                        {['all', 'sms', 'voice', 'email'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilter(type)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filter === type ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search conversations..." className="pl-9 bg-slate-50 border-slate-200" />
                    </div>
                </div>

                {/* List */}
                <ScrollArea className="flex-1">
                    {filteredData.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setSelectedId(item.id)}
                            className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition-all ${selectedId === item.id ? 'bg-purple-50/50 border-l-4 border-l-[#906CDD]' : 'border-l-4 border-l-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    <TypeIcon type={item.type} />
                                    <span className={`font-semibold text-sm ${selectedId === item.id ? 'text-[#906CDD]' : 'text-slate-700'}`}>
                                        {item.customer}
                                    </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">{formatDate(item.timestamp)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                                {item.type === 'voice' && item.summary ? (
                                    <span className="text-orange-600 font-medium">AI Summary: {item.summary}</span>
                                ) : (
                                    item.type === 'email' ? item.subject : item.content
                                )}
                            </p>
                        </div>
                    ))}
                </ScrollArea>
            </div>

            {/* --- RIGHT SIDEBAR: DYNAMIC DETAILS --- */}
            <div className="flex-1 flex flex-col bg-slate-50/30">
                {selectedItem ? (
                    <>
                        {/* Detail Header */}
                        <div className="h-16 border-b bg-white px-6 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 border">
                                    <AvatarFallback className="bg-slate-100 text-slate-600">
                                        {selectedItem.customer.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900">{selectedItem.customer}</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        {selectedItem.contact_info} • <Badge variant="outline" className="text-[10px] h-4 px-1">{selectedItem.status}</Badge>
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </div>

                        {/* Detail Content - Changes based on Type */}
                        <ScrollArea className="flex-1 p-8">

                            {/* 1. VOICE CALL VIEW */}
                            {selectedItem.type === 'voice' && (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Phone className="h-5 w-5 text-orange-500" /> Call Recording
                                            </CardTitle>
                                            <CardDescription>Duration: {selectedItem.duration}s</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {selectedItem.recording ? (
                                                <div className="bg-slate-100 p-3 rounded-full flex items-center gap-3 px-4">
                                                    <PlayCircle className="h-8 w-8 text-[#906CDD] cursor-pointer" />
                                                    <div className="h-1.5 flex-1 bg-slate-300 rounded-full overflow-hidden">
                                                        <div className="h-full w-1/3 bg-[#906CDD]"></div>
                                                    </div>
                                                    <span className="text-xs font-mono text-slate-500">0:12 / {selectedItem.duration}</span>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground italic">No recording available.</div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {selectedItem.summary && (
                                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                                            <h4 className="text-sm font-bold text-orange-800 mb-1 flex items-center gap-2">
                                                <Bot className="h-4 w-4" /> AI Summary
                                            </h4>
                                            <p className="text-sm text-orange-700 leading-relaxed">{selectedItem.summary}</p>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm">Transcript</h4>
                                        <div className="bg-white p-6 rounded-lg border shadow-sm text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                                            {selectedItem.content}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 2. SMS & CHAT VIEW */}
                            {(selectedItem.type === 'sms' || selectedItem.type === 'web_chat') && (
                                <div className="max-w-2xl mx-auto space-y-4">
                                    <div className={`flex ${selectedItem.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm shadow-sm ${selectedItem.direction === 'outbound'
                                            ? 'bg-[#906CDD] text-white rounded-br-sm'
                                            : 'bg-white border text-slate-800 rounded-bl-sm'
                                            }`}>
                                            {selectedItem.content}
                                        </div>
                                    </div>
                                    {/* Mock Reply Box */}
                                    <div className="mt-8 p-4 bg-white rounded-xl border shadow-sm">
                                        <textarea placeholder="Type a reply..." className="w-full resize-none outline-none text-sm min-h-[60px]" />
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="flex gap-2">
                                                <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">Suggest Reply</Badge>
                                            </div>
                                            <Button size="sm" className="bg-[#906CDD] hover:bg-[#7a5bb5]"><Send className="h-3 w-3 mr-2" /> Send</Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. EMAIL VIEW */}
                            {selectedItem.type === 'email' && (
                                <div className="max-w-3xl mx-auto bg-white border rounded-xl shadow-sm overflow-hidden">
                                    <div className="bg-slate-50 p-6 border-b space-y-2">
                                        <h2 className="text-xl font-bold">{selectedItem.subject}</h2>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">To: <span className="text-slate-900 font-medium">{selectedItem.customer}</span> ({selectedItem.contact_info})</span>
                                            <span className="text-muted-foreground">{formatDate(selectedItem.timestamp)}</span>
                                        </div>
                                    </div>
                                    <div
                                        className="p-8 prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: selectedItem.content }}
                                    />
                                </div>
                            )}

                        </ScrollArea>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <div className="bg-white p-4 rounded-full mb-4 shadow-sm">
                            <MessageSquare className="h-8 w-8 text-slate-300" />
                        </div>
                        <p>Select a conversation to view details.</p>
                    </div>
                )}
            </div>
        </div>
    );
}