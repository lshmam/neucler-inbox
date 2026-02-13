"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

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
    outcome?: "booked" | "follow_up" | "not_interested" | "no_answer";
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
    }, []);

    const startCall = useCallback(() => {
        console.log("Starting call...");
        setActiveCall(prev => {
            if (!prev || prev.state !== "pre-call") {
                console.warn("Cannot start call - invalid state:", prev?.state);
                return prev;
            }

            // Start ringing
            // Auto-connect after 2s for outbound (simulating pickup)
            setTimeout(() => {
                setActiveCall(current => {
                    if (current && current.state === "ringing") {
                        console.log("Call connected!");
                        return { ...current, state: "connected", startedAt: Date.now() };
                    }
                    return current;
                });
            }, 2000);

            return { ...prev, state: "ringing" };
        });
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
