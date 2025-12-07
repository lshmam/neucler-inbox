"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import usePlacesAutocomplete from "use-places-autocomplete";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Building2, Star, CheckCircle2, Play, Pause,
    ArrowRight, Sparkles, User, RefreshCcw, Clock, PhoneIncoming, PhoneOutgoing
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveAgentConfig } from "@/app/actions/agent";


// --- STEP 1: IDENTITY & VOICE (Was Step 3) ---
function VoiceIdentityStep({ businessName, onNext }: { businessName: string, onNext: (data: any) => void }) {
    const [agentName, setAgentName] = useState("Benny");
    const [selectedGender, setSelectedGender] = useState<"female" | "male">("female");

    // Audio State
    const [playing, setPlaying] = useState(false);
    const [loadingAudio, setLoadingAudio] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Helper: Format seconds
    const formatTime = (time: number) => {
        if (isNaN(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const resetPlayer = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setPlaying(false);
        setAudioProgress(0);
    };

    const handleGenderChange = (gender: "female" | "male") => {
        setSelectedGender(gender);
        resetPlayer();
    };

    const handleNameSave = () => {
        resetPlayer();
    };

    const togglePlay = async () => {
        if (playing) {
            audioRef.current?.pause();
            setPlaying(false);
            return;
        }

        if (audioRef.current) {
            audioRef.current.play();
            setPlaying(true);
            return;
        }

        setLoadingAudio(true);
        try {
            const res = await fetch("/api/onboarding/generate-preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessName: businessName || "Your Business",
                    agentName: agentName,
                    gender: selectedGender
                })
            });

            if (!res.ok) throw new Error("Generation failed");

            const data = await res.json();

            const audio = new Audio(data.audio);
            audioRef.current = audio;

            audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
            audio.addEventListener('timeupdate', () => {
                setAudioProgress((audio.currentTime / audio.duration) * 100);
            });
            audio.addEventListener('ended', () => {
                setPlaying(false);
                setAudioProgress(100);
            });

            audio.play();
            setPlaying(true);
        } catch (e) {
            console.error(e);
            alert("Could not generate audio preview.");
        } finally {
            setLoadingAudio(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-8 mt-6">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold">Configure Agent Identity</h2>
                <p className="text-muted-foreground">Give your agent a name and a voice.</p>
            </div>

            <div className="space-y-4">
                <Label>Agent Name</Label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={agentName}
                            onChange={(e) => setAgentName(e.target.value)}
                            className="pl-9"
                            placeholder="e.g. Alex"
                        />
                    </div>
                    <Button variant="outline" onClick={handleNameSave} title="Update Voice with new name">
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Voice Selection */}
            <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                    <Label className="text-base">Voice Preference</Label>
                    <div className="flex p-1 bg-slate-100 rounded-lg">
                        <button
                            onClick={() => handleGenderChange("female")}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${selectedGender === "female" ? "bg-white shadow text-pink-600" : "text-slate-500"
                                }`}
                        >
                            Female
                        </button>
                        <button
                            onClick={() => handleGenderChange("male")}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${selectedGender === "male" ? "bg-white shadow text-blue-600" : "text-slate-500"
                                }`}
                        >
                            Male
                        </button>
                    </div>
                </div>

                <Card className="p-4 flex items-center gap-4 bg-slate-50 border-slate-200">
                    <Button
                        size="icon"
                        className={`h-14 w-14 rounded-full shadow-lg shrink-0 ${selectedGender === 'female' ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                        onClick={togglePlay}
                        disabled={loadingAudio}
                    >
                        {loadingAudio ? (
                            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />
                        )}
                    </Button>

                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="font-semibold text-slate-900">Opening Greeting</span>
                            <span className="text-xs font-mono text-slate-500">
                                {audioRef.current ? formatTime(audioRef.current.currentTime) : "00:00"}
                                {" / "}
                                {duration ? formatTime(duration) : "00:00"}
                            </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden w-full">
                            <div
                                className={`h-full transition-all duration-100 ${selectedGender === 'female' ? 'bg-pink-500' : 'bg-blue-500'}`}
                                style={{ width: `${audioProgress}%` }}
                            />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="pt-6 flex justify-end">
                <Button size="lg" className="bg-black text-white hover:bg-gray-800" onClick={() => onNext({ agentName, voiceGender: selectedGender })}>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// --- STEP 2: FUNCTONALITY & KNOWLEDGE (Merged/Simplified) ---
function FunctionalityStep({ initialPrompt, onNext }: { initialPrompt: string, onNext: (data: any) => void }) {
    const [systemPrompt, setSystemPrompt] = useState(initialPrompt);
    const [extraInfo, setExtraInfo] = useState("");
    const [config, setConfig] = useState({
        callType: "inbound",
        pickupMode: "immediate",
        delaySeconds: 10,
        scheduleMode: "business_hours"
    });

    const handleContinue = () => {
        let finalPrompt = systemPrompt;
        if (extraInfo.trim()) {
            finalPrompt += `\n\n## ADDITIONAL KNOWLEDGE\n${extraInfo}`;
        }
        onNext({ systemPrompt: finalPrompt, config });
    };

    return (
        <div className="max-w-xl mx-auto space-y-8 mt-6">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold">Agent Functionality</h2>
                <p className="text-muted-foreground">Configure how your agent behaves and what it knows.</p>
            </div>

            {/* CALL RULES */}
            <div className="space-y-6">
                <div className="space-y-3">
                    <Label>Primary Function</Label>
                    <div className="flex p-1 bg-slate-100 rounded-lg">
                        <button
                            onClick={() => setConfig({ ...config, callType: "inbound" })}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-all ${config.callType === "inbound" ? "bg-white shadow text-black" : "text-slate-500"
                                }`}
                        >
                            <PhoneIncoming className="h-4 w-4" /> Inbound Receptionist
                        </button>
                        <button
                            onClick={() => setConfig({ ...config, callType: "outbound" })}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-all ${config.callType === "outbound" ? "bg-white shadow text-black" : "text-slate-500"
                                }`}
                        >
                            <PhoneOutgoing className="h-4 w-4" /> Outbound Caller
                        </button>
                    </div>
                </div>

                {/* PICKUP BEHAVIOR */}
                <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base">Pickup Speed</Label>
                    <RadioGroup
                        value={config.pickupMode}
                        onValueChange={(v) => setConfig({ ...config, pickupMode: v })}
                        className="grid grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem value="immediate" id="imm" className="peer sr-only" />
                            <Label htmlFor="imm" className="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50/20">
                                <PhoneIncoming className="mb-2 h-6 w-6 text-slate-600" />
                                <span className="font-semibold">Immediate</span>
                                <span className="text-xs text-muted-foreground mt-1">Answers instantly</span>
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="delay" id="del" className="peer sr-only" />
                            <Label htmlFor="del" className="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50/20">
                                <Clock className="mb-2 h-6 w-6 text-slate-600" />
                                <span className="font-semibold">Delayed</span>
                                <span className="text-xs text-muted-foreground mt-1">Wait {config.delaySeconds}s</span>
                            </Label>
                        </div>
                    </RadioGroup>

                    {config.pickupMode === 'delay' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="pt-4 px-2"
                        >
                            <div className="flex justify-between mb-2">
                                <span className="text-sm">Wait time:</span>
                                <span className="font-bold text-red-600">{config.delaySeconds} Seconds</span>
                            </div>
                            <Slider
                                defaultValue={[10]}
                                max={30}
                                min={5}
                                step={1}
                                onValueChange={(v) => setConfig({ ...config, delaySeconds: v[0] })}
                            />
                        </motion.div>
                    )}
                </div>
            </div>

            {/* KNOWLEDGE BASE SECTION */}
            <div className="space-y-4 pt-6 border-t">
                <div className="space-y-2">
                    <Label>Agent System Prompt</Label>
                    <textarea
                        className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Adjust the core personality and instructions.</p>
                </div>
                <div className="space-y-2">
                    <Label>Additional Context</Label>
                    <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="e.g. Current special offers, WiFi password..."
                        value={extraInfo}
                        onChange={(e) => setExtraInfo(e.target.value)}
                    />
                </div>
            </div>

            <div className="pt-6 flex justify-end">
                <Button size="lg" className="bg-black text-white hover:bg-gray-800" onClick={handleContinue}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}


