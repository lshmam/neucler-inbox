import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateContentFromText(text: string, prompt: string) {
    if (!text || text.length < 50) return null;

    try {
        // Use gemini-2.0-flash - stable and fast
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const fullPrompt = `${prompt}

You MUST respond with valid JSON only. No markdown, no explanations, just the JSON object.

TEXT:
${text.substring(0, 15000)}`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const content = response.text();

        // Clean up the response - remove markdown code blocks if present
        let cleanedContent = content.trim();
        if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.slice(7);
        }
        if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.slice(3);
        }
        if (cleanedContent.endsWith('```')) {
            cleanedContent = cleanedContent.slice(0, -3);
        }
        cleanedContent = cleanedContent.trim();

        console.log("✅ LLM Generation Success");
        return JSON.parse(cleanedContent);
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        return null;
    }
}
