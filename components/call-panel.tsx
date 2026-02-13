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
} from "lucide-react";
import { useState } from "react";

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function CallPanel() {
    const { activeCall, answerCall, endCall, setOutcome, setPostCallNotes, dismissCall } = useCall();
    const [isMinimized, setIsMinimized] = useState(false);
    const [notes, setNotes] = useState("");

    if (!activeCall) return null;

    const { state, direction, customer, duration } = activeCall;

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
        <div className="fixed bottom-0 right-0 z-[100] w-full md:w-[420px] md:right-4 md:bottom-4">
            <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

                {/* ─── Header ─── */}
                <div className={`px-5 py-4 flex items-center justify-between ${state === "ringing" ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white" :
                        state === "connected" ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white" :
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
                        {state === "ended" && (
                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                                <PhoneOff className="h-5 w-5 text-slate-500" />
                            </div>
                        )}
                        <div>
                            <p className="font-bold text-base">{customer.name}</p>
                            <p className={`text-xs ${state === "ended" ? "text-slate-500" : "opacity-75"}`}>
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
                        {state === "ended" && (
                            <button onClick={dismissCall} className="opacity-75 hover:opacity-100 p-1">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── Ringing: Pre-Call Info ─── */}
                {state === "ringing" && (
                    <div className="px-5 py-4 space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Intel</span>
                        </div>

                        {/* Customer Details */}
                        <div className="grid grid-cols-2 gap-3">
                            {customer.vehicle && (
                                <div className="bg-slate-50 rounded-lg p-2.5">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mb-0.5"><Car className="h-3 w-3" />VEHICLE</div>
                                    <p className="text-sm font-semibold text-slate-900">{customer.vehicle}</p>
                                </div>
                            )}
                            {customer.lastVisit && (
                                <div className="bg-slate-50 rounded-lg p-2.5">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mb-0.5"><Clock className="h-3 w-3" />LAST VISIT</div>
                                    <p className="text-sm font-semibold text-slate-900">{customer.lastVisit}</p>
                                </div>
                            )}
                            {customer.totalSpend !== undefined && (
                                <div className="bg-slate-50 rounded-lg p-2.5">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mb-0.5"><DollarSign className="h-3 w-3" />TOTAL SPEND</div>
                                    <p className="text-sm font-semibold text-slate-900">${customer.totalSpend.toLocaleString()}</p>
                                </div>
                            )}
                            {customer.visits !== undefined && (
                                <div className="bg-slate-50 rounded-lg p-2.5">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mb-0.5"><CalendarCheck className="h-3 w-3" />VISITS</div>
                                    <p className="text-sm font-semibold text-slate-900">{customer.visits}</p>
                                </div>
                            )}
                        </div>

                        {/* Open Deal */}
                        {customer.openDeal && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-amber-600">Open Deal</p>
                                        <p className="text-sm font-semibold text-slate-900">{customer.openDeal.service}</p>
                                        <p className="text-xs text-slate-500">Stage: {customer.openDeal.stage}</p>
                                    </div>
                                    <span className="text-lg font-bold text-green-600">${customer.openDeal.value}</span>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {customer.notes && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-bold uppercase mb-1">
                                    <FileText className="h-3 w-3" />Notes
                                </div>
                                <p className="text-sm text-slate-700">{customer.notes}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-1">
                            {direction === "inbound" ? (
                                <>
                                    <Button onClick={answerCall} className="flex-1 bg-green-600 hover:bg-green-700 text-white h-11">
                                        <Phone className="h-4 w-4 mr-2" /> Answer
                                    </Button>
                                    <Button onClick={endCall} variant="destructive" className="h-11 px-4">
                                        <PhoneOff className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <Button onClick={endCall} variant="destructive" className="flex-1 h-11">
                                    <PhoneOff className="h-4 w-4 mr-2" /> Cancel Call
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Connected: During Call ─── */}
                {state === "connected" && (
                    <div className="px-5 py-4 space-y-3">
                        {/* Quick Customer Info */}
                        <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{customer.vehicle || "Unknown vehicle"}</p>
                                <p className="text-xs text-slate-500 truncate">
                                    {customer.lastVisit ? `Last visit: ${customer.lastVisit}` : "New customer"}
                                    {customer.totalSpend ? ` · $${customer.totalSpend.toLocaleString()} lifetime` : ""}
                                </p>
                            </div>
                        </div>

                        {/* Open Deal Reminder */}
                        {customer.openDeal && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-amber-600">Open Quote</p>
                                    <p className="text-sm font-semibold">{customer.openDeal.service} — ${customer.openDeal.value}</p>
                                </div>
                                <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">{customer.openDeal.stage}</Badge>
                            </div>
                        )}

                        {/* Notes */}
                        {customer.notes && (
                            <div className="text-xs text-slate-500 bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                                💡 {customer.notes}
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" className="h-9 text-xs border-slate-200">
                                <CalendarCheck className="h-3 w-3 mr-1.5" /> Book Appointment
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 text-xs border-slate-200">
                                <DollarSign className="h-3 w-3 mr-1.5" /> Send Quote
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 text-xs border-slate-200">
                                <MessageSquare className="h-3 w-3 mr-1.5" /> Send SMS
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 text-xs border-slate-200">
                                <FileText className="h-3 w-3 mr-1.5" /> Add Note
                            </Button>
                        </div>

                        {/* End Call */}
                        <Button onClick={endCall} variant="destructive" className="w-full h-11">
                            <PhoneOff className="h-4 w-4 mr-2" /> End Call
                        </Button>
                    </div>
                )}

                {/* ─── Ended: Post-Call ─── */}
                {state === "ended" && (
                    <div className="px-5 py-4 space-y-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Call Outcome</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: "booked" as const, label: "Booked ✅", color: "bg-green-100 text-green-700 border-green-300 hover:bg-green-200" },
                                    { id: "follow_up" as const, label: "Follow-Up 📞", color: "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200" },
                                    { id: "not_interested" as const, label: "Not Interested ❌", color: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200" },
                                    { id: "no_answer" as const, label: "No Answer 📵", color: "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200" },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setOutcome(opt.id)}
                                        className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${activeCall.outcome === opt.id
                                                ? `${opt.color} ring-2 ring-offset-1 ring-slate-400 shadow-sm`
                                                : `${opt.color} opacity-70`
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Notes */}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Notes</p>
                            <textarea
                                value={notes}
                                onChange={(e) => {
                                    setNotes(e.target.value);
                                    setPostCallNotes(e.target.value);
                                }}
                                placeholder="What was discussed? Any follow-up needed?"
                                className="w-full h-20 border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Save & Dismiss */}
                        <Button
                            onClick={dismissCall}
                            disabled={!activeCall.outcome}
                            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
                        >
                            Save & Close
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
