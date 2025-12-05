import { getMerchantId } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
// import { OnboardingForm } from "@/app/onboarding-square/form"; // Reusing your form
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
    const merchantId = await getMerchantId();

    const { data: merchant } = await supabaseAdmin
        .from("merchants")
        .select("business_name")
        .eq("platform_merchant_id", merchantId)
        .single();

    const { data: profile } = await supabaseAdmin
        .from("business_profiles")
        .select("*")
        .eq("merchant_id", merchantId)
        .single();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                {/* LEFT COLUMN: Main Form */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Business Configuration</CardTitle>
                            <CardDescription>
                                Update your hours, services, and AI personality. Changes take effect immediately.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Reuse the form in "Settings Mode" */}
                            {/* <OnboardingForm
                                merchantId={merchantId}
                                initialData={profile}
                                businessName={merchant?.business_name}
                                isSettings={true}
                            /> */}
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Account Info (Optional placeholder) */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Business Name</p>
                                <p className="text-sm text-muted-foreground">{merchant?.business_name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Merchant ID</p>
                                <p className="text-xs font-mono bg-muted p-1 rounded">{merchantId}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}