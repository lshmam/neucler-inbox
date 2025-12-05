import { NextResponse } from "next/server";
import * as cheerio from 'cheerio';

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
        };


        // --- 3. (OPTIONAL) WEBSITE SCRAPING ---
        if (profileData.website) {
            try {
                const webRes = await fetch(profileData.website, {
                    // Add a User-Agent so websites don't block the scraper immediately
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
                });

                if (webRes.ok) {
                    const html = await webRes.text();
                    const $ = cheerio.load(html);

                    // Try to find links that contain "service" or "menu"
                    const serviceLinks = $('a[href*="service"], a[href*="menu"], a[href*="treatment"]');
                    const services: string[] = [];

                    serviceLinks.each((i, el) => {
                        const text = $(el).text().trim();
                        // Filter out garbage text
                        if (text && text.length > 3 && text.length < 40) {
                            services.push(text);
                        }
                    });

                    // Fallback: If no links found, look for headings
                    if (services.length === 0) {
                        $('h2:contains("Services"), h2:contains("Menu"), h3:contains("Services")').next('ul').find('li').each((i, el) => {
                            const text = $(el).text().trim();
                            if (text && text.length < 50) services.push(text);
                        });
                    }

                    profileData.services = [...new Set(services)].slice(0, 10); // Limit to 10 unique services
                }
            } catch (scrapeError) {
                console.warn(`Scraping failed for ${profileData.website}:`, scrapeError);
                // We ignore scraping errors so the rest of the data still loads
            }
        }

        return NextResponse.json(profileData);

    } catch (error: any) {
        console.error("Fetch Details Error:", error);
        return NextResponse.json({ error: "An internal error occurred." }, { status: 500 });
    }
}