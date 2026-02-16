"use client";

import { useCall, CallState } from "@/components/call-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Phone,
    PhoneOff,
    PhoneIncoming,
    PhoneOutgoing,
    X,
    User,
    Car,
    DollarSign,
    Clock,
    CalendarCheck,
    FileText,
    MessageSquare,
    ChevronUp,
    ChevronDown,
    Sparkles,
    Play,
    Mic,
    MicOff,
    Volume2,
    StickyNote,
    CheckCircle2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function CallPanel() {
    const {
        activeCall,
        startCall,
        answerCall,
        endCall,
        setOutcome,
        setPostCallNotes,
        dismissCall,
        toggleMute,
        isMuted,
        deviceReady
    } = useCall();
    const [isMinimized, setIsMinimized] = useState(false);
    const [notes, setNotes] = useState("");
    // Removed local isMuted state
    const previousCallIdRef = useRef<string | null>(null);

    // Sync notes from context if re-opening or minimized
    useEffect(() => {
        if (activeCall?.postCallNotes) {
            setNotes(activeCall.postCallNotes);
        } else {
            setNotes("");
        }

        // Auto-maximize on new call
        if (activeCall?.id && activeCall.id !== previousCallIdRef.current) {
            console.log("New call detected, maximizing panel", activeCall.id);
            setIsMinimized(false);
            previousCallIdRef.current = activeCall.id;
        }
    }, [activeCall?.id, activeCall?.postCallNotes]);

    if (!activeCall) return null;

    const { state, direction, customer, duration } = activeCall;

    // Debug logging
    console.log("CallPanel render:", { state, isMinimized, customerName: customer.name });

    // ============= MINIMIZED BAR =============
    if (isMinimized) {
        return (
            <div className="fixed bottom-0 left-0 right-0 md:left-64 z-[100]">
                <div className={`mx-4 mb-4 rounded-xl shadow-2xl border px-4 py-3 flex items-center justify-between ${state === "ringing" ? "bg-green-600 text-white border-green-500 animate-pulse" :
                    state === "connected" ? "bg-slate-900 text-white border-slate-700" :
                        "bg-white text-slate-900 border-slate-200"
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${state === "connected" ? "bg-green-400 animate-pulse" : state === "ringing" ? "bg-white animate-pulse" : "bg-slate-400"}`} />
                        <span className="font-semibold text-sm">{customer.name}</span>
                        {state === "connected" && <span className="text-xs opacity-75 font-mono">{formatDuration(duration)}</span>}
                        {state === "ringing" && <span className="text-xs">Ringing...</span>}
                        {state === "pre-call" && <span className="text-xs text-slate-500">Pre-Call Prep</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        {state === "ringing" && direction === "inbound" && (
                            <Button size="sm" onClick={answerCall} className="h-7 bg-white text-green-700 hover:bg-green-50 text-xs">
                                <Phone className="h-3 w-3 mr-1" /> Answer
                            </Button>
                        )}
                        {(state === "ringing" || state === "connected") && (
                            <Button size="sm" variant="destructive" onClick={endCall} className="h-7 text-xs">
                                <PhoneOff className="h-3 w-3" />
                            </Button>
                        )}
                        <button onClick={() => setIsMinimized(false)} className="ml-1 opacity-75 hover:opacity-100">
                            <ChevronUp className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ============= FULL PANEL =============
    return (
        <div className="fixed bottom-0 right-0 z-[100] w-full md:w-[420px] md:right-4 md:bottom-4 transition-all duration-300 ease-in-out transform translate-y-0">
            <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

                {/* ─── Header ─── */}
                <div className={`px-5 py-4 flex items-center justify-between shrink-0 ${state === "ringing" ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white" :
                    state === "connected" ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white" :
                        state === "pre-call" ? "bg-slate-50 border-b border-slate-200 text-slate-900" :
                            state === "ended" ? "bg-gradient-to-r from-slate-100 to-slate-50 text-slate-900" :
                                "bg-white text-slate-900"
                    }`}>
                    <div className="flex items-center gap-3">
                        {state === "ringing" && (
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                                {direction === "inbound" ? <PhoneIncoming className="h-5 w-5" /> : <PhoneOutgoing className="h-5 w-5" />}
                            </div>
                        )}
                        {state === "connected" && (
                            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                                <Phone className="h-5 w-5 text-white" />
                            </div>
                        )}
                        {state === "pre-call" && (
                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-slate-600" />
                            </div>
                        )}
                        {state === "ended" && (
                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                                <PhoneOff className="h-5 w-5 text-slate-500" />
                            </div>
                        )}

                        <div>
                            <p className="font-bold text-base">{customer.name}</p>
                            <p className={`text-xs ${state === "ended" || state === "pre-call" ? "text-slate-500" : "opacity-75"}`}>
                                {state === "pre-call" && "Pre-Call Prep"}
                                {state === "ringing" && (direction === "inbound" ? "Incoming call..." : "Calling...")}
                                {state === "connected" && customer.phone}
                                {state === "ended" && `Call ended · ${formatDuration(duration)}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {state === "connected" && (
                            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-sm font-mono font-bold">{formatDuration(duration)}</span>
                            </div>
                        )}
                        <button onClick={() => setIsMinimized(true)} className="opacity-75 hover:opacity-100 p-1">
                            <ChevronDown className="h-4 w-4" />
                        </button>
                        {(state === "ended" || state === "pre-call") && (
                            <button onClick={dismissCall} className="opacity-75 hover:opacity-100 p-1">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── STAGE 1: PRE-CALL ─── */}
                {state === "pre-call" && (
                    <div className="p-5 space-y-4 overflow-y-auto">
                        {/* 1. Customer Context */}
                        <div className="grid grid-cols-2 gap-3">
                            {customer.vehicle && (
                                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mb-0.5"><Car className="h-3 w-3" />VEHICLE</div>
                                    <p className="text-sm font-semibold text-slate-900">{customer.vehicle}</p>
                                </div>
                            )}
                            {customer.totalSpend !== undefined && (
                                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mb-0.5"><DollarSign className="h-3 w-3" />LTV</div>
                                    <p className="text-sm font-semibold text-slate-900">${customer.totalSpend.toLocaleString()}</p>
                                </div>
                            )}
                        </div>

                        {/* 2. Talking Points / Script */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Recommended Script</span>
                            </div>
                            <p className="text-sm text-indigo-900 leading-relaxed">
                                {customer.script || `Hi ${customer.name}, this is [Your Name] from Neucler Auto. I saw you had a missed call/inquiry about your ${customer.vehicle || 'vehicle'}. How can I help you today?`}
                            </p>
                        </div>

                        {/* 3. Recent History / Notes */}
                        {customer.notes ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Last Note</p>
                                <p className="text-xs text-slate-600 italic">"{customer.notes}"</p>
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Open Deal</p>
                                <p className="text-xs text-slate-600">{customer.openDeal?.service || "No active deals"}</p>
                            </div>
                        )}

                        {/* 4. Action */}
                        <div className="pt-2">
                            <Button
                                onClick={startCall}
                                disabled={!deviceReady}
                                className="w-full h-12 text-base shadow-lg shadow-blue-900/10 bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
                            >
                                <Phone className="h-4 w-4 mr-2" /> {deviceReady ? "Start Call" : "Connecting..."}
                            </Button>
                        </div>
                    </div>
                )}


                {/* ─── STAGE 2: RINGING / CONNECTED (DURING CALL) ─── */}
                {(state === "ringing" || state === "connected") && (
                    <div className="p-5 flex-1 flex flex-col min-h-0">

                        {state === "ringing" && (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                                    <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center relative z-10">
                                        <Phone className="h-8 w-8 text-green-600" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-slate-900">Calling {customer.name}...</p>
                                    <p className="text-sm text-slate-500">{customer.phone}</p>
                                </div>
                            </div>
                        )}

                        {state === "connected" && (
                            <>
                                {/* In-Call Actions */}
                                <div className="grid grid-cols-4 gap-2 mb-6">
                                    <button onClick={toggleMute} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isMuted ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"}`}>
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isMuted ? "bg-slate-200" : "bg-slate-100"}`}>
                                            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                        </div>
                                        <span className="text-[10px] font-medium">{isMuted ? "Unmute" : "Mute"}</span>
                                    </button>
                                    <button className="flex flex-col items-center gap-1 p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            <Volume2 className="h-5 w-5" />
                                        </div>
                                        <span className="text-[10px] font-medium">Speaker</span>
                                    </button>
                                    <button className="flex flex-col items-center gap-1 p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <span className="text-[10px] font-medium">Keypad</span>
                                    </button>
                                    <button className="flex flex-col items-center gap-1 p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            <Play className="h-5 w-5" />
                                        </div>
                                        <span className="text-[10px] font-medium">Hold</span>
                                    </button>
                                </div>

                                {/* Script / Notes Tabs */}
                                <div className="flex-1 flex flex-col min-h-0 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="flex border-b border-slate-200 bg-white">
                                        <button className="flex-1 py-2 text-xs font-medium text-slate-900 border-b-2 border-slate-900">
                                            Notes
                                        </button>
                                        <button className="flex-1 py-2 text-xs font-medium text-slate-500 hover:text-slate-700">
                                            Script
                                        </button>
                                    </div>
                                    <div className="flex-1 p-0">
                                        <Textarea
                                            placeholder="Type notes here during the call..."
                                            className="w-full h-full resize-none border-0 bg-transparent focus-visible:ring-0 p-3 text-sm"
                                            value={notes}
                                            onChange={(e) => {
                                                setNotes(e.target.value);
                                                setPostCallNotes(e.target.value);
                                            }}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* End Button */}
                        <div className="pt-4 mt-auto">
                            {(state === "ringing" || state === "connected") && (
                                <Button onClick={endCall} variant="destructive" className="w-full h-12 shadow-md shadow-red-900/10">
                                    <PhoneOff className="h-5 w-5 mr-2" /> End Call
                                </Button>
                            )}
                        </div>
                    </div>
                )}


                {/* ─── STAGE 3: POST-CALL ─── */}
                {state === "ended" && (
                    <div className="p-5 flex-1 flex flex-col overflow-y-auto">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 mb-2">
                                <CheckCircle2 className="h-6 w-6 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Call Ended</h3>
                            <p className="text-sm text-slate-500">Duration: {formatDuration(duration)}</p>
                        </div>

                        {/* 1. Outcome */}
                        <div className="mb-6">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Select Outcome</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: "booked" as const, label: "Booked", icon: "✅", color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 ring-emerald-500" },
                                    { id: "follow_up" as const, label: "Follow-Up", icon: "📞", color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 ring-blue-500" },
                                    { id: "not_interested" as const, label: "Not Interested", icon: "❌", color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 ring-red-500" },
                                    { id: "no_answer" as const, label: "No Answer", icon: "📵", color: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 ring-slate-500" },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setOutcome(opt.id)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${activeCall.outcome === opt.id
                                            ? `${opt.color} border-transparent ring-2 ring-offset-1 shadow-sm`
                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                            }`}
                                    >
                                        <span className="text-xl mb-1">{opt.icon}</span>
                                        <span className="text-xs font-semibold">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Notes Review */}
                        <div className="flex-1 flex flex-col min-h-0 mb-4">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Call Notes</p>
                            <Textarea
                                value={notes}
                                onChange={(e) => {
                                    setNotes(e.target.value);
                                    setPostCallNotes(e.target.value);
                                }}
                                placeholder="Add any final notes about the call..."
                                className="flex-1 min-h-[100px] border-slate-200 resize-none focus:border-slate-400 focus:ring-slate-400"
                            />
                        </div>

                        {/* 3. Submit */}
                        <Button
                            onClick={dismissCall}
                            disabled={!activeCall.outcome}
                            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
                        >
                            Complete & Close
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
