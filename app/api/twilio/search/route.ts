import { NextResponse } from "next/server";
import { twilioClient } from "@/lib/twilio";

export async function POST(request: Request) {
    try {
        const { areaCode } = await request.json();

        if (!areaCode || areaCode.length < 3) {
            return NextResponse.json({ error: "Invalid area code" }, { status: 400 });
        }

        // Search for Local numbers in US
        const availableNumbers = await twilioClient.availablePhoneNumbers('US')
            .local
            .list({
                areaCode: parseInt(areaCode),
                limit: 6 // Show top 6 results
            });

        const numbers = availableNumbers.map(n => ({
            friendlyName: n.friendlyName,
            phoneNumber: n.phoneNumber
        }));

        return NextResponse.json({ numbers });

    } catch (error: any) {
        console.error("Twilio Search Error:", error);
        return NextResponse.json({ error: "Failed to fetch numbers" }, { status: 500 });
    }
}