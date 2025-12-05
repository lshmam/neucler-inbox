"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import usePlacesAutocomplete from "use-places-autocomplete";
import Script from "next/script";
// Import the Server Action
import { saveOnboardingData } from "@/app/actions/onboarding";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, LinkIcon, Loader2, Phone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


interface FetchedProfile {
    business_name: string;
    address: string;
    phone: string;
    website: string;
    business_hours: string[];
    services: string[];
}

export default function OnboardingPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // <--- Make sure this is here
    const [fetchedData, setFetchedData] = useState<FetchedProfile | null>(null);

    // --- GOOGLE PLACES AUTOCOMPLETE HOOK SETUP ---
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
            // 👇 This forces Google to only return results in Canada
            componentRestrictions: { country: "ca" },
        },
    });

    const handleSelectSuggestion = (placeId: string, description: string) => {
        setValue(description, false); // Update input field without re-fetching
        clearSuggestions();
        handleFetchDetails(placeId);
    };

    // This function calls our API to get enriched data
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
            toast.success("Details imported! Please review and save.");
        } catch (error: any) {
            toast.error("Failed to fetch details", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // This saves the final, reviewed data
    const handleSaveProfile = async () => {
        if (!fetchedData) return;
        setIsSaving(true);

        try {
            // Call the Server Action directly
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


    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                strategy="lazyOnload"
                onLoad={() => init()} // <--- 6. Initialize the hook only after script loads
            />
            <Card>
                {!fetchedData ? (
                    // --- STEP 1: SEARCH & FETCH ---
                    <>
                        <CardHeader>
                            <CardTitle>Find Your Business</CardTitle>
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
                                            className="p-3 hover:bg-slate-50 cursor-pointer"
                                        >
                                            {description}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </>
                ) : (
                    // --- STEP 2: REVIEW & SAVE ---
                    <>
                        <CardHeader>
                            <CardTitle>Review Your Profile</CardTitle>
                            <CardDescription>Confirm your details are correct before saving.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* (This part is the same as before, just uses the new data) */}
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
                                    <p className="font-semibold">Contact Phone</p>
                                    <p className="text-sm text-muted-foreground">{fetchedData.phone}</p>
                                </div>
                            </div>
                            {fetchedData.website && (
                                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-md border">
                                    <LinkIcon className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Website</p>
                                        <p className="text-sm text-muted-foreground">{fetchedData.website}</p>
                                    </div>
                                </div>
                            )}
                            {fetchedData.services.length > 0 && (
                                <div className="p-3 bg-slate-50 rounded-md border">
                                    <p className="font-semibold mb-2">Services We Found:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {fetchedData.services.map((service, i) => (
                                            <span key={i} className="text-xs bg-primary/10 text-primary font-medium px-2 py-1 rounded-full">{service}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={() => { setFetchedData(null); setValue(""); }}>Go Back</Button>
                            <Button onClick={handleSaveProfile} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Looks Good, Save Profile
                            </Button>
                        </CardFooter>
                    </>
                )}
            </Card>
        </div>
    );
}