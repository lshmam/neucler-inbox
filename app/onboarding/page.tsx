"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import usePlacesAutocomplete from "use-places-autocomplete";
import Script from "next/script";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, LinkIcon, Loader2, Phone, Search, Clock, Sparkles, BookOpen, ArrowRight, ArrowLeft, Check, CreditCard, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Stripe Price IDs - Replace with your actual IDs from Stripe Dashboard
const PLANS = {
    starter: {
        id: "starter",
        name: "Starter",
        price: 79,
        priceId: "price_1SfzBFH9dzNCFC8lJSgth6jB", // Replace with real Stripe Price ID
        features: [
            "Unified Support Inbox",
            "Operational Playbook",
            "Post-Call Performance Scoring",
            "Dispute Protection Vault",
            "Essential Insights Dashboard"
        ]
    },
    pro: {
        id: "pro",
        name: "Pro",
        price: 149,
        priceId: "price_1SfzCKH9dzNCFC8lT3YfS8O6", // Replace with real Stripe Price ID
        features: [
            "Everything in Starter",
            "AI Smart-Filter Call Routing",
            "Active Agent Copilot",
            "Automated Missed Call Rescue",
            "Smart Capacity Waitlist",
            "AI Voice Receptionists"
        ]
    }
};

interface FetchedProfile {
    business_name: string;
    address: string;
    phone: string;
    website: string;
    business_hours: string[];
    services: string[];
    generated_articles: { title: string; content: string; category: string }[];
}

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Search, 2: Basic Info, 3: Knowledge Base, 4: Plan Selection
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchedData, setFetchedData] = useState<FetchedProfile | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro">("pro");
    const [isStartingTrial, setIsStartingTrial] = useState(false);

    const {
        ready,
        value,
        suggestions: { status, data: suggestions },
        setValue,
        clearSuggestions,
        init,
    } = usePlacesAutocomplete({
        initOnMount: false,
        debounce: 300,
        requestOptions: {
            componentRestrictions: { country: "ca" },
        },
    });

    const handleSelectSuggestion = (placeId: string, description: string) => {
        setValue(description, false);
        clearSuggestions();
        handleFetchDetails(placeId);
    };

    const handleFetchDetails = async (placeId: string) => {
        if (!placeId) return;
        setIsLoading(true);

        try {
            const res = await fetch("/api/onboarding/fetch-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ placeId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setFetchedData(data);
            setStep(2);
            toast.success("Details imported!");
        } catch (error: any) {
            toast.error("Failed to fetch details", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!fetchedData) return;
        setIsSaving(true);

        try {
            // Store data locally - will be saved after successful payment
            localStorage.setItem("onboarding_data", JSON.stringify(fetchedData));
            toast.success("Profile ready!");
            setStep(4); // Move to plan selection
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to save profile.", {
                description: "Please try again or contact support."
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleStartTrial = async () => {
        setIsStartingTrial(true);
        const plan = PLANS[selectedPlan];

        // Get stored onboarding data
        const storedData = localStorage.getItem("onboarding_data");
        const onboardingData = storedData ? JSON.parse(storedData) : fetchedData;

        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    priceId: plan.priceId,
                    planTier: selectedPlan,
                    trialDays: 7,
                    // Pass onboarding data to be saved after payment
                    onboardingData: {
                        business_name: onboardingData?.business_name,
                        address: onboardingData?.address,
                        phone: onboardingData?.phone,
                        website: onboardingData?.website,
                    }
                }),
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "Failed to create checkout");
            }
        } catch (error: any) {
            toast.error("Failed to start trial", { description: error.message });
            setIsStartingTrial(false);
        }
    };

    const resetFlow = () => {
        setFetchedData(null);
        setValue("");
        setStep(1);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                strategy="lazyOnload"
                onLoad={() => init()}
            />

            {/* Step Indicator */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md border">
                {[1, 2, 3, 4].map((s) => (
                    <div
                        key={s}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${s === step
                            ? "bg-slate-900 text-white"
                            : s < step
                                ? "bg-slate-900 text-white"
                                : "bg-slate-200 text-slate-500"
                            }`}
                    >
                        {s < step ? <Check className="h-4 w-4" /> : s}
                    </div>
                ))}
            </div>

            <Card className="w-full max-w-2xl shadow-2xl border-slate-200">
                {/* ===== STEP 1: BUSINESS SEARCH ===== */}
                {step === 1 && (
                    <>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Welcome to neucler</CardTitle>
                            <CardDescription>
                                Let's set up your shop. Search for your business to auto-fill details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search for your business name..."
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    disabled={!ready}
                                    className="pl-10 h-12"
                                />
                            </div>

                            {status === "OK" && (
                                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion.place_id}
                                            className="w-full p-3 text-left hover:bg-slate-50 transition-colors"
                                            onClick={() => handleSelectSuggestion(suggestion.place_id, suggestion.description)}
                                        >
                                            <p className="font-medium text-sm">{suggestion.structured_formatting.main_text}</p>
                                            <p className="text-xs text-muted-foreground">{suggestion.structured_formatting.secondary_text}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {isLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    <span className="ml-2 text-muted-foreground">Fetching business details...</span>
                                </div>
                            )}
                        </CardContent>
                    </>
                )}

                {/* ===== STEP 2: BASIC INFO REVIEW ===== */}
                {step === 2 && fetchedData && (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building className="h-5 w-5" />
                                Confirm Your Details
                            </CardTitle>
                            <CardDescription>
                                We found the following information. You can edit these later in Settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4">
                                <div className="p-4 bg-slate-50 rounded-lg border">
                                    <p className="text-xs text-muted-foreground mb-1">Business Name</p>
                                    <p className="font-semibold">{fetchedData.business_name}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border">
                                    <p className="text-xs text-muted-foreground mb-1">Address</p>
                                    <p className="font-semibold">{fetchedData.address}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> Phone
                                        </p>
                                        <p className="font-semibold">{fetchedData.phone || "Not found"}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                            <LinkIcon className="h-3 w-3" /> Website
                                        </p>
                                        <p className="font-semibold truncate">{fetchedData.website || "Not found"}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-2">
                            <Button variant="ghost" onClick={resetFlow}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Start Over
                            </Button>
                            <Button onClick={() => setStep(3)}>
                                Next: Knowledge Base <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </>
                )}

                {/* ===== STEP 3: KNOWLEDGE BASE REVIEW ===== */}
                {step === 3 && fetchedData && (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                AI Knowledge Base
                            </CardTitle>
                            <CardDescription>
                                This data will train your AI agent to answer customer questions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-[50svh] overflow-y-auto pr-2">
                            {/* Business Hours */}
                            {fetchedData.business_hours && fetchedData.business_hours.length > 0 && (
                                <div className="p-3 bg-slate-50 rounded-md border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="h-4 w-4 text-blue-500" />
                                        <p className="font-semibold text-sm">Business Hours</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-1">
                                        {fetchedData.business_hours.map((hourStr, i) => (
                                            <p key={i} className="text-xs text-muted-foreground">{hourStr}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Services */}
                            {fetchedData.services && fetchedData.services.length > 0 && (
                                <div className="p-3 bg-slate-50 rounded-md border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="h-4 w-4 text-purple-500" />
                                        <p className="font-semibold text-sm">Services Detected</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {fetchedData.services.map((service, i) => (
                                            <span key={i} className="text-xs bg-purple-100 text-purple-700 font-medium px-2 py-1 rounded-full">
                                                {service}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Generated Articles */}
                            {fetchedData.generated_articles && fetchedData.generated_articles.length > 0 && (
                                <div className="p-3 bg-slate-50 rounded-md border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="h-4 w-4 text-green-500" />
                                        <p className="font-semibold text-sm">Q&A Articles ({fetchedData.generated_articles.length})</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Extracted from your website to help your AI answer questions.
                                    </p>
                                    <div className="space-y-2">
                                        {fetchedData.generated_articles.map((article, i) => (
                                            <div key={i} className="text-xs border-l-2 border-green-500 pl-2 py-1">
                                                <span className="font-semibold block">{article.title}</span>
                                                <span className="text-muted-foreground block line-clamp-2">{article.content}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {(!fetchedData.business_hours || fetchedData.business_hours.length === 0) &&
                                (!fetchedData.services || fetchedData.services.length === 0) &&
                                (!fetchedData.generated_articles || fetchedData.generated_articles.length === 0) && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p className="text-sm">No additional knowledge found.</p>
                                        <p className="text-xs">You can add articles manually in Settings later.</p>
                                    </div>
                                )}
                        </CardContent>
                        <CardFooter className="flex justify-between pt-2">
                            <Button variant="ghost" onClick={() => setStep(2)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                            <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-black hover:bg-gray-800 text-white">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Next: Choose Plan <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </>
                )}

                {/* ===== STEP 4: PLAN SELECTION & TRIAL ===== */}
                {step === 4 && (
                    <>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Choose Your Plan</CardTitle>
                            <CardDescription>
                                Start your 7-day free trial. No charge until your trial ends.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Plan Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Starter Plan */}
                                <div
                                    onClick={() => setSelectedPlan("starter")}
                                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === "starter"
                                        ? "border-blue-600 bg-blue-50"
                                        : "border-slate-200 hover:border-slate-300"
                                        }`}
                                >
                                    {selectedPlan === "starter" && (
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                            <Check className="h-4 w-4 text-white" />
                                        </div>
                                    )}
                                    <h3 className="text-xl font-bold">{PLANS.starter.name}</h3>
                                    <p className="text-2xl font-bold mt-1">
                                        ${PLANS.starter.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                                    </p>
                                    <ul className="mt-4 space-y-2">
                                        {PLANS.starter.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                                <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Pro Plan */}
                                <div
                                    onClick={() => setSelectedPlan("pro")}
                                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === "pro"
                                        ? "border-blue-600 bg-blue-50"
                                        : "border-slate-200 hover:border-slate-300"
                                        }`}
                                >
                                    {selectedPlan === "pro" && (
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                            <Check className="h-4 w-4 text-white" />
                                        </div>
                                    )}
                                    <div className="absolute -top-2 left-4 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] font-bold rounded-full">
                                        RECOMMENDED
                                    </div>
                                    <h3 className="text-xl font-bold">{PLANS.pro.name}</h3>
                                    <p className="text-2xl font-bold mt-1">
                                        ${PLANS.pro.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                                    </p>
                                    <ul className="mt-4 space-y-2">
                                        {PLANS.pro.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                                <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Trial Notice */}
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-900">7-Day Free Trial</p>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        Your card won't be charged until your trial ends. We'll send you a reminder email 1 day before.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                onClick={handleStartTrial}
                                disabled={isStartingTrial}
                                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-lg"
                            >
                                {isStartingTrial ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Setting up checkout...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="mr-2 h-5 w-5" />
                                        Start Free Trial
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                                By continuing, you agree to our Terms of Service and Privacy Policy
                            </p>
                        </CardFooter>
                    </>
                )}
            </Card>
        </div>
    );
}