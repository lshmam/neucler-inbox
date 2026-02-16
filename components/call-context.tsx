"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Device, Call } from "@twilio/voice-sdk";

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
    deviceReady: boolean;
    initiateCall: (customer: CallCustomer, direction?: CallDirection) => void;
    startCall: () => void; // Transition from pre-call to ringing
    answerCall: () => void;
    endCall: () => void;
    setOutcome: (outcome: ActiveCall["outcome"]) => void;
    setPostCallNotes: (notes: string) => void;
    dismissCall: () => void;
    simulateIncoming: (customer: CallCustomer) => void;
    toggleMute: () => void;
    isMuted: boolean;
}

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error("useCall must be used within CallProvider");
    return ctx;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [deviceReady, setDeviceReady] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const deviceRef = useRef<Device | null>(null);
    const callRef = useRef<Call | null>(null); // The actual Twilio Call object
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    const activeCallRef = useRef<ActiveCall | null>(null);

    // Keep ref in sync
    useEffect(() => {
        activeCallRef.current = activeCall;
    }, [activeCall]);

    // Initialize Twilio Device on mount
    useEffect(() => {
        const initDevice = async () => {
            try {
                const res = await fetch("/api/twilio/token", { method: "POST" });
                if (!res.ok) {
                    console.error("Failed to fetch Twilio token");
                    return;
                }
                const { token } = await res.json();

                const device = new Device(token, {
                    codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
                });
                deviceRef.current = device;

                device.on("registered", () => {
                    console.log("Twilio Device Registered");
                    setDeviceReady(true);
                });

                device.on("error", (error) => {
                    console.error("Twilio Device Error:", error);
                });

                // Handle Incoming Calls (Optional for this flow, but good to have)
                device.on("incoming", (call) => {
                    console.log("Incoming call from:", call.parameters.From);
                    // We could handle inbound here...
                });

                await device.register();

            } catch (error) {
                console.error("Error initializing Twilio Device:", error);
            }
        };

        initDevice();

        return () => {
            if (deviceRef.current) {
                deviceRef.current.destroy();
            }
        };
    }, []);


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

        if (!deviceRef.current) {
            console.error("Twilio Device not initialized");
            alert("Call system not ready. Please refresh.");
            return;
        }

        console.log("Starting call...", currentCall.customer.name);

        // Optimistic UI update
        setActiveCall(prev => prev ? { ...prev, state: "ringing" } : null);

        try {
            // Persist to DB (Log start)
            /*
            const res = await fetch('/api/calls/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer: currentCall.customer,
                    direction: currentCall.direction
                })
            });
            */

            // Initiate Outbound Call via Twilio SDK
            // We use the customer phone as the 'To' parameter.
            // The backend /api/twilio/voice will receive this parameter.
            const destinationNumber = currentCall.customer.phone;

            // RETELL AGENT OVERRIDE:
            // If we want to force call the Retell Agent (Simulated Customer), we might do it here.
            // For now, assuming the customer.phone IS the Retell Agent number if simulation mode.

            const call = await deviceRef.current.connect({
                params: {
                    To: destinationNumber
                }
            });

            callRef.current = call;

            call.on("accept", () => {
                console.log("Call Connected!");
                setActiveCall(prev => prev ? { ...prev, state: "connected", startedAt: Date.now() } : null);
            });

            call.on("disconnect", () => {
                console.log("Call Disconnected");
                setActiveCall(prev => prev ? { ...prev, state: "ended" } : null);
                callRef.current = null;
            });

            call.on("error", (error) => {
                console.error("Call Error:", error);
                setActiveCall(prev => prev ? { ...prev, state: "ended" } : null); // Or error state
            });

        } catch (e) {
            console.error("Error starting call:", e);
            setActiveCall(prev => prev ? { ...prev, state: "ended" } : null);
        }

    }, []);


    const simulateIncoming = useCallback((customer: CallCustomer) => {
        initiateCall(customer, "inbound");
    }, [initiateCall]);

    const answerCall = useCallback(() => {
        // Only applicable if we handled incoming calls via SDK
        setActiveCall(prev => prev
            ? { ...prev, state: "connected", startedAt: Date.now() }
            : null
        );
    }, []);

    const endCall = useCallback(() => {
        if (callRef.current) {
            callRef.current.disconnect();
        } else {
            // Force UI state if no active SDK call
            setActiveCall(prev => prev ? { ...prev, state: "ended" } : null);
        }
    }, []);

    const toggleMute = useCallback(() => {
        if (callRef.current) {
            const newMutedState = !callRef.current.isMuted();
            callRef.current.mute(newMutedState);
            setIsMuted(newMutedState);
        }
    }, [isMuted]);

    const setOutcome = useCallback((outcome: ActiveCall["outcome"]) => {
        setActiveCall(prev => prev ? { ...prev, outcome } : null);
    }, []);

    const setPostCallNotes = useCallback((notes: string) => {
        setActiveCall(prev => prev ? { ...prev, postCallNotes: notes } : null);
    }, []);

    const dismissCall = useCallback(() => {
        setActiveCall(null);
        setIsMuted(false);
    }, []);

    return (
        <CallContext.Provider value={{
            activeCall,
            deviceReady,
            initiateCall,
            startCall,
            answerCall,
            endCall,
            setOutcome,
            setPostCallNotes,
            dismissCall,
            simulateIncoming,
            toggleMute,
            isMuted
        }}>
            {children}
        </CallContext.Provider>
    );
}
