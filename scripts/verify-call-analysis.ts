
import { analyzeCall } from "../services/call-analysis";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const sampleTranscript = [
    {
        "speaker": 0,
        "text": "Thank you for calling Downtown Dental Care, this is Sarah. How can I help you today?",
        "start": 0.5,
        "end": 4.2
    },
    {
        "speaker": 1,
        "text": "Hi Sarah, I was hoping to get an appointment. I think I chipped a molar while eating lunch and it's starting to throb.",
        "start": 4.5,
        "end": 10.1
    },
    {
        "speaker": 0,
        "text": "Oh my goodness, I am so sorry to hear that, that sounds painful. We definitely want to get that looked at right away. Are you a current patient with us?",
        "start": 10.5,
        "end": 16.0
    },
    {
        "speaker": 1,
        "text": "No, this would be my first time. I actually found you guys on Google Maps.",
        "start": 16.2,
        "end": 19.5
    },
    {
        "speaker": 0,
        "text": "Okay, well welcome to the practice, even though I wish it were under better circumstances. Before we check the schedule, do you intend to use any dental insurance today?",
        "start": 19.8,
        "end": 26.0
    },
    {
        "speaker": 1,
        "text": "Yeah, I have Delta Dental PPO. I think I have my member ID here if you need it.",
        "start": 26.2,
        "end": 30.1
    },
    {
        "speaker": 0,
        "text": "We are in-network with Delta. For now, let's just get you booked. Since you are in pain, I can squeeze you in for an emergency exam tomorrow at 9:30 AM with Dr. Lee. Does that work?",
        "start": 30.5,
        "end": 39.0
    },
    {
        "speaker": 1,
        "text": "Tomorrow at 9:30 works great. Will I need to pay anything upfront?",
        "start": 39.2,
        "end": 42.5
    },
    {
        "speaker": 0,
        "text": "Good question. With Delta, usually it's just your co-pay, but we will run a verification check before you arrive to be sure. I'm going to text you a link to our new patient forms right now. Please fill those out tonight so we can verify your benefits.",
        "start": 42.8,
        "end": 52.0
    },
    {
        "speaker": 1,
        "text": "Okay, I'll watch for the text.",
        "start": 52.2,
        "end": 53.5
    },
    {
        "speaker": 0,
        "text": "Perfect. See you tomorrow at 9:30, and try to avoid chewing on that side until then!",
        "start": 53.8,
        "end": 57.0
    }
];

async function runTest() {
    console.log("Running Call Analysis Verification...");
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY is missing in .env.local");
        return;
    }

    try {
        const result = await analyzeCall(sampleTranscript);
        console.log("\n✅ Analysis Result:");
        console.log(JSON.stringify(result, null, 2));

        if (result.confidence === 'low' && result.summary.includes("Failed")) {
            console.log("\n⚠️ Note: The analysis returned a failure response. Check the summary for error details.");
        }
    } catch (error: any) {
        console.error("\n❌ Test Failed:", error.message);
    }
}

runTest();
