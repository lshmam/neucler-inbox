"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Phone,
    PhoneOff,
    Mic,
    MicOff,
    Pause,
    Play,
    Clock,
    User,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Shield,
    Calendar,
    FileText,
    History,
    ListTodo,
    MessageSquare,
    BarChart3,
    Lightbulb,
    ArrowRight,
    Star,
    TrendingUp,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    CallerContext,
    ChecklistItem,
    CallOutcome,
    CallStatus,
    TimeSlot,
} from "@/types/call";

// ─── Types ───────────────────────────────────────────────────
type CallTab = "pre" | "during" | "post";

interface VisitRecord {
    date: string;
    service: string;
    provider: string;
    outcome: string;
}

interface PendingAction {
    id: string;
    reason: string;
    priority: "high" | "medium" | "low";
    dueAt: string;
}

interface AIInsight {
    label: string;
    value: string;
    icon: "sentiment" | "topic" | "opportunity";
}

// ─── Mock Data ───────────────────────────────────────────────
const MOCK_CALLER: CallerContext = {
    name: "Sarah Miller",
    phone: "(555) 123-4567",
    isReturning: true,
    callReason: "Existing patient — appointment change",
    lastInteraction: "Last spoke 6 days ago — confirmed follow-up",
    tags: ["VIP", "Insurance pending"],
};

const MOCK_VISITS: VisitRecord[] = [
    { date: "Jan 15, 2026", service: "Routine Cleaning", provider: "Dr. Pearson", outcome: "Completed" },
    { date: "Nov 3, 2025", service: "Crown Fitting", provider: "Dr. Ross", outcome: "Completed" },
    { date: "Sep 20, 2025", service: "Consultation", provider: "Dr. Pearson", outcome: "Follow-up needed" },
    { date: "Jul 8, 2025", service: "Emergency Visit", provider: "Dr. Ross", outcome: "Treated" },
];

const MOCK_PENDING_ACTIONS: PendingAction[] = [
    { id: "pa1", reason: "Follow-up on insurance verification", priority: "high", dueAt: "Today" },
    { id: "pa2", reason: "Confirm 6-month cleaning appointment", priority: "medium", dueAt: "This week" },
];

const MOCK_PREVIOUS_NOTES = "Patient mentioned concern about crown sensitivity. Prefers morning appointments. Insurance change pending — needs new card on file.";

const MOCK_TALKING_POINTS = [
    "Ask about crown sensitivity — mentioned last visit",
    "Confirm new insurance details",
    "Overdue for 6-month cleaning — suggest scheduling",
    "VIP customer — personalize experience",
];

const INITIAL_CHECKLIST: ChecklistItem[] = [
    { id: "identity", label: "Identity confirmed", completed: false, required: true },
    { id: "insurance", label: "Insurance verified or marked pending", completed: false, required: true },
    { id: "appointment", label: "Appointment booked or reason noted", completed: false, required: true },
];

const MOCK_SLOTS: TimeSlot[] = [
    { id: "s1", time: "10:00 AM", provider: "Dr. Pearson", available: true },
    { id: "s2", time: "11:30 AM", provider: "Dr. Pearson", available: true },
    { id: "s3", time: "1:00 PM", provider: "Dr. Ross", available: false },
    { id: "s4", time: "2:30 PM", provider: "Dr. Ross", available: true },
    { id: "s5", time: "4:00 PM", provider: "Dr. Pearson", available: true },
];

const OUTCOME_OPTIONS: { value: CallOutcome; label: string }[] = [
    { value: "booked", label: "Booked" },
    { value: "not_booked", label: "Not Booked" },
    { value: "callback", label: "Call Back Requested" },
    { value: "not_a_fit", label: "Not a Fit" },
    { value: "voicemail", label: "Left Voicemail" },
];

const NEXT_ACTION_SUGGESTIONS: Record<string, string> = {
    not_booked: "Follow-up in 24 hours",
    callback: "Call back at requested time",
    not_a_fit: "No action required",
    voicemail: "Try again in 2 hours",
};

