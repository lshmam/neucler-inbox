"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

// ============= TYPES =============
export type CallState = "idle" | "ringing" | "connected" | "ended";
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
}

export interface ActiveCall {
    id: string;
    state: CallState;
    direction: CallDirection;
    customer: CallCustomer;
    startedAt?: number; // timestamp when connected
    duration: number; // seconds
    outcome?: "booked" | "follow_up" | "not_interested" | "no_answer";
    postCallNotes?: string;
}

interface CallContextType {
    activeCall: ActiveCall | null;
    initiateCall: (customer: CallCustomer, direction?: CallDirection) => void;
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
        const call: ActiveCall = {
            id: `call-${Date.now()}`,
            state: "ringing",
            direction,
            customer,
            duration: 0,
        };
        setActiveCall(call);

        // Auto-connect after 2s for outbound (simulating pickup)
        if (direction === "outbound") {
            setTimeout(() => {
                setActiveCall(prev => prev && prev.state === "ringing"
                    ? { ...prev, state: "connected", startedAt: Date.now() }
                    : prev
                );
            }, 2000);
        }
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
