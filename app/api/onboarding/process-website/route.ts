import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { websiteUrl, businessName } = await request.json();

        if (!websiteUrl) {
            return NextResponse.json({
                systemPrompt: `You are a helpful AI receptionist for ${businessName}. Your goal is to assist callers with their inquiries, schedule appointments, and provide information about the business.`
            });
        }

        // 1. Scrape the website
        let textContent = "";
        try {
            // Add protocol if missing
            const url = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                },
                signal: controller.signal,
                next: { revalidate: 0 } // Disable cache to avoid stuck errors
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error("Failed to fetch website");

            const html = await response.text();
            const $ = cheerio.load(html);

            // Remove scripts, styles, and nav/footer to reduce noise
            $("script").remove();
            $("style").remove();
            $("nav").remove();
            $("footer").remove();
            $("header").remove();

            // Extract text
            const bodyText = $("body").text().replace(/\s+/g, " ").trim();

            // Extract Meta Data (Fallback for SPAs)
            const metaDescription = $('meta[name="description"]').attr("content") || "";
            const ogDescription = $('meta[property="og:description"]').attr("content") || "";
            const title = $('title').text() || "";

            // Combine sources
            textContent = `
                Page Title: ${title}
                Meta Description: ${metaDescription}
                OpenGraph Description: ${ogDescription}
                
                Main Content:
                ${bodyText.slice(0, 15000)}
            `.trim();

            if (textContent.length < 50) {
                throw new Error("Insufficient content found");
            }

        } catch (error) {
            console.error("Scraping error:", error);
            // Fallback if scraping fails
            return NextResponse.json({
                systemPrompt: `You are a helpful AI receptionist for ${businessName}. I was unable to access your website automatically, so please provide me with details about your services and hours.`
            });
        }

        // 2. Generate System Prompt with OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an expert AI agent configurator. Your job is to extract key business details from website text and create a concise, human-readable system prompt for a voice AI receptionist."
                },
                {
                    role: "user",
                    content: `
            Business Name: ${businessName}
            Website Content: "${textContent}"

            Please create a system prompt for this business's AI receptionist. 
            Structure it clearly with these sections:
            1. Role & Tone (Friendly, professional, etc.)
            2. Services Offered (Bulleted list)
            3. Hours of Operation (If found, otherwise say "Standard Business Hours")
            4. Key Information (Pricing, location notes, etc.)

            Write it as instructions for the AI (e.g., "You are the receptionist for...").
            Keep it under 300 words.
          `
                }
            ],
        });

        const generatedPrompt = completion.choices[0].message.content;

        return NextResponse.json({ systemPrompt: generatedPrompt });

    } catch (error) {
        console.error("Processing error:", error);
        return NextResponse.json({
            systemPrompt: `You are a helpful AI receptionist for the business. Please configure your settings manually.`
        });
    }
}
