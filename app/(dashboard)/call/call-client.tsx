"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCall, CallState } from "@/components/call-context"; // Added import
import { toast } from "sonner";
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
    Plus,
    Star,
    TrendingUp,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface CallAnalysisData {
    rating: number;
    summary: string;
    nextActions: string[];
    tags: string[];
    customerInfo?: {
        firstName?: string;
        lastName?: string;
        vehicleYear?: string;
        vehicleMake?: string;
        vehicleModel?: string;
        serviceRequested?: string;
    };
    pipeline: {
        status: string;
        title: string;
        dealValue: number;
        priority: string;
        confidence: number;
    };
}

interface ActionItemState {
    id: string;
    text: string;
    status: 'pending' | 'resolved' | 'created' | 'sms_sent';
    actionId?: string;
    smsId?: string;
}


const MOCK_TRANSCRIPT = `
Agent: Thank you for calling QuickFix Auto Shop, this is Sarah speaking. How can I help you today?
Customer: Yeah, I brought my car in last week for a brake job and now it's making this horrible grinding noise!
Agent: I'm so sorry to hear that. That must be really frustrating. Can I get your name and the vehicle information so I can pull up your service record?
Customer: It's Mike Johnson, 2019 Honda Accord. I paid $450 for those brakes and this is ridiculous!
Agent: I completely understand, Mr. Johnson. Let me look at your file... I can see the service from last Tuesday. I want to make this right for you.
Customer: I hope so because I'm considering going somewhere else. This is unacceptable.
Agent: I totally get it. Here's what I'd like to do - I can get you in today for a priority inspection at no charge. Our master technician Tony will personally look at it.
Customer: Today? What time?
Agent: I have a 2 PM slot available. We'll also provide you with a loaner car while we work on it. Does that work for you?
Customer: Okay, that sounds fair. I'll be there at 2.
Agent: Perfect, Mr. Johnson. I've booked you for 2 PM today. Just a heads up - if any additional parts are needed, we'll cover the labor under our warranty. Is there anything else I can help with?
Customer: No, that's it. Thanks for getting me in so quickly.
Agent: You're very welcome! We'll see you at 2. Drive safely and thank you for choosing QuickFix Auto.
`;


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
// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function CallClient() {
    const { activeCall, startCall, endCall, setOutcome, dismissCall } = useCall();
    const router = useRouter();

    // Local UI state
    const [activeTab, setActiveTab] = useState<CallTab>("pre");
    const [elapsed, setElapsed] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isOnHold, setIsOnHold] = useState(false);

    // Workspace state
    const [notes, setNotes] = useState("");
    const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
    const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [showExitWarning, setShowExitWarning] = useState(false);

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<CallAnalysisData | null>(null);
    const [actionItems, setActionItems] = useState<ActionItemState[]>([]);

    // SMS Dialog State
    const [showSMSDialog, setShowSMSDialog] = useState(false);
    const [selectedActionForSMS, setSelectedActionForSMS] = useState<{ id: string; text: string } | null>(null);
    const [smsMessage, setSmsMessage] = useState("");
    const [smsPhoneNumber, setSmsPhoneNumber] = useState(""); // Manual phone input
    const [includePaymentLink, setIncludePaymentLink] = useState(false);
    const [isSendingSMS, setIsSendingSMS] = useState(false);

    // Dev Tools: Transcript Testing
    const [availableTranscripts, setAvailableTranscripts] = useState<string[]>([]);
    const [selectedTranscriptFile, setSelectedTranscriptFile] = useState<string>("");
    const [activeTranscript, setActiveTranscript] = useState<string>(MOCK_TRANSCRIPT);

    // Fetch available transcripts on mount
    useEffect(() => {
        const fetchTranscripts = async () => {
            try {
                console.log("🔍 Fetching debug transcripts...");
                const res = await fetch('/api/debug/transcripts');
                const data = await res.json();
                console.log("📂 Transcripts API Response:", data);
                if (data.files) {
                    setAvailableTranscripts(data.files);
                }
            } catch (e) {
                console.error("❌ Failed to load debug transcripts", e);
            }
        };
        fetchTranscripts();
    }, []);


    // Load content when a file is selected
    useEffect(() => {
        if (!selectedTranscriptFile) return;

        const loadContent = async () => {
            try {
                const res = await fetch(`/api/debug/transcripts?filename=${selectedTranscriptFile}`);
                const data = await res.json();
                if (data.content) {
                    setActiveTranscript(data.content);
                    console.log(`📝 Loaded transcript: ${selectedTranscriptFile}`);
                }
            } catch (e) {
                console.error("Failed to load transcript content", e);
            }
        };
        loadContent();
    }, [selectedTranscriptFile]);

    // Trigger analysis when entering Post Call tab
    useEffect(() => {
        if (activeTab === "post" && !analysisResult && !isAnalyzing) {
            const fetchAnalysis = async () => {
                setIsAnalyzing(true);
                try {
                    console.log("🚀 Triggering Call Analysis...");
                    const response = await fetch("/api/analyze-transcript", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            transcript: activeTranscript, // Use the selected transcript
                            callLogId: activeCall?.id
                        }),
                    });
                    const data = await response.json();
                    if (data.success && data.analysis) {
                        const result = data.analysis as CallAnalysisData;
                        setAnalysisResult(result);
                        console.log("✅ Analysis Received:", result);

                        // Initialize action items from next actions
                        if (result.nextActions && result.nextActions.length > 0) {
                            const items: ActionItemState[] = result.nextActions.map((action, index) => ({
                                id: `action-${index}`,
                                text: action,
                                status: 'pending'
                            }));
                            setActionItems(items);
                        }

                        // 🤖 SMART ACTIONS: Auto-update checklist based on AI insights
                        setChecklist(prev => prev.map(item => {
                            if (item.completed) return item; // Don't uncheck manually checked items

                            switch (item.id) {
                                case "name":
                                    // Mark if customer name was extracted
                                    return (result.customerInfo?.firstName || result.customerInfo?.lastName)
                                        ? { ...item, completed: true } : item;
                                case "vehicle":
                                    // Mark if vehicle info was extracted
                                    return (result.customerInfo?.vehicleMake || result.customerInfo?.vehicleModel)
                                        ? { ...item, completed: true } : item;
                                case "issue":
                                    // Mark if summary describes an issue
                                    return (result.summary.length > 10)
                                        ? { ...item, completed: true } : item;
                                case "appt":
                                    // Mark if appointment was booked or quote sent
                                    return (result.pipeline.status === 'booked' || result.pipeline.status === 'quote_sent')
                                        ? { ...item, completed: true } : item;
                                default:
                                    return item;
                            }
                        }));
                    }

                } catch (error) {
                    console.error("❌ Analysis Failed:", error);
                } finally {
                    setIsAnalyzing(false);
                }
            };
            fetchAnalysis();
        }
    }, [activeTab, analysisResult, isAnalyzing, activeCall?.id]);


    // Redirect if no active call
    useEffect(() => {
        if (!activeCall) {
            // Ideally should redirect back or show "No active call"
            // For now, let's just stay here but maybe show an empty state or create a new call?
            // User can land here directly.
            // Let's not auto-redirect for now to allow exploring safely.
        }
    }, [activeCall, router]);

    // Sync tab with call state
    useEffect(() => {
        if (!activeCall) return;
        if (activeCall.state === "pre-call") setActiveTab("pre");
        if (activeCall.state === "ringing" || activeCall.state === "connected") setActiveTab("during");
        if (activeCall.state === "ended") setActiveTab("post");
    }, [activeCall?.state]);

    // Update elapsed time from context
    useEffect(() => {
        if (activeCall?.duration) {
            setElapsed(activeCall.duration);
        } else {
            setElapsed(0);
        }
    }, [activeCall?.duration]);

    const handleStartCall = () => {
        startCall();
    };

    const handleEndCall = () => {
        // Validation logic
        const allRequiredComplete = checklist.filter((i) => i.required).every((i) => i.completed);
        if (!allRequiredComplete && selectedOutcome === null) {
            // Let them end it anyway but warn?
            // Actually currently strict.
        }
        endCall();
    };

    const handleDismiss = () => {
        dismissCall();
        router.push("/dashboard"); // Go back to dashboard after closing
    };

    const toggleCheckItem = useCallback((id: string) => {
        setChecklist((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, completed: !item.completed } : item
            )
        );
    }, []);

    const allRequiredComplete = checklist.filter((i) => i.required).every((i) => i.completed);
    const canEndCall = true; // Allow ending, but show warnings in UI

    const handleConfirmBook = () => {
        if (!selectedSlot) return;
        setChecklist((prev) =>
            prev.map((item) =>
                item.id === "appointment" ? { ...item, completed: true } : item
            )
        );
        setSelectedOutcome("booked");
        setOutcome("booked");
    };

    // Action Item Handlers
    const handleCreateAction = async (actionId: string, actionText: string) => {
        try {
            const response = await fetch('/api/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: actionText,
                    description: `Auto-generated from call analysis.\nContext: ${analysisResult?.summary || ''}`,
                    priority: 'medium',
                    status: 'open',
                    type: 'follow_up',
                    customer_phone: activeCall?.customer?.phone,
                    customer_name: activeCall?.customer?.name,
                    metadata: {
                        source: 'call_analysis',
                        call_log_id: activeCall?.id,
                        tags: analysisResult?.tags || []
                    }
                })
            });

            if (response.ok) {
                const createdAction = await response.json();
                setActionItems(prev => prev.map(item =>
                    item.id === actionId
                        ? { ...item, status: 'created', actionId: createdAction.id }
                        : item
                ));
                console.log('✅ Action created:', createdAction);
            }
        } catch (error) {
            console.error('❌ Failed to create action:', error);
        }
    };

    const handleResolveAction = (actionId: string) => {
        setActionItems(prev => prev.map(item =>
            item.id === actionId
                ? { ...item, status: 'resolved' }
                : item
        ));
    };

    const handleSendSMS = async (actionId: string, actionText: string) => {
        console.log('🔵 handleSendSMS called:', { actionId, actionText });

        // Auto-generate SMS message
        const customerName = activeCall?.customer?.name?.split(' ')[0] || 'there';
        const businessName = "Neucler"; // TODO: Get from merchant settings

        const generatedMessage = `Hi ${customerName}, this is ${businessName}. ${actionText}`;

        // Try to get phone number from activeCall
        const phone = activeCall?.customer?.phone || "";

        console.log('📱 Generated message:', generatedMessage);
        console.log('📞 Phone number:', phone);
        console.log('🔓 Setting dialog state...');

        setSmsMessage(generatedMessage);
        setSmsPhoneNumber(phone);
        setSelectedActionForSMS({ id: actionId, text: actionText });
        setIncludePaymentLink(false);
        setShowSMSDialog(true);

        console.log('✅ Dialog should be open now');
    };
    const handleSendSMSConfirm = async () => {
        console.log('🟢 handleSendSMSConfirm called');
        console.log('📋 State check:', {
            selectedActionForSMS,
            smsPhoneNumber,
            customerPhone: activeCall?.customer?.phone,
            smsMessage,
            includePaymentLink,
            callLogId: activeCall?.id
        });

        // Get phone number from customer object
        const phoneNumber = activeCall?.customer?.phone;

        if (!selectedActionForSMS || !smsPhoneNumber.trim()) {
            console.error('❌ Validation failed:', {
                hasSelectedAction: !!selectedActionForSMS,
                hasPhoneNumber: !!smsPhoneNumber.trim()
            });
            toast.error('Cannot send SMS: Please enter a phone number');
            return;
        }

        console.log('✅ Validation passed, sending SMS to:', smsPhoneNumber);
        setIsSendingSMS(true);

        try {
            console.log('📡 Making API call to /api/sms/send...');
            const response = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: smsPhoneNumber,
                    message: smsMessage,
                    includePaymentLink: includePaymentLink,
                    callLogId: activeCall?.id
                })
            });

            console.log('📬 API response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('✅ SMS sent successfully:', result);

                setActionItems(prev => prev.map(item =>
                    item.id === selectedActionForSMS.id
                        ? { ...item, status: 'sms_sent', smsId: result.smsLogId }
                        : item
                ));
                setShowSMSDialog(false);
                toast.success('SMS sent successfully!');
                console.log('🎉 Dialog closed, action item updated');
            } else {
                const error = await response.json();
                console.error('❌ Failed to send SMS:', error);
                toast.error('Failed to send SMS: ' + (error.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('❌ SMS sending error:', error);
            toast.error('Failed to send SMS. Please try again.');
        } finally {
            setIsSendingSMS(false);
            console.log('🏁 SMS sending process complete');
        }
    };

    if (!activeCall) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-slate-50">
                <div className="text-center">
                    <Phone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-700">No Active Call</h2>
                    <p className="text-slate-500 mb-6">Start a call from the Action Stream or Dashboard.</p>
                    <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
                </div>
            </div>
        );
    }

    const { customer, state } = activeCall;
    const callStatus: CallStatus = state === "connected" ? "active" : state === "ringing" ? "active" : state === "ended" ? "completed" : "active";

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
            {/* ─── Tab Bar ─── */}
            <div className="bg-white border-b border-slate-200 px-6 py-0 shrink-0">
                <div className="flex items-center gap-1">
                    {TABS.map((tab, idx) => (
                        <button
                            key={tab.id}
                            disabled
                            className={cn(
                                "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 cursor-default",
                                activeTab === tab.id
                                    ? "border-slate-900 text-slate-900"
                                    : "border-transparent text-slate-400"
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
                    {(state === "ringing" || state === "connected") && (
                        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-mono font-bold text-green-700">{formatTimer(elapsed)}</span>
                        </div>
                    )}
                    {state === "ended" && (
                        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                            <CheckCircle2 className="h-3 w-3 text-slate-500" />
                            <span className="text-xs font-mono font-medium text-slate-500">{formatTimer(elapsed)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Tab Content ─── */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === "pre" && <PreCallTab onStartCall={handleStartCall} customer={customer} />}
                {activeTab === "during" && (
                    <DuringCallTab
                        customer={customer}
                        notes={notes}
                        setNotes={setNotes}
                        checklist={checklist}
                        toggleCheckItem={toggleCheckItem}
                        selectedOutcome={selectedOutcome}
                        setSelectedOutcome={(o) => { setSelectedOutcome(o); setOutcome(o); }}
                        selectedSlot={selectedSlot}
                        setSelectedSlot={setSelectedSlot}
                        showExitWarning={showExitWarning}
                        setShowExitWarning={setShowExitWarning}
                        callStatus={callStatus}
                        setCallStatus={() => { }} // Controlled by context
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
                        onDismiss={handleDismiss}
                        isAnalyzing={isAnalyzing}
                        analysisResult={analysisResult}
                        actionItems={actionItems}
                        onCreateAction={handleCreateAction}
                        onResolveAction={handleResolveAction}
                        onSendSMS={handleSendSMS}
                    />

                )}
            </div>

            {/* DEV TOOLS: Transcript Selector (ALWAYS VISIBLE FOR DEBUGGING) */}
            {activeTab !== "post" && (
                <div className="fixed bottom-4 left-4 z-[9999] bg-black/90 text-white p-3 rounded-lg text-xs backdrop-blur-md border border-white/20 shadow-2xl">
                    <div className="font-bold mb-2 text-purple-300 flex justify-between items-center">
                        <span>🧪 Test Data</span>
                        <span className="text-[10px] text-slate-500">({availableTranscripts.length} files)</span>
                    </div>
                    <select
                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs w-48 outline-none focus:border-purple-500 mb-1"
                        value={selectedTranscriptFile}
                        onChange={(e) => setSelectedTranscriptFile(e.target.value)}
                    >
                        <option value="">Default Mock Data</option>
                        {availableTranscripts.map(file => (
                            <option key={file} value={file}>{file}</option>
                        ))}
                    </select>
                    <div className="text-[10px] text-slate-400 max-w-[200px] truncate">
                        {selectedTranscriptFile ? `Loaded: ${selectedTranscriptFile}` : "Using built-in mock"}
                    </div>
                </div>
            )}

            {/* SMS Dialog */}
            <Dialog open={showSMSDialog} onOpenChange={setShowSMSDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-purple-600" />
                            Send SMS to Customer
                        </DialogTitle>
                        <DialogDescription>
                            Review and edit the message before sending to {activeCall?.customer?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Phone Number Input */}
                        <div className="space-y-2">
                            <Label htmlFor="sms-phone">Phone Number</Label>
                            <Input
                                id="sms-phone"
                                type="tel"
                                value={smsPhoneNumber}
                                onChange={(e) => setSmsPhoneNumber(e.target.value)}
                                placeholder="+1 (555) 123-4567"
                                className="font-mono"
                            />
                            <p className="text-xs text-slate-500">Enter phone number in E.164 format (e.g., +17781234567)</p>
                        </div>

                        {/* Message Text Area */}
                        <div className="space-y-2">
                            <Label htmlFor="sms-message">Message</Label>
                            <Textarea
                                id="sms-message"
                                value={smsMessage}
                                onChange={(e) => setSmsMessage(e.target.value)}
                                placeholder="Enter your message..."
                                className="min-h-[120px] resize-none"
                                maxLength={320}
                            />
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>{smsMessage.length} / 320 characters</span>
                                <span className={cn(
                                    smsMessage.length > 160 && "text-amber-600 font-medium"
                                )}>
                                    {smsMessage.length > 160 ? '2 SMS segments' : '1 SMS segment'}
                                </span>
                            </div>
                        </div>

                        {/* Payment Link Checkbox */}
                        <div className="flex items-center space-x-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <Checkbox
                                id="include-payment"
                                checked={includePaymentLink}
                                onCheckedChange={(checked) => setIncludePaymentLink(checked as boolean)}
                            />
                            <Label
                                htmlFor="include-payment"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                Include payment link
                            </Label>
                        </div>

                        {/* Preview */}
                        {includePaymentLink && (
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <p className="text-xs font-semibold text-blue-900 mb-1">Preview with payment link:</p>
                                <p className="text-xs text-blue-700 whitespace-pre-wrap">
                                    {smsMessage}
                                    {"\n\nPay securely here: https://pay.example.com/..."}
                                    {"\n\nReply STOP to unsubscribe."}
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowSMSDialog(false)}
                            disabled={isSendingSMS}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendSMSConfirm}
                            disabled={isSendingSMS || !smsMessage.trim()}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {isSendingSMS ? (
                                <>
                                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Send SMS
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}


// ═══════════════════════════════════════════════════════════════
// PRE CALL TAB
// ═══════════════════════════════════════════════════════════════
function PreCallTab({ onStartCall, customer }: { onStartCall: () => void; customer: any }) {
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
                            <h2 className="text-xl font-bold text-slate-900">{customer.name}</h2>
                            <p className="text-sm text-slate-500 font-mono mt-0.5">{customer.phone}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                                    Returning
                                </Badge>
                                {/* Fallback tags if not present */}
                                {(customer.tags || ["VIP", "Insurance pending"]).map((tag: string) => (
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
    customer: any;
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
        customer,
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
                            <h2 className="text-lg font-bold text-slate-900">{customer.name}</h2>
                            <p className="text-sm text-slate-500 font-mono">{customer.phone}</p>
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
                            <p className="text-sm text-slate-800 font-medium">{customer.callReason || "Inbound Inquiry"}</p>
                        </div>
                        <hr className="border-slate-100" />
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Last Interaction</span>
                            </div>
                            <p className="text-sm text-slate-600">{customer.lastInteraction || "No prior conversation"}</p>
                        </div>
                        <hr className="border-slate-100" />
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-4 w-4 text-slate-400" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Flags</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {(customer.tags || ["VIP", "Insurance pending"]).map((tag: string) => (
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
    onDismiss: () => void;
    isAnalyzing: boolean;
    analysisResult: CallAnalysisData | null;
    actionItems: ActionItemState[];
    onCreateAction: (actionId: string, actionText: string) => void;
    onResolveAction: (actionId: string) => void;
    onSendSMS: (actionId: string, actionText: string) => void;
}

function PostCallTab({
    notes,
    elapsed,
    selectedOutcome,
    checklist,
    onDismiss,
    isAnalyzing,
    analysisResult,
    actionItems,
    onCreateAction,
    onResolveAction,
    onSendSMS
}: PostCallProps) {
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


                        {/* AI Analysis Result */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 overflow-hidden relative">
                            <div className="flex items-center gap-2 mb-4">
                                <Lightbulb className="h-4 w-4 text-purple-500" />
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">AI Call Analysis</h3>
                                {isAnalyzing && <span className="text-xs text-purple-600 animate-pulse ml-2 font-medium">Analyzing...</span>}
                            </div>

                            {isAnalyzing ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                                    <div className="h-24 bg-slate-100 rounded w-full"></div>
                                </div>
                            ) : analysisResult ? (
                                <div className="space-y-5">
                                    {/* Rating & Pipeline */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                                            <div className="text-xs text-purple-600 uppercase font-bold mb-1">Call Rating</div>
                                            <div className="flex items-end gap-2">
                                                <span className="text-3xl font-bold text-purple-700">{analysisResult.rating}</span>
                                                <span className="text-sm text-purple-400 mb-1">/ 10</span>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                            <div className="text-xs text-blue-600 uppercase font-bold mb-1">Pipeline Action</div>
                                            <div className="text-sm font-bold text-blue-800">{analysisResult.pipeline.status === 'booked' ? 'Deal Created' : 'Pipeline Updated'}</div>
                                            <div className="text-xs text-blue-600 truncate mt-1">{analysisResult.pipeline.title}</div>
                                            <div className="text-xs text-blue-500 mt-0.5">${analysisResult.pipeline.dealValue} Est. Value</div>
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 mb-1">Summary</h4>
                                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            {analysisResult.summary}
                                        </p>
                                    </div>

                                    {/* Tags */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 mb-2">Smart Tags</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {analysisResult.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Next Actions */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 mb-2">Recommended Actions</h4>
                                        <div className="space-y-2">
                                            {analysisResult.nextActions.map((action, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 group hover:border-purple-200 transition-colors">
                                                    <div className="flex items-center gap-2.5 text-sm text-slate-700">
                                                        <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center group-hover:border-purple-400">
                                                            <div className="h-2.5 w-2.5 rounded-full bg-slate-200 group-hover:bg-purple-500 transition-colors" />
                                                        </div>
                                                        <span>{action}</span>
                                                    </div>
                                                    <button className="text-[10px] font-medium text-slate-400 uppercase hover:text-purple-600 px-2 py-1 rounded hover:bg-purple-50 transition-colors">
                                                        Create Task
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">Analysis not available.</p>
                            )}
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
                        <Button onClick={onDismiss} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 shadow-lg shadow-blue-900/10">
                            Complete & Close
                        </Button>
                    </div>

                    {/* RIGHT — Analysis & Actions */}
                    <div className="space-y-6">
                        {/* Customer Info (from AI extraction) */}
                        {analysisResult?.customerInfo && (
                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <User className="h-4 w-4 text-slate-500" />
                                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Customer Information</h3>
                                    <Badge variant="secondary" className="text-[9px] ml-auto bg-purple-50 text-purple-600 border-purple-200">AI Extracted</Badge>
                                </div>
                                <div className="space-y-2">
                                    {analysisResult.customerInfo.firstName && (
                                        <div className="px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <div className="text-xs text-slate-500 uppercase font-semibold">Name</div>
                                            <div className="text-sm text-slate-900">{analysisResult.customerInfo.firstName} {analysisResult.customerInfo.lastName || ''}</div>
                                        </div>
                                    )}
                                    {analysisResult.customerInfo.serviceRequested && (
                                        <div className="px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <div className="text-xs text-slate-500 uppercase font-semibold">Service Requested</div>
                                            <div className="text-sm text-slate-900">{analysisResult.customerInfo.serviceRequested}</div>
                                        </div>
                                    )}
                                    {(analysisResult.customerInfo.vehicleYear || analysisResult.customerInfo.vehicleMake || analysisResult.customerInfo.vehicleModel) && (
                                        <div className="px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <div className="text-xs text-slate-500 uppercase font-semibold">Vehicle</div>
                                            <div className="text-sm text-slate-900">
                                                {analysisResult.customerInfo.vehicleYear} {analysisResult.customerInfo.vehicleMake} {analysisResult.customerInfo.vehicleModel}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* AI Analysis - Dynamic Insights */}
                        {analysisResult && (
                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <BarChart3 className="h-4 w-4 text-slate-500" />
                                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Call Insights</h3>
                                    <Badge variant="secondary" className="text-[9px] ml-auto bg-purple-50 text-purple-600 border-purple-200">AI</Badge>
                                </div>
                                <div className="space-y-3">
                                    {/* Sentiment/Rating Insight */}
                                    <div className="px-3 py-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Star className="h-3.5 w-3.5 text-amber-500" />
                                            <span className="text-[11px] font-semibold text-slate-500 uppercase">Call Quality</span>
                                        </div>
                                        <p className="text-sm text-slate-700">
                                            {analysisResult.rating >= 8 ? 'Excellent call - customer was satisfied' :
                                                analysisResult.rating >= 6 ? 'Good call - positive interaction' :
                                                    analysisResult.rating >= 4 ? 'Moderate call - some concerns addressed' :
                                                        'Challenging call - follow-up needed'}
                                        </p>
                                    </div>

                                    {/* Key Topics from Tags */}
                                    {analysisResult.tags && analysisResult.tags.length > 0 && (
                                        <div className="px-3 py-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                                                <span className="text-[11px] font-semibold text-slate-500 uppercase">Key Topics</span>
                                            </div>
                                            <p className="text-sm text-slate-700">{analysisResult.tags.join(', ')}</p>
                                        </div>
                                    )}

                                    {/* Pipeline Opportunity */}
                                    {analysisResult.pipeline && analysisResult.pipeline.confidence > 50 && (
                                        <div className="px-3 py-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                                                <span className="text-[11px] font-semibold text-slate-500 uppercase">Opportunity</span>
                                            </div>
                                            <p className="text-sm text-slate-700">
                                                {analysisResult.pipeline.status === 'booked' ? 'Appointment booked successfully' :
                                                    `Potential ${analysisResult.pipeline.priority} priority deal - $${analysisResult.pipeline.dealValue} estimated value`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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

                        {/* Suggested Next Steps - Interactive Action Cards */}
                        {actionItems && actionItems.length > 0 && (
                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb className="h-4 w-4 text-amber-500" />
                                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">AI Recommended Actions</h3>
                                    <Badge variant="secondary" className="text-[9px] ml-auto bg-purple-50 text-purple-600 border-purple-200">Interactive</Badge>
                                </div>
                                <div className="space-y-2">
                                    {actionItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "px-3 py-3 rounded-lg border transition-all",
                                                item.status === 'pending' && "bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30",
                                                item.status === 'resolved' && "bg-green-50 border-green-200 opacity-60",
                                                item.status === 'created' && "bg-blue-50 border-blue-200",
                                                item.status === 'sms_sent' && "bg-purple-50 border-purple-200"
                                            )}
                                        >
                                            <div className="flex items-start gap-2 mb-2">
                                                {item.status === 'pending' && <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />}
                                                {item.status === 'resolved' && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                                                {item.status === 'created' && <ListTodo className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />}
                                                {item.status === 'sms_sent' && <MessageSquare className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />}
                                                <span className={cn(
                                                    "text-sm flex-1",
                                                    item.status === 'resolved' && "line-through text-slate-500",
                                                    item.status === 'pending' && "text-slate-700",
                                                    item.status === 'created' && "text-blue-700 font-medium",
                                                    item.status === 'sms_sent' && "text-purple-700"
                                                )}>
                                                    {item.text}
                                                </span>
                                            </div>

                                            {/* Action Buttons */}
                                            {item.status === 'pending' && (
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs px-2 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                                                        onClick={() => onCreateAction(item.id, item.text)}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Create Action
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs px-2 hover:bg-green-50 hover:text-green-700"
                                                        onClick={() => onResolveAction(item.id)}
                                                    >
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Resolve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs px-2 hover:bg-purple-50 hover:text-purple-700"
                                                        onClick={() => onSendSMS(item.id, item.text)}
                                                    >
                                                        <MessageSquare className="h-3 w-3 mr-1" />
                                                        Send SMS
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Status Messages */}
                                            {item.status === 'resolved' && (
                                                <p className="text-xs text-green-600 mt-1">✓ Marked as resolved</p>
                                            )}
                                            {item.status === 'created' && (
                                                <p className="text-xs text-blue-600 mt-1">✓ Action created in Actions page</p>
                                            )}
                                            {item.status === 'sms_sent' && (
                                                <p className="text-xs text-purple-600 mt-1">✓ SMS sent to customer</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
