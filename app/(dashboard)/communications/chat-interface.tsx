"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Send, User, MessageSquare } from "lucide-react";
import { sendSmsReply } from "@/app/actions/communications"; // We'll make this

export function ChatInterface({ merchantId, initialConversations }: any) {
    const [selectedPhone, setSelectedPhone] = useState<string | null>(initialConversations[0]?.phone || null);
    const [input, setInput] = useState("");
    const [conversations, setConversations] = useState(initialConversations);

    const activeConv = conversations.find((c: any) => c.phone === selectedPhone);

    const handleSend = async () => {
        if (!input.trim() || !selectedPhone) return;

        // Optimistic UI Update
        const newMessage = {
            id: Date.now(), // temp id
            direction: "outbound",
            body: input,
            created_at: new Date().toISOString()
        };

        const updatedConversations = conversations.map((c: any) => {
            if (c.phone === selectedPhone) {
                return { ...c, messages: [...c.messages, newMessage] };
            }
            return c;
        });

        setConversations(updatedConversations);
        setInput("");

        // Send to Server
        await sendSmsReply(merchantId, selectedPhone, input);
    };
    const uniqueMessages = activeConv?.messages.filter((msg: any, index: number, self: any[]) =>
        index === self.findIndex((m: any) => (
            m.body === msg.body &&
            // Only filter if created within 2 seconds of each other
            Math.abs(new Date(m.created_at).getTime() - new Date(msg.created_at).getTime()) < 2000
        ))
    ) || [];


    return (
        <div className="grid grid-cols-12 h-full border-t">

            {/* SIDEBAR LIST */}
            <div className="col-span-4 border-r bg-muted/10">
                <div className="p-4 font-semibold border-b">Inbox</div>
                <ScrollArea className="h-[calc(100vh-8rem)]">
                    {conversations.length === 0 && (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                            No messages yet.
                        </div>
                    )}
                    {conversations.map((conv: any) => (
                        <div
                            key={conv.phone}
                            onClick={() => setSelectedPhone(conv.phone)}
                            className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b flex gap-3 ${selectedPhone === conv.phone ? 'bg-white border-l-4 border-l-primary shadow-sm' : ''}`}
                        >
                            <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-slate-500" />
                            </div>
                            <div className="overflow-hidden">
                                <div className="font-medium truncate">{conv.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{conv.phone}</div>
                                <div className="text-xs text-slate-500 mt-1 truncate">
                                    {conv.messages[conv.messages.length - 1]?.body}
                                </div>
                            </div>
                        </div>
                    ))}
                </ScrollArea>
            </div>

            {/* CHAT AREA */}
            <div className="col-span-8 flex flex-col bg-white">
                {activeConv ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-white">
                            <div>
                                <h3 className="font-bold">{activeConv.name}</h3>
                                <p className="text-xs text-muted-foreground">{activeConv.phone}</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-4 bg-slate-50">
                            <div className="space-y-4">
                                {uniqueMessages.map((msg: any, i: number) => (
                                    <div key={i} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-xl p-3 text-sm ${msg.direction === 'outbound'
                                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                                : 'bg-white border shadow-sm rounded-bl-none'
                                            }`}>
                                            {msg.body}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        {/* Input */}
                        <div className="p-4 border-t bg-white flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Type a message..."
                                className="flex-1"
                            />
                            <Button size="icon" onClick={handleSend}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}