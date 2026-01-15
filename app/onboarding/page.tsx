"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import usePlacesAutocomplete from "use-places-autocomplete";
import Script from "next/script";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, LinkIcon, Loader2, Phone, Search, Clock, Sparkles, BookOpen, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveOnboardingData } from "@/app/actions/onboarding";

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
    const [step, setStep] = useState(1); // 1: Search, 2: Basic Info, 3: Knowledge Base
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchedData, setFetchedData] = useState<FetchedProfile | null>(null);

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
            // Save the profile data directly to the database
            await saveOnboardingData(fetchedData);
            toast.success("Welcome to neucler! Your profile has been set up.");
            // Redirect to dashboard
            router.push("/");
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to save profile.", {
                description: "Please try again or contact support."
            });
        } finally {
            setIsSaving(false);
        }
    };

    const resetFlow = () => {
        setFetchedData(null);
        setValue("");
        setStep(1);
    };

    // Verify if Google Maps is already loaded
    useEffect(() => {
        if (typeof window !== "undefined" && (window as any).google?.maps?.places) {
            init();
        }
    }, [init]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                strategy="afterInteractive"
                onLoad={() => init()}
            />

            {/* Step Indicator */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md border">
                {[1, 2, 3].map((s) => (
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

                            {status !== "OK" && status !== "" && value.length > 2 && (
                                <div className="p-4 text-sm text-center text-muted-foreground bg-slate-50 rounded-lg border">
                                    {status === "ZERO_RESULTS" ? (
                                        <p>No businesses found matching "{value}"</p>
                                    ) : (
                                        <p className="text-red-500">Google Maps Error: {status}</p>
                                    )}
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
                                Complete Setup <Check className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </>
                )}


            </Card>
        </div>
    );
}