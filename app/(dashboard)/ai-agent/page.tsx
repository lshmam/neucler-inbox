import { getMerchantId } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { AIAgentClientView } from "./client-view";
import { AgentSetupWizard } from "./setup-wizard";
import { AgentConfigForm } from "./agent-form"; // Ensure this import exists if you use it
import { Button } from "@/components/ui/button";
import Link from "next/link";

// --- FIX 1: Update Type for Next.js 15 ---
interface AIAgentPageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function AIAgentPage({ searchParams }: AIAgentPageProps) {
    const merchantId = await getMerchantId();

    console.log("------------------------------------------------");
    console.log("🍪 Current Session Merchant ID:", merchantId);

    // Check if we are finding agents for this ID
    const { data: debugAgents, error } = await supabaseAdmin
        .from("ai_agents")
        .select("id, name, merchant_id")
        .eq("merchant_id", merchantId);

    console.log("🔍 Database Search Result:", debugAgents?.length, "agents found.");
    if (error) console.error("❌ DB Error:", error);
    console.log("------------------------------------------------");


    // --- FIX 2: Await the searchParams (Next.js 15 Requirement) ---
    const resolvedParams = await searchParams;
    const action = resolvedParams?.action;
    const agentId = resolvedParams?.id;
    // -------------------------------------------------------------

    // --- VIEW 1: "CREATE NEW AGENT" WIZARD ---
    if (action === "new") {
        const { data: merchant } = await supabaseAdmin.from("merchants").select("business_name").eq("platform_merchant_id", merchantId).single();
        const { data: businessProfile } = await supabaseAdmin
            .from("business_profiles")
            .select("*")
            .eq("merchant_id", merchantId)
            .single();

        return (
            <div className="flex-1 space-y-6 p-8 pt-6">
                <Button variant="ghost" asChild className="mb-4">
                    <Link href="/ai-agent">← Back to Agents</Link>
                </Button>
                <AgentSetupWizard merchantId={merchantId} />
            </div>
        );
    }

    // --- VIEW 2: EDIT AGENT (Studio) ---
    if (agentId) {
        const { data: agent } = await supabaseAdmin.from("ai_agents").select("*").eq("id", agentId).single();
        if (!agent) redirect("/ai-agent");

        return (
            <div className="flex-1 space-y-6 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Voice Agent Studio</h2>
                        <p className="text-muted-foreground">Editing: {agent.name}</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/ai-agent">Close Studio</Link>
                    </Button>
                </div>
                {/* Ensure AgentConfigForm is imported if you use it, or remove this block */}
                {/* <AgentConfigForm
                    agentId={agent.id}
                    initialData={agent}
                /> */}
            </div>
        );
    }

    // --- VIEW 3: MAIN DASHBOARD ---
    const agentsPromise = supabaseAdmin.from("ai_agents").select("*").eq("merchant_id", merchantId);
    const callLogsPromise = supabaseAdmin.from("call_logs").select("*").eq("merchant_id", merchantId).order("created_at", { ascending: false }).limit(50);

    const [{ data: agents }, { data: callLogs }] = await Promise.all([agentsPromise, callLogsPromise]);

    return (
        <AIAgentClientView
            initialAgents={agents || []}
            initialCallLogs={callLogs || []}
            merchantId={merchantId}
        />
    );
}