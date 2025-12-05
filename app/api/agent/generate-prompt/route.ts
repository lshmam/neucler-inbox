import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { businessName, industry, hours } = await request.json();

    // In production, use OpenAI API here.
    // For now, we use deterministic logic to save you API costs during dev.

    let prompt = "";

    if (industry === "salon") {
        prompt = `You are the AI receptionist for ${businessName}, a premium beauty salon. 
Your goal is to book appointments and answer FAQs.
Hours: ${hours}.
Tone: Friendly, stylish, and professional.
If a user asks for a service you don't know, apologize and offer to have a human call back.
Do not make up prices.`;
    } else if (industry === "auto") {
        prompt = `You are the service coordinator for ${businessName}, an auto repair shop.
Your goal is to schedule service appointments and provide status updates.
Hours: ${hours}.
Tone: Reliable, direct, and knowledgeable.
Ask for Year, Make, and Model before booking.`;
    } else {
        prompt = `You are the helpful AI assistant for ${businessName}.
Hours: ${hours}.
Your goal is to assist customers and capture leads.`;
    }

    return NextResponse.json({ prompt });
}