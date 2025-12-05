"use client";

import { useState, useEffect, useRef, use } from "react";
import { Send, Bot, Loader2, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

// Types
type Message = { role: "user" | "assistant"; content: string };
type WidgetConfig = {
    primary_color: string;
    business_name: string;
    greeting_message: string;
};

type LeadInfo = {
    fullName: string;
    phone: string;
    email: string;
    sessionId: string;
};

export default function ChatWidgetPage({ params }: { params: Promise<{ merchantId: string }> }) {
    // 1. Unwrap Params (Next.js 15 Requirement)
    const { merchantId } = use(params);

    // 2. State
    const [config, setConfig] = useState<WidgetConfig | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Lead capture state
    const [isLeadCaptured, setIsLeadCaptured] = useState(false);
    const [leadInfo, setLeadInfo] = useState<LeadInfo>({
        fullName: "",
        phone: "",
        email: "",
        sessionId: ""
    });
    const [isSubmittingLead, setIsSubmittingLead] = useState(false);
    const [leadError, setLeadError] = useState("");

    // 3. Check for existing session on mount
    useEffect(() => {
        const stored = sessionStorage.getItem(`widget_lead_${merchantId}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            setLeadInfo(parsed);
            setIsLeadCaptured(true);
        }
    }, [merchantId]);

    // 4. Fetch Widget Configuration (Colors & Greeting) on Load
    useEffect(() => {
        async function loadConfig() {
            try {
                const res = await fetch(`/api/widgets/config?merchantId=${merchantId}`);
                const data = await res.json();
                setConfig(data);

                // Add initial greeting message only if lead is captured
                if (isLeadCaptured) {
                    setMessages([
                        { role: "assistant", content: data.greeting_message || "Hi! How can I help you today?" }
                    ]);
                }
            } catch (error) {
                console.error("Failed to load widget config", error);
                setConfig({
                    primary_color: "#0F172A",
                    business_name: "Support",
                    greeting_message: "Hi! How can I help?"
                });
            }
        }
        loadConfig();
    }, [merchantId, isLeadCaptured]);

    // 5. Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isSending]);

    // 6. Handle Lead Form Submit
    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLeadError("");

        if (!leadInfo.fullName.trim() || !leadInfo.phone.trim()) {
            setLeadError("Please enter your name and phone number");
            return;
        }

        // Simple phone validation
        const phoneDigits = leadInfo.phone.replace(/\D/g, "");
        if (phoneDigits.length < 10) {
            setLeadError("Please enter a valid phone number");
            return;
        }

        setIsSubmittingLead(true);

        // Generate session ID
        const sessionId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const updatedLead = { ...leadInfo, sessionId };

        // Store in sessionStorage
        sessionStorage.setItem(`widget_lead_${merchantId}`, JSON.stringify(updatedLead));
        setLeadInfo(updatedLead);
        setIsLeadCaptured(true);
        setIsSubmittingLead(false);

        // Add greeting after lead capture
        if (config) {
            setMessages([
                { role: "assistant", content: config.greeting_message || `Hi ${leadInfo.fullName.split(' ')[0]}! How can I help you today?` }
            ]);
        }
    };

    // 7. Handle Send Message
    const sendMessage = async () => {
        if (!input.trim() || isSending) return;

        const userMsg = input;
        setInput(""); // Clear input immediately
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setIsSending(true);

        try {
            // Send to AI API with lead info
            const res = await fetch("/api/chat/completion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    merchantId,
                    message: userMsg,
                    history: messages,
                    // Include lead info for customer tracking
                    leadInfo: {
                        fullName: leadInfo.fullName,
                        phone: leadInfo.phone,
                        email: leadInfo.email,
                        sessionId: leadInfo.sessionId
                    }
                }),
            });

            const data = await res.json();

            if (data.reply) {
                setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
            } else {
                throw new Error("No reply");
            }
        } catch (error) {
            setMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble connecting right now. Please try again later." }]);
        } finally {
            setIsSending(false);
        }
    };

    // 8. Loading State (While fetching colors)
    if (!config) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    const primaryColor = config.primary_color || "#0F172A";

    // 9. Lead Capture Form
    if (!isLeadCaptured) {
        return (
            <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">
                {/* HEADER */}
                <div
                    className="p-4 flex items-center gap-3 text-white shadow-md shrink-0"
                    style={{ backgroundColor: primaryColor }}
                >
                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight">{config.business_name}</h3>
                        <p className="text-[10px] opacity-90">AI Assistant</p>
                    </div>
                </div>

                {/* LEAD CAPTURE FORM */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
                    <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border">
                        <div className="text-center mb-6">
                            <div
                                className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-3"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <MessageCircle className="h-7 w-7 text-white" />
                            </div>
                            <h2 className="font-bold text-lg text-slate-900">Start a Conversation</h2>
                            <p className="text-sm text-slate-500 mt-1">Enter your details to chat with us</p>
                        </div>

                        <form onSubmit={handleLeadSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                                    Full Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="John Smith"
                                    value={leadInfo.fullName}
                                    onChange={(e) => setLeadInfo({ ...leadInfo, fullName: e.target.value })}
                                    className="h-11"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                                    Phone Number <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="+1 (555) 123-4567"
                                    value={leadInfo.phone}
                                    onChange={(e) => setLeadInfo({ ...leadInfo, phone: e.target.value })}
                                    className="h-11"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                                    Email <span className="text-slate-400 text-xs">(optional)</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={leadInfo.email}
                                    onChange={(e) => setLeadInfo({ ...leadInfo, email: e.target.value })}
                                    className="h-11"
                                />
                            </div>

                            {leadError && (
                                <p className="text-sm text-red-500 text-center">{leadError}</p>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-11 text-white font-medium"
                                style={{ backgroundColor: primaryColor }}
                                disabled={isSubmittingLead}
                            >
                                {isSubmittingLead ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Start Chat"
                                )}
                            </Button>
                        </form>

                        <p className="text-[10px] text-center text-slate-400 mt-4">
                            By continuing, you agree to receive messages from us
                        </p>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-3 border-t bg-white text-center">
                    <p className="text-[10px] text-slate-300">Powered by Neucler</p>
                </div>
            </div>
        );
    }

    // 10. Chat Interface (After Lead Capture)
    return (
        <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">

            {/* HEADER */}
            <div
                className="p-4 flex items-center gap-3 text-white shadow-md shrink-0 transition-colors duration-300"
                style={{ backgroundColor: primaryColor }}
            >
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                    <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-sm leading-tight">{config.business_name}</h3>
                    <div className="flex items-center gap-1.5 opacity-90 mt-0.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                        </span>
                        <p className="text-[10px] font-medium uppercase tracking-wide">AI Assistant Online</p>
                    </div>
                </div>
            </div>

            {/* CHAT AREA */}
            <ScrollArea className="flex-1 p-4 bg-slate-50">
                <div className="space-y-4 pb-2">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm leading-relaxed ${m.role === "user"
                                    ? "text-white rounded-br-sm"
                                    : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
                                    }`}
                                style={m.role === "user" ? { backgroundColor: primaryColor } : {}}
                            >
                                {m.content}
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isSending && (
                        <div className="flex justify-start">
                            <div
                                className="h-6 w-6 rounded-full flex items-center justify-center mr-2 mt-1 shrink-0 text-white"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Bot className="h-3.5 w-3.5" />
                            </div>
                            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* INPUT AREA */}
            <div className="p-3 border-t bg-white shrink-0">
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-full border border-slate-200 focus-within:border-slate-300 focus-within:bg-white transition-all">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        disabled={isSending}
                        className="border-0 bg-transparent focus-visible:ring-0 shadow-none h-10 px-4 placeholder:text-slate-400"
                    />
                    <Button
                        size="icon"
                        onClick={sendMessage}
                        disabled={isSending || !input.trim()}
                        className="rounded-full h-10 w-10 shrink-0 transition-opacity hover:opacity-90 shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Send className="h-4 w-4 text-white" />
                    </Button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-300">Powered by Neucler</p>
                </div>
            </div>
        </div>
    );
}