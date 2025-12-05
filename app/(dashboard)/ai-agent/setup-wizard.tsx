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

// --- STEP 1: GOOGLE BUSINESS SEARCH (Fixed) ---
function BusinessSearchStep({ onSelect }: { onSelect: (data: any) => void }) {
    const {
        ready,
        value,
        suggestions: { status, data: suggestions },
        setValue,
        clearSuggestions,
        init // <--- We need this
    } = usePlacesAutocomplete({
        requestOptions: { componentRestrictions: { country: "ca" } },
        debounce: 300,
        initOnMount: false,
    });

    useEffect(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
            init();
        }
    }, [init]);


    const [selectedPlace, setSelectedPlace] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const handleSelect = (placeId: string, description: string) => {
        setValue(description, false);
        clearSuggestions();
        setLoadingDetails(true);

        // Fetch REAL details using the Maps JS API Service
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));

        service.getDetails({ placeId, fields: ['name', 'formatted_address', 'rating', 'user_ratings_total'] }, (place, status) => {
            setLoadingDetails(false);
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                setSelectedPlace({
                    name: place.name,
                    address: place.formatted_address,
                    rating: place.rating || 0,
                    reviews: place.user_ratings_total || 0,
                });
            } else {
                // Fallback if API fails
                setSelectedPlace({
                    name: description.split(',')[0],
                    address: description,
                    rating: 0,
                    reviews: 0
                });
            }
        });
    };

    const handleReset = () => {
        setValue("");
        setSelectedPlace(null);
        clearSuggestions();
    };

    return (
        <div className="space-y-8 max-w-xl mx-auto mt-10">
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                strategy="lazyOnload"
                onLoad={() => init()} // Initializes when script finishes loading
            />

            <div className="text-left space-y-4">
                <h1 className="text-3xl font-bold tracking-tight">Connect your <span className="text-red-500">Google Business Profile</span></h1>
                <p className="text-muted-foreground">We'll train your agent on your hours, location, and services automatically.</p>
            </div>

            <div className="mt-8 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        disabled={!ready}
                        className="pl-10 h-12 text-lg"
                        placeholder="Search for your business..."
                    />
                    {/* Reset Button to fix 'Freeze' issues */}
                    {value && (
                        <button onClick={handleReset} className="absolute right-3 top-3 text-slate-400 hover:text-black">
                            <RefreshCcw className="h-5 w-5" />
                        </button>
                    )}

                    {status === "OK" && (
                        <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                            {suggestions.map((suggestion) => (
                                <li
                                    key={suggestion.place_id}
                                    onClick={() => handleSelect(suggestion.place_id, suggestion.description)}
                                    className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0"
                                >
                                    {suggestion.description}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {loadingDetails && <div className="text-center text-muted-foreground">Fetching business details...</div>}

            {selectedPlace && !loadingDetails && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="p-4 flex flex-col md:flex-row gap-4 items-start border-red-100 bg-red-50/30">
                        <div className="h-16 w-16 bg-white rounded-lg flex items-center justify-center shrink-0 border border-red-100 shadow-sm">
                            <Building2 className="h-8 w-8 text-red-500" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <h3 className="font-bold text-lg">{selectedPlace.name}</h3>
                            <p className="text-sm text-muted-foreground">{selectedPlace.address}</p>

                            {/* REAL RATINGS DISPLAY */}
                            {selectedPlace.rating > 0 ? (
                                <div className="flex items-center gap-1 text-yellow-500 text-sm">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`h-4 w-4 ${i < Math.round(selectedPlace.rating) ? "fill-current" : "text-slate-300"}`} />
                                    ))}
                                    <span className="font-medium text-black ml-2">{selectedPlace.rating}</span>
                                    <span className="text-muted-foreground">({selectedPlace.reviews} reviews)</span>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">No ratings found (New Listing)</p>
                            )}
                        </div>
                    </Card>

                    <Button
                        className="w-full mt-6 h-12 text-lg bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => onSelect(selectedPlace)}
                    >
                        Confirm & Train Agent <Sparkles className="ml-2 h-5 w-5" />
                    </Button>
                </motion.div>
            )}
        </div>
    );
}

// --- STEP 2: TRAINING SIMULATION (Unchanged) ---
function TrainingStep({ businessName, onComplete }: { businessName: string, onComplete: () => void }) {
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("Initializing...");

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(onComplete, 800);
                    return 100;
                }
                if (prev === 10) setStatusText(`Reading reviews for ${businessName}...`);
                if (prev === 40) setStatusText("Analyzing services and pricing...");
                if (prev === 70) setStatusText("Generating conversational style...");
                if (prev === 90) setStatusText("Finalizing voice model...");
                return prev + 1;
            });
        }, 40);
        return () => clearInterval(interval);
    }, [businessName, onComplete]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8">
            <div className="relative h-32 w-32">
                <svg className="h-full w-full transform -rotate-90">
                    <circle cx="64" cy="64" r="60" stroke="#f3f4f6" strokeWidth="8" fill="none" />
                    <circle cx="64" cy="64" r="60" stroke="#dc2626" strokeWidth="8" fill="none" strokeDasharray={377} strokeDashoffset={377 - (377 * progress) / 100} className="transition-all duration-100 ease-linear" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-red-500 animate-pulse" />
                </div>
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Training Agent...</h2>
                <p className="text-muted-foreground">{statusText}</p>
            </div>
            <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}

