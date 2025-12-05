import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { businessName, agentName, gender } = await req.json();

        // 1. SELECT VOICE ID FROM ENV
        const VOICE_IDS = {
            female: process.env.ELEVENLABS_VOICE_ID_FEMALE!,
            male: process.env.ELEVENLABS_VOICE_ID_MALE!,
        };

        const selectedVoiceId = gender === 'male' ? VOICE_IDS.male : VOICE_IDS.female;

        // 2. DRAFT THE SCRIPT 
        // Uses the custom agent name instead of "Benny"
        const bName = businessName || "your business";
        const aName = agentName || "Alex";

        const textToSpeak = `Thanks for calling ${bName}. My name is ${aName}, how can I help you today?`;

        // 3. CALL ELEVENLABS
        const apiKey = process.env.ELEVENLABS_API_KEY;

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": apiKey!,
                },
                body: JSON.stringify({
                    text: textToSpeak,
                    model_id: "eleven_turbo_v2",
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                }),
            }
        );

        if (!response.ok) throw new Error("ElevenLabs API failed");

        const audioBuffer = await response.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString("base64");

        return NextResponse.json({ audio: `data:audio/mpeg;base64,${audioBase64}` });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
    }
}