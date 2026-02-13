import { headers } from "next/headers";
import { getKnowledgeBaseData } from "@/app/actions/knowledge-base";
import { KnowledgeBasePageClient } from "./client";
import { getDemoKBData } from "@/lib/demo-server-helpers";
import { Industry } from "@/lib/demo-data";

export default async function KnowledgeBasePage() {
    const headersList = await headers();
    const isDemo = headersList.get("x-demo-mode") === "true";
    const demoIndustry = (headersList.get("x-demo-industry") || "auto") as Industry;

    if (isDemo) {
        const demoData = getDemoKBData(demoIndustry);
        return (
            <div className="h-full p-6">
                <KnowledgeBasePageClient
                    articles={demoData.articles}
                    aiName={demoData.ai_name}
                    aiTone={demoData.ai_tone}
                />
            </div>
        );
    }

    const kbData = await getKnowledgeBaseData();

    return (
        <div className="h-full p-6">
            <KnowledgeBasePageClient
                articles={kbData.articles}
                aiName={kbData.ai_name}
                aiTone={kbData.ai_tone}
            />
        </div>
    );
}
