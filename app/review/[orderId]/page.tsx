"use client";

import { useState, useEffect, use } from "react"; // 1. Import `use`
import { Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@supabase/supabase-js";

// Init Supabase Client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 2. Update Props Type: params is a Promise now
export default function ReviewPage({ params }: { params: Promise<{ orderId: string }> }) {
    // 3. Unwrap the params using React.use()
    const { orderId } = use(params);

    const [step, setStep] = useState("rating");
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState("");
    const [merchantName, setMerchantName] = useState("Business");
    const [googleLink, setGoogleLink] = useState("");
    const [loading, setLoading] = useState(true);

    // 1. Fetch Merchant Config
    useEffect(() => {
        async function loadData() {
            if (!orderId) return;

            // Use the unwrapped 'orderId' variable
            const { data: request } = await supabase
                .from("review_requests")
                .select("merchant_id")
                .eq("order_id", orderId)
                .single();

            if (request) {
                const { data: merchant } = await supabase.from("merchants").select("business_name").eq("platform_merchant_id", request.merchant_id).single();
                const { data: automation } = await supabase.from("automations").select("config").eq("merchant_id", request.merchant_id).eq("type", "review_booster").single();

                if (merchant) setMerchantName(merchant.business_name);
                if (automation?.config?.review_link) setGoogleLink(automation.config.review_link);
            }
            setLoading(false);
        }
        loadData();
    }, [orderId]); // Dependency is the unwrapped ID

    const handleRating = async (score: number) => {
        setRating(score);

        // LOGIC: 4 or 5 Stars -> Google
        if (score >= 4) {
            await supabase.from("review_requests").update({
                rating: score,
                status: "clicked_positive"
            }).eq("order_id", orderId);

            if (googleLink) {
                // Simple redirect
                window.location.href = googleLink;
            } else {
                setStep("success");
            }
        } else {
            // 1, 2, 3 Stars -> Feedback Form
            setStep("negative");
        }
    };

    const submitFeedback = async () => {
        await supabase.from("review_requests").update({
            rating: rating,
            feedback_text: feedback,
            status: "feedback_negative"
        }).eq("order_id", orderId);

        setStep("success");
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <CardTitle>How was your visit to {merchantName}?</CardTitle>
                    <CardDescription>We value your feedback.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* STEP 1: STARS */}
                    {step === "rating" && (
                        <div className="flex justify-center gap-3 py-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-10 w-10 cursor-pointer transition-all hover:scale-110 ${rating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                        }`}
                                    onClick={() => handleRating(star)}
                                />
                            ))}
                        </div>
                    )}

                    {/* STEP 2: NEGATIVE FEEDBACK */}
                    {step === "negative" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-sm text-muted-foreground bg-orange-50 p-3 rounded-lg text-orange-800">
                                We're sorry to hear that. Please tell us how we can do better so the owner can fix this.
                            </div>
                            <Textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="What went wrong?"
                                className="min-h-[100px]"
                            />
                            <Button onClick={submitFeedback} className="w-full">Submit Feedback</Button>
                        </div>
                    )}

                    {/* STEP 3: SUCCESS */}
                    {step === "success" && (
                        <div className="py-6 space-y-4 animate-in zoom-in-95">
                            <div className="bg-green-100 p-4 rounded-full w-fit mx-auto">
                                <MessageSquare className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="font-bold text-xl">Thank You!</h3>
                            <p className="text-muted-foreground">Your feedback has been sent directly to management.</p>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}