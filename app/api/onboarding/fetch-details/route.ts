import { NextResponse } from "next/server";
import * as cheerio from 'cheerio';
import { generateContentFromText } from "@/lib/openai";

export async function POST(request: Request) {
    try {
        const { placeId, websiteUrl } = await request.json();

        // FIX: Use the same key name as your .env.local
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (!placeId) {
            return NextResponse.json({ error: "Google Place ID is required" }, { status: 400 });
        }

        // --- 1. FETCH FROM GOOGLE PLACES API ---
        const fields = "name,formatted_address,website,formatted_phone_number,opening_hours,rating,user_ratings_total";
        const placesUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

        const placesRes = await fetch(placesUrl);
        const placesData = await placesRes.json();

        if (placesData.status !== "OK") {
            console.error("Google Places Error:", placesData);
            return NextResponse.json({ error: "Failed to fetch details from Google." }, { status: 500 });
        }

        const place = placesData.result;

        // --- 2. PREPARE THE PROFILE DATA ---
        let profileData = {
            business_name: place.name || "",
            address: place.formatted_address || "",
            phone: place.formatted_phone_number || "",
            website: place.website || websiteUrl || "",
            business_hours: place.opening_hours?.weekday_text || [],
            google_rating: place.rating || 0,
            google_ratings_total: place.user_ratings_total || 0,
            services: [] as string[],
            generated_articles: [] as { title: string; content: string; category: string }[],
        };


        // --- 3. INTELLIGENT WEBSITE SCRAPING & ARTICLE GENERATION ---
        if (profileData.website) {
            try {
                console.log(`Scraping website: ${profileData.website}`);
                // Use a controller to abort if it takes too long
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                const webRes = await fetch(profileData.website, {
                    // Add a User-Agent so websites don't block the scraper immediately
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (webRes.ok) {
                    const html = await webRes.text();
                    const $ = cheerio.load(html);

                    // Remove noise
                    $('script, style, nav, footer, iframe, noscript, svg').remove();

                    // Extract substantial text content
                    // We look for paragraphs, headings, and list items
                    let textContent = "";
                    $('p, h1, h2, h3, h4, h5, h6, li, article, section').each((_, el) => {
                        const text = $(el).text().trim();
                        if (text.length > 20) {
                            textContent += text + "\n";
                        }
                    });

                    // If we got enough text, send to LLM
                    if (textContent.length > 100) {
                        const prompt = `
                            Analyze the following website content for a local business.
                            Extract two things:
                            1. "services": A list of specific services they offer (max 10 strings).
                            2. "articles": A list of 5-8 Q&A knowledge base articles (max 8).
                            
                            Format the "articles" as objects with:
                            - title: A question a customer might ask (e.g., "Do you offer same-day repairs?", "What are your prices?").
                            - content: The answer based strictly on the text.
                            - category: One of "Services", "Pricing", "Policies", "General".

                            Return JSON format: { "services": [...], "articles": [...] }
                        `;

                        const generatedData = await generateContentFromText(textContent, prompt);

                        if (generatedData) {
                            console.log("LLM Generation Success:", generatedData);
                            if (generatedData.services && Array.isArray(generatedData.services)) {
                                profileData.services = generatedData.services;
                            }
                            if (generatedData.articles && Array.isArray(generatedData.articles)) {
                                profileData.generated_articles = generatedData.articles;
                            }
                        }
                    } else {
                        console.log("Scraping: Not enough text content found.");
                    }
                }
            } catch (scrapeError) {
                console.warn(`Scraping/Generation failed for ${profileData.website}:`, scrapeError);
                // We ignore scraping errors so the rest of the data still loads
            }
        }

        return NextResponse.json(profileData);

    } catch (error: any) {
        console.error("Fetch Details Error:", error);
        return NextResponse.json({ error: "An internal error occurred." }, { status: 500 });
    }
}