const RETELL_API_KEY = process.env.RETELL_API_KEY;
const BASE_URL = "https://api.retellai.com";

if (!RETELL_API_KEY) {
    console.error("❌ RETELL_API_KEY is missing from .env");
}

const headers = {
    "Authorization": `Bearer ${RETELL_API_KEY}`,
    "Content-Type": "application/json",
};

// --- 1. PROVISIONING & CONFIG (New Stuff) ---

// Create/Update the "Brain" (System Prompt)
export async function upsertRetellLLM(existingLlmId: string | null, systemPrompt: string) {
    const payload = {
        model: "gpt-4o", // Production standard
        general_prompt: systemPrompt,
    };

    if (existingLlmId) {
        const res = await fetch(`${BASE_URL}/update-retell-llm/${existingLlmId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Failed to update LLM: ${await res.text()}`);
        return await res.json();
    } else {
        const res = await fetch(`${BASE_URL}/create-retell-llm`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Failed to create LLM: ${await res.text()}`);
        return await res.json();
    }
}

// Create/Update the Agent (Voice + Link to Brain)
export async function upsertRetellAgent(
    existingAgentId: string | null,
    llmId: string,
    voiceId: string,
    agentName: string,
    openingGreeting: string
) {
    const payload = {
        agent_name: agentName,
        voice_id: voiceId,
        retell_llm_id: llmId, // Connects the Brain
        response_engine: { llm_id: llmId, type: "retell-llm" },
        fallback_voice_ids: ["openai-alloy"],
        // Some versions of Retell allow setting greeting here or in LLM
        // We update name/voice/LLM primarily
    };

    if (existingAgentId) {
        const res = await fetch(`${BASE_URL}/update-agent/${existingAgentId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Failed to update Agent: ${await res.text()}`);
        return await res.json();
    } else {
        const res = await fetch(`${BASE_URL}/create-agent`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Failed to create Agent: ${await res.text()}`);
        return await res.json();
    }
}

// Purchase real phone numbers
export async function buyPhoneNumber(areaCode: number, agentId: string) {
    const res = await fetch(`${BASE_URL}/create-phone-number`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            area_code: areaCode,
            agent_id: agentId
        })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error_message || "Failed to buy number");
    }
    return await res.json();
}


// --- 2. DATA FETCHING (Your Existing Logic - Kept & Improved) ---

export async function getRetellCallLogs(limit = 20) {
    if (!RETELL_API_KEY) return []; // Return empty if no key

    try {
        const res = await fetch(`${BASE_URL}/v2/list-calls`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                limit: limit,
                sort_order: "descending"
            }),
            next: { revalidate: 60 }
        });

        if (!res.ok) return [];
        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Error fetching logs:", error);
        return [];
    }
}

export async function getVoices() {
    if (!RETELL_API_KEY) return [];

    try {
        const res = await fetch(`${BASE_URL}/list-voices`, {
            method: "GET",
            headers,
            next: { revalidate: 86400 }
        });

        if (!res.ok) throw new Error("Failed to fetch voices");
        return await res.json();
    } catch (error) {
        return [];
    }
}

export async function getRetellPhoneNumbers() {
    if (!RETELL_API_KEY) return [];

    try {
        const res = await fetch(`${BASE_URL}/list-phone-numbers`, {
            method: "GET",
            headers,
            cache: "no-store"
        });
        return await res.json();
    } catch (e) {
        return [];
    }
}

// Make an outbound call (Testing tool)
export async function makeOutboundCall(to: string, agentId: string) {
    if (!RETELL_API_KEY) throw new Error("No API Key");

    // 1. Find a number to call FROM
    const numbers = await getRetellPhoneNumbers();
    if (!numbers || numbers.length === 0) {
        throw new Error("No Phone Numbers found. Buy one in the AI Agent Studio.");
    }
    const fromNumber = numbers[0].phone_number;

    // 2. Make the call
    const res = await fetch(`${BASE_URL}/v2/create-phone-call`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            from_number: fromNumber,
            to_number: to,
            agent_id: agentId,
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
    }

    return await res.json();
}
