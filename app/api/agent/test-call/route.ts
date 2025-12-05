import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { upsertRetellLLM, upsertRetellAgent } from "@/lib/retell";

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;
    if (!merchantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { voiceId, agentName, systemPrompt, openingGreeting } = await request.json();

        // 1. Create/Update the "Brain" (LLM) instantly
        // We pass null for ID so it creates a fresh one, or you can track a "preview_llm_id" in DB to reuse.
        // For simplicity/speed in this demo, we create a new ephemeral one.
        const retellLlm = await upsertRetellLLM(null, systemPrompt);

        // 2. Create/Update the Agent
        const retellAgent = await upsertRetellAgent(
            null, // null = create new temporary agent
            retellLlm.llm_id,
            voiceId,
            `Preview: ${agentName}`,
            openingGreeting
        );

        // 3. Generate Web Call Token
        const res = await fetch("https://api.retellai.com/v2/create-web-call", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.RETELL_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                agent_id: retellAgent.agent_id,
            })
        });

        if (!res.ok) throw new Error("Failed to start web call");
        const data = await res.json();

        return NextResponse.json({ accessToken: data.access_token });

    } catch (error: any) {
        console.error("Test Call Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}