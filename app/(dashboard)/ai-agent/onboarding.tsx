"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RetellWebClient } from "retell-client-js-sdk"; // Ensure this is installed
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Bot, Sparkles, Phone, ArrowRight, Play, Square,
    Mic, CheckCircle2, Loader2, Volume2
} from "lucide-react";

const VOICES = [
    { id: "11labs-Adrian", name: "Adrian", gender: "Male", accent: "British", sample: "/audio/adrian_sample.mp3" },
    { id: "11labs-Nicole", name: "Nicole", gender: "Female", accent: "American", sample: "/audio/nicole_sample.mp3" },
    { id: "openai-Alloy", name: "Alloy", gender: "Neutral", accent: "American", sample: "/audio/alloy_sample.mp3" },
];

export default function OnboardingWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // --- STATE: STEP 1 (Identity) ---
    const [businessName, setBusinessName] = useState("My Business");
    const [industry, setIndustry] = useState("salon");
    const [voiceId, setVoiceId] = useState(VOICES[1].id);

    // --- STATE: STEP 2 (Behavior) ---
    const [systemPrompt, setSystemPrompt] = useState("");
    const [isWebCallActive, setIsWebCallActive] = useState(false);
    const retellWebClient = useRef<RetellWebClient | null>(null);

    // --- STATE: STEP 3 (Phone) ---
    const [areaCode, setAreaCode] = useState("");
    const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
    const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string | null>(null);

    // Initialize Retell Client
    useEffect(() => {
        retellWebClient.current = new RetellWebClient();

        // Listen for call end
        retellWebClient.current.on("call_ended", () => {
            setIsWebCallActive(false);
        });
    }, []);


    // --- ACTIONS ---

    // Step 1 -> 2: Generate Prompt
    const generatePrompt = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/agent/generate-prompt", {
                method: "POST",
                body: JSON.stringify({
                    businessName,
                    industry,
                    hours: "9 AM - 5 PM"
                })
            });
            const data = await res.json();
            setSystemPrompt(data.prompt);
            setStep(2);
        } catch (e) { alert("Error generating prompt"); }
        setLoading(false);
    };

    // Step 2: Browser Test Call
    const toggleWebCall = async () => {
        if (isWebCallActive) {
            retellWebClient.current?.stopCall();
            setIsWebCallActive(false);
            return;
        }

        setLoading(true);
        try {
            // 1. Create a temporary agent config just for this test
            // (In reality, you might hit an endpoint to register-call)
            const registerRes = await fetch("https://api.retellai.com/v2/create-web-call", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.NEXT_PUBLIC_RETELL_API_KEY}`, // NOTE: Usually handle this server-side to hide key
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    agent_id: "YOUR_AGENT_ID_OR_DYNAMIC_CONFIG" // Ideally, pass dynamic config here if API supports it, or save agent first
                })
            });

            // FOR DEMO: We assume you have a generic agent ID or use server proxy. 
            // To make this work perfectly securely:
            // create endpoint /api/agent/test-token that returns the access_token

            // Mocking the flow for UI demonstration:
            setIsWebCallActive(true);
            alert("Microphone active. Speak to your agent now.");
        } catch (e) {
            console.error(e);
            alert("Failed to start web call. Check console.");
        }
        setLoading(false);
    };

    // Step 3: Search Numbers
    const searchNumbers = async () => {
        setLoading(true);
        const res = await fetch("/api/twilio/search", {
            method: "POST",
            body: JSON.stringify({ areaCode })
        });
        const data = await res.json();
        setAvailableNumbers(data.numbers);
        setLoading(false);
    };

    // Step 3: Buy Number
    const buyNumber = async () => {
        if (!selectedPhoneNumber) return;
        setLoading(true);
        await fetch("/api/twilio/buy", {
            method: "POST",
            body: JSON.stringify({ phoneNumber: selectedPhoneNumber })
        });
        setLoading(false);
        setStep(4);
    };


    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 text-slate-50">
            <div className="max-w-3xl w-full space-y-8">

                {/* Progress Bar */}
                <div className="flex justify-between items-center px-10">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= i ? "bg-[#906CDD] text-white" : "bg-slate-800 text-slate-500"}`}>
                                {i}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                {i === 1 ? "Voice" : i === 2 ? "Brain" : i === 3 ? "Phone" : "Launch"}
                            </span>
                        </div>
                    ))}
                </div>

                {/* STEP 1: IDENTITY & VOICE */}
                {step === 1 && (
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle>Create your AI Persona</CardTitle>
                            <CardDescription>Give your agent a name and a voice.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Business Name</Label>
                                    <Input
                                        value={businessName}
                                        onChange={e => setBusinessName(e.target.value)}
                                        className="bg-slate-950 border-slate-800 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Industry</Label>
                                    <Select value={industry} onValueChange={setIndustry}>
                                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="salon">Beauty Salon / Spa</SelectItem>
                                            <SelectItem value="auto">Auto Repair</SelectItem>
                                            <SelectItem value="dental">Dental / Medical</SelectItem>
                                            <SelectItem value="restaurant">Restaurant</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-slate-300">Choose a Voice</Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {VOICES.map(voice => (
                                        <div
                                            key={voice.id}
                                            onClick={() => setVoiceId(voice.id)}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${voiceId === voice.id ? "bg-[#906CDD]/10 border-[#906CDD]" : "bg-slate-950 border-slate-800 hover:border-slate-600"}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-semibold">{voice.name}</div>
                                                {voiceId === voice.id && <CheckCircle2 className="h-4 w-4 text-[#906CDD]" />}
                                            </div>
                                            <div className="text-xs text-slate-500 mb-3">{voice.gender} • {voice.accent}</div>

                                            {/* Audio Preview Button */}
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="w-full h-8 text-xs bg-slate-800 hover:bg-slate-700 text-white"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Logic to play audio sample
                                                    const audio = new Audio(voice.sample);
                                                    audio.play().catch(() => alert("Sample audio not found in demo"));
                                                }}
                                            >
                                                <Volume2 className="h-3 w-3 mr-2" /> Preview
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                {/* Interactive Preview */}
                                <div className="mt-4 p-4 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                                    <p className="text-sm text-slate-400 italic">"Hi, thanks for calling {businessName}. How can I help you?"</p>
                                    <Button size="sm" variant="ghost" className="text-[#906CDD]">Play Greeting</Button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full bg-[#906CDD] hover:bg-[#7a5bb5]" onClick={generatePrompt} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin mr-2" /> : "Next: Configure Behavior"} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* STEP 2: SYSTEM PROMPT & TEST */}
                {step === 2 && (
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle>Train your Agent</CardTitle>
                            <CardDescription>We generated this prompt based on your industry. Tweak it to fit your style.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-slate-300">System Prompt</Label>
                                    <Button variant="ghost" size="sm" className="text-xs text-[#906CDD]" onClick={generatePrompt}>
                                        <Sparkles className="h-3 w-3 mr-1" /> Regenerate
                                    </Button>
                                </div>
                                <Textarea
                                    className="min-h-[200px] bg-slate-950 border-slate-800 text-slate-200 font-mono text-sm leading-relaxed"
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                />
                            </div>

                            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center">
                                <h3 className="text-white font-medium mb-2">Test in Browser</h3>
                                <p className="text-sm text-slate-400 mb-4">Talk to your agent right now to see how it handles questions.</p>

                                <Button
                                    size="lg"
                                    variant={isWebCallActive ? "destructive" : "default"}
                                    className={`w-48 ${isWebCallActive ? "" : "bg-white text-slate-900 hover:bg-gray-200"}`}
                                    onClick={toggleWebCall}
                                >
                                    {isWebCallActive ? (
                                        <><Square className="mr-2 h-4 w-4 fill-current" /> End Call</>
                                    ) : (
                                        <><Mic className="mr-2 h-4 w-4" /> Start Call</>
                                    )}
                                </Button>
                                {isWebCallActive && <p className="text-xs text-green-500 mt-2 animate-pulse">● Listening...</p>}
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-400">Back</Button>
                            <Button className="bg-[#906CDD] hover:bg-[#7a5bb5]" onClick={() => setStep(3)}>
                                Next: Get Phone Number
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* STEP 3: PHONE NUMBER */}
                {step === 3 && (
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle>Claim your Number</CardTitle>
                            <CardDescription>Search for a local number to connect to your AI.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-4">
                                <Input
                                    placeholder="Area Code (e.g. 415)"
                                    className="bg-slate-950 border-slate-800 text-white w-40"
                                    value={areaCode}
                                    onChange={e => setAreaCode(e.target.value)}
                                    maxLength={3}
                                />
                                <Button variant="secondary" onClick={searchNumbers} disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : "Search"}
                                </Button>
                            </div>

                            {availableNumbers.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Available Numbers</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {availableNumbers.map((n) => (
                                            <div
                                                key={n.phoneNumber}
                                                onClick={() => setSelectedPhoneNumber(n.phoneNumber)}
                                                className={`p-3 rounded border cursor-pointer flex justify-between items-center ${selectedPhoneNumber === n.phoneNumber ? "bg-[#906CDD]/20 border-[#906CDD] text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600"}`}
                                            >
                                                <span className="font-mono text-lg">{n.friendlyName}</span>
                                                {selectedPhoneNumber === n.phoneNumber && <CheckCircle2 className="h-5 w-5 text-[#906CDD]" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={() => setStep(2)} className="text-slate-400">Back</Button>
                            <Button
                                className="bg-[#906CDD] hover:bg-[#7a5bb5]"
                                onClick={buyNumber}
                                disabled={!selectedPhoneNumber || loading}
                            >
                                {loading ? "Provisioning..." : "Buy Number & Launch"}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* STEP 4: SUCCESS */}
                {step === 4 && (
                    <div className="text-center space-y-6 py-10 animate-in zoom-in duration-500">
                        <div className="mx-auto h-24 w-24 bg-green-500/20 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                        </div>
                        <h1 className="text-4xl font-bold text-white">You are Live!</h1>
                        <p className="text-slate-400 max-w-md mx-auto">
                            Your AI Agent is now active on <strong>{selectedPhoneNumber}</strong>.
                            It will handle calls according to your \"{industry}\" playbook.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={() => window.open(`tel:${selectedPhoneNumber}`)}>
                                <Phone className="mr-2 h-4 w-4" /> Call it now
                            </Button>
                            <Button className="bg-[#906CDD] hover:bg-[#7a5bb5]" onClick={() => router.push("/dashboard")}>
                                Go to Dashboard
                            </Button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}