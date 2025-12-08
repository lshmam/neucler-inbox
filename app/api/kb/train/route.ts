import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { merchantId, customerQuestion, merchantAnswer } = await request.json();

        if (!merchantId || !customerQuestion || !merchantAnswer) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        console.log("📚 [Train AI] Creating KB article from Q&A...");

        // Use Gemini to clean and format the Q&A into a proper KB article
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `You are a knowledge base editor. Convert this customer service Q&A into a clean knowledge base article.

CUSTOMER QUESTION:
"${customerQuestion}"

BUSINESS REPLY:
"${merchantAnswer}"

INSTRUCTIONS:
1. Create a clear, concise title for the question (remove any customer names or personal details)
2. Clean the answer: remove greetings (Hi Dave, Hello, etc.), sign-offs, and make it informational
3. Suggest a category tag from: FAQ, Pricing, Hours, Services, Policies, Booking, Other
4. Keep the answer brief but complete

Respond in this exact JSON format only, no markdown:
{
    "title": "Clean question title",
    "content": "Clean, informative answer without greetings",
    "category": "Category tag"
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON from response
        let articleData;
        try {
            // Clean potential markdown code blocks
            const cleanJson = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            articleData = JSON.parse(cleanJson);
        } catch {
            console.error("Failed to parse AI response:", responseText);
            // Fallback: use raw inputs
            articleData = {
                title: customerQuestion.substring(0, 100),
                content: merchantAnswer,
                category: "FAQ"
            };
        }

        // Save to knowledge base
        const { data: article, error } = await supabaseAdmin
            .from('knowledge_base_articles')
            .insert({
                merchant_id: merchantId,
                title: articleData.title,
                content: articleData.content,
                category: articleData.category,
                is_published: true
            })
            .select()
            .single();

        if (error) {
            console.error("❌ Failed to save KB article:", error);
            throw error;
        }

        console.log(`✅ [Train AI] KB article created: "${articleData.title}"`);

        return NextResponse.json({
            success: true,
            article: {
                id: article.id,
                title: articleData.title,
                category: articleData.category
            }
        });

    } catch (error: any) {
        console.error("❌ [Train AI] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