const MOCK_AI_INSIGHTS: AIInsight[] = [
    { label: "Sentiment", value: "Positive — patient was friendly and receptive", icon: "sentiment" },
    { label: "Key Topics", value: "Appointment reschedule, insurance update, crown follow-up", icon: "topic" },
    { label: "Missed Opportunity", value: "Could have offered teeth whitening promotion", icon: "opportunity" },
];

const MOCK_POST_SUGGESTIONS = [
    "Send appointment confirmation via SMS",
    "Email updated insurance form",
    "Schedule 6-month check-up reminder",
    "Flag for whitening promo on next contact",
];

// ─── Helpers ─────────────────────────────────────────────────
function formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function getPriorityColor(p: string) {
    if (p === "high") return "bg-red-500";
    if (p === "medium") return "bg-yellow-500";
    return "bg-slate-300";
}

// ─── Tab Definitions ─────────────────────────────────────────
const TABS: { id: CallTab; label: string; description: string }[] = [
    { id: "pre", label: "Pre Call", description: "Prepare" },
    { id: "during", label: "During Call", description: "Active" },
    { id: "post", label: "Post Call", description: "Review" },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function CallClient() {
    const [activeTab, setActiveTab] = useState<CallTab>("pre");

    // Call state
    const [callStatus, setCallStatus] = useState<CallStatus>("active");
    const [elapsed, setElapsed] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isOnHold, setIsOnHold] = useState(false);

    // Workspace state
    const [notes, setNotes] = useState("");
    const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
    const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [timerRunning, setTimerRunning] = useState(false);

    // Timer — only runs when on During Call tab and timer is active
    useEffect(() => {
        if (!timerRunning) return;
        const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(interval);
    }, [timerRunning]);

    // Soft lock during active call
    useEffect(() => {
        if (activeTab !== "during") return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [activeTab]);

    const toggleCheckItem = useCallback((id: string) => {
        setChecklist((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, completed: !item.completed } : item
            )
        );
    }, []);

    const allRequiredComplete = checklist.filter((i) => i.required).every((i) => i.completed);
    const canEndCall = allRequiredComplete && selectedOutcome !== null;

    const handleStartCall = () => {
        setActiveTab("during");
        setTimerRunning(true);
        setCallStatus("active");
        setElapsed(0);
    };

    const handleEndCall = () => {
        if (!canEndCall) {
            setShowExitWarning(true);
            setCallStatus("ending");
            return;
        }
        setTimerRunning(false);
        setCallStatus("completed");
        setActiveTab("post");
    };

    const handleConfirmBook = () => {
        if (!selectedSlot) return;
        setChecklist((prev) =>
            prev.map((item) =>
                item.id === "appointment" ? { ...item, completed: true } : item
            )
        );
        setSelectedOutcome("booked");
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
            {/* ─── Tab Bar ─── */}
            <div className="bg-white border-b border-slate-200 px-6 py-0 shrink-0">
                <div className="flex items-center gap-1">
                    {TABS.map((tab, idx) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                // Only allow going to "during" via Start Call, and "post" via End Call
                                if (tab.id === "during" && !timerRunning) return;
                                if (tab.id === "post" && callStatus !== "completed") return;
                                setActiveTab(tab.id);
                            }}
                            className={cn(
                                "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2",
                                activeTab === tab.id
                                    ? "border-slate-900 text-slate-900"
                                    : "border-transparent text-slate-400 hover:text-slate-600",
                                tab.id === "during" && !timerRunning && "opacity-40 cursor-not-allowed",
                                tab.id === "post" && callStatus !== "completed" && "opacity-40 cursor-not-allowed",
                            )}
                        >
                            <span className={cn(
                                "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold",
                                activeTab === tab.id ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                            )}>
                                {idx + 1}
                            </span>
                            {tab.label}
                        </button>
                    ))}

                    {/* Timer badge in tab bar when call is active */}
                    {timerRunning && (
                        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-mono font-bold text-green-700">{formatTimer(elapsed)}</span>
                        </div>
                    )}
                    {callStatus === "completed" && (
                        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                            <CheckCircle2 className="h-3 w-3 text-slate-500" />
                            <span className="text-xs font-mono font-medium text-slate-500">{formatTimer(elapsed)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Tab Content ─── */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === "pre" && <PreCallTab onStartCall={handleStartCall} />}
                {activeTab === "during" && (
                    <DuringCallTab
                        notes={notes}
                        setNotes={setNotes}
                        checklist={checklist}
                        toggleCheckItem={toggleCheckItem}
                        selectedOutcome={selectedOutcome}
                        setSelectedOutcome={setSelectedOutcome}
                        selectedSlot={selectedSlot}
                        setSelectedSlot={setSelectedSlot}
                        showExitWarning={showExitWarning}
                        setShowExitWarning={setShowExitWarning}
                        callStatus={callStatus}
                        setCallStatus={setCallStatus}
                        canEndCall={canEndCall}
                        handleEndCall={handleEndCall}
                        handleConfirmBook={handleConfirmBook}
                        isMuted={isMuted}
                        setIsMuted={setIsMuted}
                        isOnHold={isOnHold}
                        setIsOnHold={setIsOnHold}
                        elapsed={elapsed}
                    />
                )}
                {activeTab === "post" && (
                    <PostCallTab
                        notes={notes}
                        elapsed={elapsed}
                        selectedOutcome={selectedOutcome}
                        checklist={checklist}
                    />
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// PRE CALL TAB
// ═══════════════════════════════════════════════════════════════
function PreCallTab({ onStartCall }: { onStartCall: () => void }) {
    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Customer Profile */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-slate-400" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Customer</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">{MOCK_CALLER.name}</h2>
                            <p className="text-sm text-slate-500 font-mono mt-0.5">{MOCK_CALLER.phone}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                                    Returning
                                </Badge>
                                {MOCK_CALLER.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className={cn(
                                        "text-[10px] font-medium",
                                        tag === "VIP" && "border-amber-300 bg-amber-50 text-amber-700",
                                        tag === "Insurance pending" && "border-orange-300 bg-orange-50 text-orange-700",
                                    )}>
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <Button onClick={onStartCall} className="gap-2 bg-green-600 hover:bg-green-700 text-white h-11 px-6">
                            <Phone className="h-4 w-4" />
                            Start Call
                        </Button>
                    </div>
                </div>

                {/* Two-column grid: History + Actions */}
                <div className="grid grid-cols-[1fr_1fr] gap-6">

                    {/* Visit History */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <History className="h-4 w-4 text-slate-500" />
                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Visit History</h3>
                        </div>
                        <div className="space-y-2">
                            {MOCK_VISITS.map((visit, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                                    <div>
                                        <div className="text-sm font-medium text-slate-800">{visit.service}</div>
                                        <div className="text-xs text-slate-400">{visit.date} · {visit.provider}</div>
                                    </div>
                                    <Badge variant="secondary" className={cn(
                                        "text-[10px]",
                                        visit.outcome === "Completed" && "bg-green-50 text-green-700 border-green-200",
                                        visit.outcome === "Follow-up needed" && "bg-amber-50 text-amber-700 border-amber-200",
                                        visit.outcome === "Treated" && "bg-blue-50 text-blue-700 border-blue-200",
                                    )}>
                                        {visit.outcome}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending Actions */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ListTodo className="h-4 w-4 text-slate-500" />
                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Pending Actions</h3>
                        </div>
                        <div className="space-y-2">
                            {MOCK_PENDING_ACTIONS.map((action) => (
                                <div key={action.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                                    <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", getPriorityColor(action.priority))} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-800 truncate">{action.reason}</div>
                                        <div className="text-xs text-slate-400">Due: {action.dueAt}</div>
                                    </div>
                                </div>
                            ))}
                            {MOCK_PENDING_ACTIONS.length === 0 && (
                                <p className="text-sm text-slate-400 italic">No pending actions</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notes from Last Call */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Notes from Last Call</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-4 py-3 border border-slate-100 font-mono">
                        {MOCK_PREVIOUS_NOTES}
                    </p>
                </div>

                {/* Suggested Talking Points */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Suggested Talking Points</h3>
                    </div>
                    <div className="space-y-2">
                        {MOCK_TALKING_POINTS.map((point, i) => (
                            <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-amber-50/50 border border-amber-100">
                                <ChevronRight className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <span className="text-sm text-amber-900">{point}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// DURING CALL TAB
// ═══════════════════════════════════════════════════════════════
interface DuringCallProps {
    notes: string;
    setNotes: (v: string) => void;
    checklist: ChecklistItem[];
    toggleCheckItem: (id: string) => void;
    selectedOutcome: CallOutcome | null;
    setSelectedOutcome: (v: CallOutcome) => void;
    selectedSlot: string | null;
    setSelectedSlot: (v: string) => void;
    showExitWarning: boolean;
    setShowExitWarning: (v: boolean) => void;
    callStatus: CallStatus;
    setCallStatus: (v: CallStatus) => void;
    canEndCall: boolean;
    handleEndCall: () => void;
    handleConfirmBook: () => void;
    isMuted: boolean;
    setIsMuted: (v: boolean) => void;
    isOnHold: boolean;
    setIsOnHold: (v: boolean) => void;
    elapsed: number;
}

function DuringCallTab(props: DuringCallProps) {
    const {
        notes, setNotes, checklist, toggleCheckItem,
        selectedOutcome, setSelectedOutcome, selectedSlot, setSelectedSlot,
        showExitWarning, setShowExitWarning,
        callStatus, setCallStatus, canEndCall,
        handleEndCall, handleConfirmBook,
        isMuted, setIsMuted, isOnHold, setIsOnHold, elapsed,
    } = props;

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 grid grid-cols-[280px_1fr_320px] min-h-0 overflow-hidden">

                {/* LEFT — Context */}
                <aside className="bg-white border-r border-slate-200 p-5 overflow-y-auto">
                    <div className="space-y-5">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-slate-400" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Caller</span>
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">{MOCK_CALLER.name}</h2>
                            <p className="text-sm text-slate-500 font-mono">{MOCK_CALLER.phone}</p>
                            <Badge variant="secondary" className="mt-2 text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                                Returning
                            </Badge>
                        </div>
                        <hr className="border-slate-100" />
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Phone className="h-4 w-4 text-slate-400" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Reason</span>
                            </div>
                            <p className="text-sm text-slate-800 font-medium">{MOCK_CALLER.callReason}</p>
                        </div>
                        <hr className="border-slate-100" />
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Last Interaction</span>
                            </div>
                            <p className="text-sm text-slate-600">{MOCK_CALLER.lastInteraction || "No prior conversation"}</p>
                        </div>
                        <hr className="border-slate-100" />
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-4 w-4 text-slate-400" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Flags</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {MOCK_CALLER.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className={cn(
                                        "text-[10px] font-medium",
                                        tag === "VIP" && "border-amber-300 bg-amber-50 text-amber-700",
                                        tag === "Insurance pending" && "border-orange-300 bg-orange-50 text-orange-700",
                                    )}>
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* CENTER — Workspace */}
                <main className="overflow-y-auto p-6">
                    <div className="max-w-2xl mx-auto space-y-6">
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Call Notes</h3>
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Type notes during the call..."
                                className="w-full h-36 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Auto-saved continuously</p>
                        </section>

                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Available Slots</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {MOCK_SLOTS.map((slot) => (
                                    <button
                                        key={slot.id}
                                        disabled={!slot.available}
                                        onClick={() => setSelectedSlot(slot.id)}
                                        className={cn(
                                            "flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors text-left",
                                            !slot.available && "opacity-40 cursor-not-allowed bg-slate-50 border-slate-100",
                                            slot.available && selectedSlot !== slot.id && "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer",
                                            selectedSlot === slot.id && "bg-blue-50 border-blue-400 ring-1 ring-blue-400"
                                        )}
                                    >
                                        <div>
                                            <span className="font-semibold text-slate-900">{slot.time}</span>
                                            <span className="text-slate-500 ml-2">— {slot.provider}</span>
                                        </div>
                                        {!slot.available && <span className="text-[10px] text-slate-400 font-medium uppercase">Booked</span>}
                                        {selectedSlot === slot.id && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                                    </button>
                                ))}
                            </div>
                            <Button
                                onClick={handleConfirmBook}
                                disabled={!selectedSlot}
                                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
                            >
                                Confirm Appointment
                            </Button>
                        </section>
                    </div>
                </main>

                {/* RIGHT — Completion */}
                <aside className="bg-white border-l border-slate-200 p-5 overflow-y-auto flex flex-col">
                    <div className="space-y-5 flex-1">
                        <div>
                            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Required Checklist</h3>
                            <div className="space-y-2">
                                {checklist.map((item) => (
                                    <label
                                        key={item.id}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                                            item.completed ? "bg-green-50/50 border-green-200"
                                                : showExitWarning && item.required ? "bg-red-50/50 border-red-300"
                                                    : "bg-white border-slate-200 hover:bg-slate-50"
                                        )}
                                    >
                                        <Checkbox checked={item.completed} onCheckedChange={() => toggleCheckItem(item.id)} />
                                        <span className={cn("text-sm", item.completed ? "text-green-700 line-through" : "text-slate-700")}>
                                            {item.label}
                                        </span>
                                        {item.required && !item.completed && (
                                            <span className="ml-auto text-[9px] font-bold text-red-400 uppercase">Required</span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div>
                            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Call Outcome</h3>
                            {callStatus === "active" && (
                                <p className="text-xs text-slate-400 italic">Available when ending call</p>
                            )}
                            {(callStatus === "ending" || callStatus === "completed") && (
                                <div className="space-y-2">
                                    {OUTCOME_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { setSelectedOutcome(opt.value); setShowExitWarning(false); }}
                                            className={cn(
                                                "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors",
                                                selectedOutcome === opt.value
                                                    ? "bg-blue-50 border-blue-400 text-blue-800 font-medium"
                                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedOutcome && selectedOutcome !== "booked" && (
                            <>
                                <hr className="border-slate-100" />
                                <div>
                                    <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Next Action</h3>
                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                                        <ChevronRight className="h-4 w-4 text-amber-600 shrink-0" />
                                        <span className="text-sm text-amber-800 font-medium">
                                            {NEXT_ACTION_SUGGESTIONS[selectedOutcome] || "Define follow-up"}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {showExitWarning && !canEndCall && (
                        <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700">
                                Complete all required checklist items and select an outcome before ending the call.
                            </p>
                        </div>
                    )}
                </aside>
            </div>

            {/* Call Controls Footer */}
            <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-3">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <div className="flex items-center gap-2">
                        <div className={cn("h-2.5 w-2.5 rounded-full", callStatus === "active" ? "bg-green-500 animate-pulse" : "bg-slate-300")} />
                        <span className="text-lg font-mono font-bold text-slate-900">{formatTimer(elapsed)}</span>
                        <span className="text-xs text-slate-400 uppercase ml-1">
                            {callStatus === "active" ? "Live" : callStatus === "ending" ? "Ending" : "Completed"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsMuted(!isMuted)} className={cn("gap-2", isMuted && "bg-red-50 border-red-200 text-red-700")}>
                            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            {isMuted ? "Unmute" : "Mute"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsOnHold(!isOnHold)} className={cn("gap-2", isOnHold && "bg-amber-50 border-amber-200 text-amber-700")}>
                            {isOnHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                            {isOnHold ? "Resume" : "Hold"}
                        </Button>
                        <Button onClick={handleEndCall} className="gap-2 bg-red-600 hover:bg-red-700 text-white ml-2">
                            <PhoneOff className="h-4 w-4" />
                            End Call
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// POST CALL TAB
// ═══════════════════════════════════════════════════════════════
interface PostCallProps {
    notes: string;
    elapsed: number;
    selectedOutcome: CallOutcome | null;
    checklist: ChecklistItem[];
}

function PostCallTab({ notes, elapsed, selectedOutcome, checklist }: PostCallProps) {
    const outcomeLabel = OUTCOME_OPTIONS.find((o) => o.value === selectedOutcome)?.label || "Unknown";
    const completedCount = checklist.filter((i) => i.completed).length;

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-[1fr_1fr] gap-6">

                    {/* LEFT — Summary & Notes */}
                    <div className="space-y-6">
                        {/* Call Summary */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Phone className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Call Summary</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <Clock className="h-4 w-4 mx-auto text-slate-400 mb-1" />
                                    <div className="text-lg font-mono font-bold text-slate-900">{formatTimer(elapsed)}</div>
                                    <div className="text-[10px] text-slate-400 uppercase">Duration</div>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <CheckCircle2 className="h-4 w-4 mx-auto text-green-500 mb-1" />
                                    <div className="text-lg font-bold text-slate-900">{outcomeLabel}</div>
                                    <div className="text-[10px] text-slate-400 uppercase">Outcome</div>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <ListTodo className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                                    <div className="text-lg font-bold text-slate-900">{completedCount}/{checklist.length}</div>
                                    <div className="text-[10px] text-slate-400 uppercase">Checklist</div>
                                </div>
                            </div>
                        </div>

                        {/* Call Notes */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Call Notes</h3>
                            </div>
                            {notes ? (
                                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg px-4 py-3 border border-slate-100 font-mono whitespace-pre-wrap">
                                    {notes}
                                </p>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No notes were taken during this call.</p>
                            )}
                        </div>

                        {/* Checklist Review */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <ListTodo className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Checklist Review</h3>
                            </div>
                            <div className="space-y-1.5">
                                {checklist.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                                        {item.completed
                                            ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                            : <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                                        }
                                        <span className={cn("text-sm", item.completed ? "text-green-700" : "text-red-600")}>
                                            {item.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT — Analysis & Actions */}
                    <div className="space-y-6">
                        {/* AI Analysis */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Call Analysis</h3>
                                <Badge variant="secondary" className="text-[9px] ml-auto bg-purple-50 text-purple-600 border-purple-200">AI</Badge>
                            </div>
                            <div className="space-y-3">
                                {MOCK_AI_INSIGHTS.map((insight, i) => (
                                    <div key={i} className="px-3 py-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            {insight.icon === "sentiment" && <Star className="h-3.5 w-3.5 text-amber-500" />}
                                            {insight.icon === "topic" && <MessageSquare className="h-3.5 w-3.5 text-blue-500" />}
                                            {insight.icon === "opportunity" && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
                                            <span className="text-[11px] font-semibold text-slate-500 uppercase">{insight.label}</span>
                                        </div>
                                        <p className="text-sm text-slate-700">{insight.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions Created */}
                        {selectedOutcome && selectedOutcome !== "booked" && (
                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <ListTodo className="h-4 w-4 text-slate-500" />
                                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Action Created</h3>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                                    <ChevronRight className="h-4 w-4 text-amber-600 shrink-0" />
                                    <span className="text-sm text-amber-800 font-medium">
                                        {NEXT_ACTION_SUGGESTIONS[selectedOutcome] || "Follow-up required"}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Suggested Next Steps */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Lightbulb className="h-4 w-4 text-amber-500" />
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Suggested Next Steps</h3>
                            </div>
                            <div className="space-y-2">
                                {MOCK_POST_SUGGESTIONS.map((suggestion, i) => (
                                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-blue-50/30 hover:border-blue-200 cursor-pointer transition-colors">
                                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="text-sm text-slate-700">{suggestion}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Return button */}
                        <Button variant="outline" className="w-full gap-2" onClick={() => window.location.href = "/actions"}>
                            <ArrowRight className="h-4 w-4" />
                            Return to Actions
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