// --- STEP 3: IDENTITY & VOICE (Major Overhaul) ---
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

    // --- FIX: Button to confirm name change ---
    const handleNameSave = () => {
        // Just resetting the player forces the next "Play" click to regenerate audio
        resetPlayer();
    };

    const togglePlay = async () => {
        if (playing) {
            audioRef.current?.pause();
            setPlaying(false);
            return;
        }

        // Use current if exists
        if (audioRef.current) {
            audioRef.current.play();
            setPlaying(true);
            return;
        }

        // Fetch New Audio
        setLoadingAudio(true);
        try {
            const res = await fetch("/api/onboarding/generate-preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessName: businessName,
                    agentName: agentName, // Uses current name state
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
                    {/* --- New Button to Save Name --- */}
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
                {/* Removed callType from here, only passing name and gender */}
                <Button size="lg" className="bg-black text-white hover:bg-gray-800" onClick={() => onNext({ agentName, voiceGender: selectedGender })}>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// --- STEP 4: CONFIGURATION (Delay & Hours) ---
function ConfigStep({ onNext }: { onNext: (data: any) => void }) {
    const [config, setConfig] = useState({
        callType: "inbound", // <--- Moved here
        pickupMode: "immediate",
        delaySeconds: 10,
        scheduleMode: "business_hours"
    });

    return (
        <div className="max-w-xl mx-auto space-y-8 mt-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Call Handling Rules</h2>
                <p className="text-muted-foreground">Define how and when your agent answers.</p>
            </div>

            <div className="space-y-6">

                {/* --- MOVED: Primary Function --- */}
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
                        {/* ... (Same Radio Items as before) ... */}
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

                    {/* SLIDER FOR DELAY */}
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

                {/* SCHEDULE */}
                <div className="border-t pt-6 space-y-3">
                    <Label className="text-base">Hours of Operation</Label>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <span className="font-medium">Answer 24/7</span>
                            <p className="text-sm text-muted-foreground">Agent answers calls even when your shop is closed.</p>
                        </div>
                        <Switch
                            checked={config.scheduleMode === '24/7'}
                            onCheckedChange={(c) => setConfig({ ...config, scheduleMode: c ? '24/7' : 'business_hours' })}
                        />
                    </div>
                </div>

            </div>

            <div className="pt-4 flex justify-end">
                <Button size="lg" className="bg-black text-white hover:bg-gray-800" onClick={() => onNext(config)}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// --- STEP 5: FINAL CONTACT (Unchanged logic, just keeping structure) ---
function FinalStep({ merchantId, finalData, onSave }: { merchantId: string, finalData: any, onSave: () => void }) {
    const [loading, setLoading] = useState(false);
    const [contact, setContact] = useState({ phone: "", areaCode: "415" });

    const handleFinalSubmit = async () => {
        setLoading(true);
        const payload = {
            merchantId,
            name: finalData.agentName, // Using custom name
            voiceGender: finalData.voiceGender,
            type: finalData.config.callType,
            handoffNumber: contact.phone,
            areaCode: contact.areaCode,
            // Mapping new config
            pickupBehavior: finalData.config.pickupMode,
            pickupDelay: finalData.config.delaySeconds,
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
export function AgentSetupWizard({ merchantId }: { merchantId: string }) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [wizardData, setWizardData] = useState<any>({});
    const nextStep = () => setStep(step + 1);

    return (
        <div className="min-h-screen bg-white text-slate-900 p-6 md:p-12">
            <div className="flex justify-between items-center mb-12 max-w-4xl mx-auto">
                {step > 1 && step < 6 && <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground">Reset</Button>}
            </div>

            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>

                        {step === 1 && (
                            <BusinessSearchStep onSelect={(data) => {
                                setWizardData({ ...wizardData, ...data, businessName: data.name });
                                nextStep();
                            }} />
                        )}

                        {step === 2 && (
                            <TrainingStep businessName={wizardData.businessName} onComplete={nextStep} />
                        )}

                        {step === 3 && (
                            <VoiceIdentityStep businessName={wizardData.businessName} onNext={(data) => {
                                setWizardData({ ...wizardData, ...data }); // Stores agentName, callType, voiceGender
                                nextStep();
                            }} />
                        )}

                        {step === 4 && (
                            <ConfigStep onNext={(config) => {
                                setWizardData({ ...wizardData, config });
                                nextStep();
                            }} />
                        )}

                        {step === 5 && (
                            <FinalStep merchantId={merchantId} finalData={wizardData} onSave={() => setStep(6)} />
                        )}

                        {step === 6 && (
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