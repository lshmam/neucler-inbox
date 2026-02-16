import { NextResponse } from "next/server";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const to = formData.get("To") as string;

        console.log("[Twilio Voice] Incoming call request to:", to);

        const response = new VoiceResponse();
        const callerId = process.env.TWILIO_PHONE_NUMBER;

        if (to) {
            // If the browser SDK sent a number to dial (in params)
            // Example: device.connect({ params: { To: '+1555...' } })

            const dial = response.dial({
                callerId: callerId,
                answerOnBridge: true
            });

            // Check if 'To' is a valid number or a client name
            // For this use case, we expect a real phone number (Retell Agent)
            if (/^[\d+\-\(\) ]+$/.test(to)) {
                dial.number(to);
            } else {
                dial.client(to);
            }

        } else {
            // Fallback if no number provided
            response.say("Welcome to Neucler. No destination number was provided.");
        }

        return new NextResponse(response.toString(), {
            headers: {
                "Content-Type": "text/xml",
            },
        });

    } catch (error: any) {
        console.error("Error generating TwiML:", error);
        const response = new VoiceResponse();
        response.say("An application error occurred.");
        return new NextResponse(response.toString(), {
            headers: { "Content-Type": "text/xml" },
        });
    }
}
