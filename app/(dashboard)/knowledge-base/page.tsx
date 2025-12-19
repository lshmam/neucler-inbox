import { getKnowledgeBaseData } from "@/app/actions/knowledge-base";
import { KnowledgeBasePageClient } from "./client";

export default async function KnowledgeBasePage() {
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
