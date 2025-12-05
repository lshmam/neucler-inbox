// FILE: app/ai-agent/new/page.tsx

import { getMerchantId } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { AgentSetupWizard } from "../setup-wizard"; // Adjust path if needed
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewAIAgentPage() {
    const merchantId = await getMerchantId();

    // Fetch data needed for the wizard
    const { data: merchant } = await supabaseAdmin.from("merchants").select("business_name").eq("platform_merchant_id", merchantId).single();
    const { data: profile } = await supabaseAdmin.from("business_profiles").select("*").eq("merchant_id", merchantId).single();
    if (!profile) redirect("/onboarding");

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="p-4">
                <Button variant="ghost" asChild className="mb-4">
                    <Link href="/ai-agent">← Back to Dashboard</Link>
                </Button>
            </div>
            <AgentSetupWizard
                merchantId={merchantId}
                businessProfile={{ ...profile, business_name: merchant?.business_name }}
            />
        </div>
    );
}