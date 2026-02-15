"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

import { CallOutcome } from "@/types/call";

// ============= TYPES =============
export type CallState = "idle" | "pre-call" | "ringing" | "connected" | "ended";
export type CallDirection = "inbound" | "outbound";

export interface CallCustomer {
    name: string;
    phone: string;
    vehicle?: string;
    lastVisit?: string;
    totalSpend?: number;
    visits?: number;
    openDeal?: {
        service: string;
        value: number;
        stage: string;
    };
    notes?: string;
    script?: string; // Talking points or script for the agent
}

export interface ActiveCall {
    id: string;
    state: CallState;
    direction: CallDirection;
    customer: CallCustomer;
    startedAt?: number; // timestamp when connected
    duration: number; // seconds
    outcome?: CallOutcome;
    postCallNotes?: string;
}

interface CallContextType {
    activeCall: ActiveCall | null;
    initiateCall: (customer: CallCustomer, direction?: CallDirection) => void;
    startCall: () => void; // Transition from pre-call to ringing
    answerCall: () => void;
    endCall: () => void;
    setOutcome: (outcome: ActiveCall["outcome"]) => void;
    setPostCallNotes: (notes: string) => void;
    dismissCall: () => void;
    simulateIncoming: (customer: CallCustomer) => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error("useCall must be used within CallProvider");
    return ctx;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    const activeCallRef = useRef<ActiveCall | null>(null);

    // Keep ref in sync
    useEffect(() => {
        activeCallRef.current = activeCall;
    }, [activeCall]);

    // Timer for call duration
    useEffect(() => {
        if (activeCall?.state === "connected") {
            timerRef.current = setInterval(() => {
                setActiveCall(prev => prev ? { ...prev, duration: prev.duration + 1 } : null);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [activeCall?.state]);

    const initiateCall = useCallback((customer: CallCustomer, direction: CallDirection = "outbound") => {
        const initialState: CallState = direction === "inbound" ? "ringing" : "pre-call";
        console.log("Initiating call:", { customer, direction, initialState });

        const call: ActiveCall = {
            id: `call-${Date.now()}`,
            state: initialState,
            direction,
            customer,
            duration: 0,
        };
        setActiveCall(call);
        // Redirect to full call page
        router.push("/call");
    }, [router]);

    const startCall = useCallback(async () => {
        const currentCall = activeCallRef.current;
        if (!currentCall || currentCall.state !== "pre-call") {
            console.warn("Cannot start call - nothing in pre-call state");
            return;
        }

        console.log("Starting call...", currentCall.customer.name);

        // Optimistic UI update
        setActiveCall(prev => prev ? { ...prev, state: "ringing" } : null);

        try {
            // Persist to DB
            const res = await fetch('/api/calls/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer: currentCall.customer,
                    direction: currentCall.direction
                })
            });

            if (res.ok) {
                const data = await res.json();
                console.log("✅ Call persisted with ID:", data.callId);

                // Update with Real ID
                setActiveCall(prev => prev ? { ...prev, id: data.callId } : null);
            } else {
                console.error("Failed to persist call:", await res.text());
            }

        } catch (e) {
            console.error("Error starting call:", e);
        }

        // Auto-connect after 2s for outbound (simulating pickup)
        setTimeout(() => {
            setActiveCall(current => {
                if (current && current.state === "ringing") {
                    console.log("Call connected!");
                    return { ...current, state: "connected", startedAt: Date.now() };
                }
                return current;
            });
        }, 3000);

    }, []);


    const simulateIncoming = useCallback((customer: CallCustomer) => {
        initiateCall(customer, "inbound");
    }, [initiateCall]);

    const answerCall = useCallback(() => {
        setActiveCall(prev => prev
            ? { ...prev, state: "connected", startedAt: Date.now() }
            : null
        );
    }, []);

    const endCall = useCallback(() => {
        setActiveCall(prev => prev
            ? { ...prev, state: "ended" }
            : null
        );
    }, []);

    const setOutcome = useCallback((outcome: ActiveCall["outcome"]) => {
        setActiveCall(prev => prev ? { ...prev, outcome } : null);
    }, []);

    const setPostCallNotes = useCallback((notes: string) => {
        setActiveCall(prev => prev ? { ...prev, postCallNotes: notes } : null);
    }, []);

    const dismissCall = useCallback(() => {
        setActiveCall(null);
    }, []);

    return (
        <CallContext.Provider value={{
            activeCall,
            initiateCall,
            startCall,
            answerCall,
            endCall,
            setOutcome,
            setPostCallNotes,
            dismissCall,
            simulateIncoming,
        }}>
            {children}
        </CallContext.Provider>
    );
}
