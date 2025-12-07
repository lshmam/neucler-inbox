"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import usePlacesAutocomplete from "use-places-autocomplete";
import Script from "next/script";
import { saveOnboardingData } from "@/app/actions/onboarding";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, LinkIcon, Loader2, Phone, Search, Clock, Sparkles, BookOpen, ArrowRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


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
            setStep(2); // Move to Basic Info step
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
            await saveOnboardingData(fetchedData);
            toast.success("Profile saved! Welcome aboard.");
            router.push("/dashboard");
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

    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                strategy="lazyOnload"
                onLoad={() => init()}
            />

            {/* Step Indicator */}
            <div className="fixed top-8 left-1/2 -translate-x-1/2 flex gap-2">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={`h-2 w-8 rounded-full transition-all ${step >= s ? "bg-blue-500" : "bg-slate-600"}`}
                    />
                ))}
            </div>

            <Card className="max-w-lg w-full">
                {/* ===== STEP 1: SEARCH ===== */}
                {step === 1 && (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                Find Your Business
                            </CardTitle>
                            <CardDescription>
                                Search for your business on Google Maps to automatically import your details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    disabled={!ready || isLoading}
                                    placeholder="Enter your business name and city..."
                                    className="pl-10"
                                    autoComplete="off"
                                />
                                {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                            </div>
                            {status === 'OK' && (
                                <div className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                                    {suggestions.map(({ place_id, description }) => (
                                        <div
                                            key={place_id}
                                            onClick={() => handleSelectSuggestion(place_id, description)}
                                            className="p-3 hover:bg-slate-50 cursor-pointer text-sm"
                                        >
                                            {description}
                                        </div>
                                    ))}
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
                                We found these details from Google. Verify they're correct.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-md border">
                                <Building className="h-5 w-5 text-muted-foreground mt-1" />
                                <div>
                                    <p className="font-semibold">{fetchedData.business_name}</p>
                                    <p className="text-sm text-muted-foreground">{fetchedData.address}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-md border">
                                <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                                <div>
                                    <p className="font-semibold">Phone</p>
                                    <p className="text-sm text-muted-foreground">{fetchedData.phone || "Not available"}</p>
                                </div>
                            </div>
                            {fetchedData.website && (
                                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-md border">
                                    <LinkIcon className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Website</p>
                                        <p className="text-sm text-muted-foreground truncate">{fetchedData.website}</p>
                                    </div>
                                </div>
                            )}
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
                            <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save & Continue
                            </Button>
                        </CardFooter>
                    </>
                )}
            </Card>
        </div>
    );
}