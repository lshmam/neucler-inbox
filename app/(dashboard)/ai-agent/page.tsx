import { getMerchantId } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { AIAgentClientView } from "./client-view";
import { AgentSetupWizard } from "./setup-wizard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getKnowledgeBaseData } from "@/app/actions/knowledge-base";

// --- Type for Next.js 15 ---
interface AIAgentPageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function AIAgentPage({ searchParams }: AIAgentPageProps) {
    const merchantId = await getMerchantId();

    // --- Await the searchParams (Next.js 15 Requirement) ---
    const resolvedParams = await searchParams;
    const action = resolvedParams?.action;
    const agentId = resolvedParams?.id;

    // --- VIEW 1: "CREATE NEW AGENT" WIZARD ---
    if (action === "new") {
        return (
            <div className="flex-1 space-y-6 p-8 pt-6">
                <Button variant="ghost" asChild className="mb-4">
                    <Link href="/ai-agent">← Back to Agent</Link>
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
            </div>
        );
    }

    // --- VIEW 3: MAIN DASHBOARD ---
    const [
        { data: agents },
        { data: callLogs },
        { data: smartLinks },
        knowledgeBase
    ] = await Promise.all([
        supabaseAdmin.from("ai_agents").select("*").eq("merchant_id", merchantId),
        supabaseAdmin.from("call_logs").select("*").eq("merchant_id", merchantId).order("created_at", { ascending: false }).limit(50),
        supabaseAdmin.from("smart_links").select("id").eq("merchant_id", merchantId),
        getKnowledgeBaseData()
    ]);

    // Count spam calls (status contains 'spam' or 'blocked')
    const spamCallsCount = (callLogs || []).filter((c: any) =>
        c.status?.toLowerCase().includes('spam') ||
        c.status?.toLowerCase().includes('blocked') ||
        c.status?.toLowerCase().includes('filtered')
    ).length;

    return (
        <AIAgentClientView
            initialAgents={agents || []}
            initialCallLogs={callLogs || []}
            merchantId={merchantId}
            knowledgeBase={knowledgeBase}
            spamCallsCount={spamCallsCount}
            bookingLinksCount={smartLinks?.length || 0}
        />
    );
}