// --- STEP 3: FINAL CONTACT ---
function FinalStep({ merchantId, finalData, onSave }: { merchantId: string, finalData: any, onSave: () => void }) {
    const [loading, setLoading] = useState(false);
    const [contact, setContact] = useState({ phone: "", areaCode: "415" });

    const handleFinalSubmit = async () => {
        setLoading(true);
        const payload = {
            merchantId,
            name: finalData.agentName,
            voiceGender: finalData.voiceGender,
            type: finalData.config.callType,
            handoffNumber: contact.phone,
            areaCode: contact.areaCode,
            pickupBehavior: finalData.config.pickupMode,
            pickupDelay: finalData.config.delaySeconds,
            systemPrompt: finalData.systemPrompt,
        };

        try {
            await saveAgentConfig(merchantId, payload);
            onSave();
        } catch (e) {
            console.error(e);
            alert("Error saving agent.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-8 mt-10">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold">Where should calls forward?</h2>
                <p className="text-muted-foreground">If the agent needs help, who should it transfer to?</p>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Forwarding Number</Label>
                    <Input placeholder="(555) 123-4567" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Preferred Area Code for Agent</Label>
                    <Input placeholder="e.g. 212" maxLength={3} value={contact.areaCode} onChange={(e) => setContact({ ...contact, areaCode: e.target.value })} />
                    <p className="text-xs text-muted-foreground">We will buy a number in this area code.</p>
                </div>
            </div>
            <div className="pt-4 flex justify-end">
                <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white w-full" onClick={handleFinalSubmit} disabled={loading}>
                    {loading ? "Provisioning..." : "Finish Setup"}
                </Button>
            </div>
        </div>
    );
}

// --- MAIN CONTROLLER ---
export function AgentSetupWizard({ merchantId, businessProfile }: { merchantId: string; businessProfile?: any }) {
    const router = useRouter();
    const [step, setStep] = useState(1);

    // Initialize wizard data with business profile info if available
    const [wizardData, setWizardData] = useState<any>({
        businessName: businessProfile?.business_name || "",
        website: businessProfile?.website || "",
        // Pre-fill a basic prompt using the business name
        generatedPrompt: `You are the AI receptionist for ${businessProfile?.business_name || "our business"}. Be polite and professional.`
    });

    const nextStep = () => setStep(step + 1);

    return (
        <div className="min-h-screen bg-white text-slate-900 p-6 md:p-12">
            <div className="flex justify-between items-center mb-12 max-w-4xl mx-auto">
                {step > 1 && step < 4 && <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground">Reset</Button>}
            </div>

            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>

                        {/* Step 1: Voice & Identity (Starts here now) */}
                        {step === 1 && (
                            <VoiceIdentityStep businessName={wizardData.businessName} onNext={(data) => {
                                setWizardData({ ...wizardData, ...data });
                                nextStep();
                            }} />
                        )}

                        {/* Step 2: Functionality & Knowledge */}
                        {step === 2 && (
                            <FunctionalityStep
                                initialPrompt={wizardData.generatedPrompt} // Pass the pre-filled prompt
                                onNext={(data) => {
                                    setWizardData({ ...wizardData, ...data });
                                    nextStep();
                                }}
                            />
                        )}

                        {/* Step 3: Final Contact */}
                        {step === 3 && (
                            <FinalStep merchantId={merchantId} finalData={wizardData} onSave={() => setStep(4)} />
                        )}

                        {/* Success State */}
                        {step === 4 && (
                            <div className="text-center py-20 space-y-6 max-w-lg mx-auto">
                                <div className="mx-auto h-24 w-24 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                                </div>
                                <h2 className="text-3xl font-bold">You're all set!</h2>
                                <p className="text-muted-foreground">Your agent <strong>{wizardData.agentName}</strong> is being provisioned.</p>
                                <Button size="lg" className="mt-8" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}