/**
 * =============================================================================
 * MOCK DATA HOOK FOR CALL ANALYTICS
 * =============================================================================
 * 
 * All variables, functions, and strings are prefixed with MOCK_ for easy
 * identification and replacement with real API calls later.
 * 
 * Data Sources (to be integrated):
 * - Deepgram: Transcription (text + timestamps)
 * - Hume AI: Emotional prosody (audio scores + timestamps)
 * =============================================================================
 */

// ============= TYPES =============
export interface MOCK_TranscriptItem {
    speaker: 'Agent' | 'Customer';
    text: string;
    start: number; // seconds
    end: number;   // seconds
    emotion: string;
    score: number; // 0-1
}

export interface MOCK_ScorecardItem {
    id: string;
    label: string;
    status: 'pass' | 'fail';
    category: 'Compliance' | 'Empathy' | 'Closing';
}

export interface MOCK_SentimentPoint {
    timestamp: number; // seconds
    customerFrustration: number; // 0-100
    agentCalmness: number; // 0-100
}

export interface MOCK_CallMetadataType {
    agentName: string;
    customerName: string;
    customerPhone: string;
    callDate: string;
    callDuration: number; // seconds
    callDirection: 'inbound' | 'outbound';
}

export interface MOCK_CallDataType {
    MOCK_OverallScore: number;
    MOCK_CallMetadata: MOCK_CallMetadataType;
    MOCK_Transcript: MOCK_TranscriptItem[];
    MOCK_Scorecard: MOCK_ScorecardItem[];
    MOCK_SentimentTimeline: MOCK_SentimentPoint[];
}

// ============= MOCK TRANSCRIPT =============
// Simulates an angry customer calling about a car repair issue
export const MOCK_Transcript: MOCK_TranscriptItem[] = [
    {
        speaker: 'Agent',
        text: "Thank you for calling QuickFix Auto Shop, this is Sarah speaking. How can I help you today?",
        start: 0,
        end: 5,
        emotion: 'Calmness',
        score: 0.85
    },
    {
        speaker: 'Customer',
        text: "Yeah, I brought my car in last week for a brake job and now it's making this horrible grinding noise!",
        start: 6,
        end: 13,
        emotion: 'Anger',
        score: 0.72
    },
    {
        speaker: 'Agent',
        text: "I'm so sorry to hear that. That must be really frustrating. Can I get your name and the vehicle information so I can pull up your service record?",
        start: 14,
        end: 22,
        emotion: 'Empathy',
        score: 0.78
    },
    {
        speaker: 'Customer',
        text: "It's Mike Johnson, 2019 Honda Accord. I paid $450 for those brakes and this is ridiculous!",
        start: 23,
        end: 30,
        emotion: 'Frustration',
        score: 0.81
    },
    {
        speaker: 'Agent',
        text: "I completely understand, Mr. Johnson. Let me look at your file... I can see the service from last Tuesday. I want to make this right for you.",
        start: 31,
        end: 40,
        emotion: 'Calmness',
        score: 0.82
    },
    {
        speaker: 'Customer',
        text: "I hope so because I'm considering going somewhere else. This is unacceptable.",
        start: 41,
        end: 47,
        emotion: 'Anxiety',
        score: 0.65
    },
    {
        speaker: 'Agent',
        text: "I totally get it. Here's what I'd like to do - I can get you in today for a priority inspection at no charge. Our master technician Tony will personally look at it.",
        start: 48,
        end: 59,
        emotion: 'Confidence',
        score: 0.88
    },
    {
        speaker: 'Customer',
        text: "Today? What time?",
        start: 60,
        end: 62,
        emotion: 'Interest',
        score: 0.55
    },
    {
        speaker: 'Agent',
        text: "I have a 2 PM slot available. We'll also provide you with a loaner car while we work on it. Does that work for you?",
        start: 63,
        end: 72,
        emotion: 'Calmness',
        score: 0.90
    },
    {
        speaker: 'Customer',
        text: "Okay, that sounds fair. I'll be there at 2.",
        start: 73,
        end: 77,
        emotion: 'Contentment',
        score: 0.60
    },
    {
        speaker: 'Agent',
        text: "Perfect, Mr. Johnson. I've booked you for 2 PM today. Just a heads up - if any additional parts are needed, we'll cover the labor under our warranty. Is there anything else I can help with?",
        start: 78,
        end: 90,
        emotion: 'Professionalism',
        score: 0.92
    },
    {
        speaker: 'Customer',
        text: "No, that's it. Thanks for getting me in so quickly.",
        start: 91,
        end: 95,
        emotion: 'Gratitude',
        score: 0.70
    },
    {
        speaker: 'Agent',
        text: "You're very welcome! We'll see you at 2. Drive safely and thank you for choosing QuickFix Auto.",
        start: 96,
        end: 103,
        emotion: 'Warmth',
        score: 0.88
    }
];

// ============= MOCK SCORECARD =============
export const MOCK_Scorecard: MOCK_ScorecardItem[] = [
    // Compliance
    { id: 'c1', label: 'Greeting Standard', status: 'pass', category: 'Compliance' },
    { id: 'c2', label: 'Customer Verification', status: 'pass', category: 'Compliance' },
    { id: 'c3', label: 'Liability Disclaimer', status: 'fail', category: 'Compliance' },
    { id: 'c4', label: 'Service Record Reference', status: 'pass', category: 'Compliance' },

    // Empathy
    { id: 'e1', label: 'Acknowledged Frustration', status: 'pass', category: 'Empathy' },
    { id: 'e2', label: 'Used Customer Name', status: 'pass', category: 'Empathy' },
    { id: 'e3', label: 'Offered Apology', status: 'pass', category: 'Empathy' },
    { id: 'e4', label: 'Active Listening Cues', status: 'pass', category: 'Empathy' },

    // Closing
    { id: 'cl1', label: 'Appointment Booked', status: 'pass', category: 'Closing' },
    { id: 'cl2', label: 'Recap Provided', status: 'pass', category: 'Closing' },
    { id: 'cl3', label: 'Asked for Additional Help', status: 'pass', category: 'Closing' },
    { id: 'cl4', label: 'Professional Sign-off', status: 'pass', category: 'Closing' },
];

// ============= MOCK SENTIMENT TIMELINE =============
// Simulates the emotional arc of the conversation
export const MOCK_SentimentTimeline: MOCK_SentimentPoint[] = [
    { timestamp: 0, customerFrustration: 20, agentCalmness: 85 },
    { timestamp: 10, customerFrustration: 75, agentCalmness: 80 },
    { timestamp: 20, customerFrustration: 70, agentCalmness: 82 },
    { timestamp: 30, customerFrustration: 80, agentCalmness: 78 },
    { timestamp: 40, customerFrustration: 65, agentCalmness: 85 },
    { timestamp: 50, customerFrustration: 55, agentCalmness: 88 },
    { timestamp: 60, customerFrustration: 40, agentCalmness: 90 },
    { timestamp: 70, customerFrustration: 30, agentCalmness: 92 },
    { timestamp: 80, customerFrustration: 25, agentCalmness: 90 },
    { timestamp: 90, customerFrustration: 20, agentCalmness: 88 },
    { timestamp: 103, customerFrustration: 15, agentCalmness: 88 },
];

// ============= MOCK CALL METADATA =============
export const MOCK_CallMetadata: MOCK_CallMetadataType = {
    agentName: 'Sarah Miller',
    customerName: 'Mike Johnson',
    customerPhone: '+1 (555) 123-4567',
    callDate: '2024-12-24T14:32:00Z',
    callDuration: 103, // seconds
    callDirection: 'inbound'
};

// ============= MOCK OVERALL SCORE =============
// Calculated based on scorecard pass rate and sentiment handling
export const MOCK_OverallScore = 87;

// ============= HOOK: useMockCallData =============
export function useMockCallData(): MOCK_CallDataType {
    // In the future, replace this with real API calls:
    // - const transcript = await fetchDeepgramTranscript(callId)
    // - const emotions = await fetchHumeAnalysis(callId)
    // - const scorecard = await fetchScorecardResults(callId)

    return {
        MOCK_OverallScore,
        MOCK_CallMetadata,
        MOCK_Transcript,
        MOCK_Scorecard,
        MOCK_SentimentTimeline,
    };
}

// ============= HELPER: Get Emotion Color =============
export function MOCK_getEmotionColor(emotion: string, score: number): 'red' | 'green' | 'gray' {
    const negativeEmotions = ['Anger', 'Frustration', 'Anxiety', 'Fear', 'Disgust'];
    const positiveEmotions = ['Calmness', 'Joy', 'Contentment', 'Gratitude', 'Warmth', 'Empathy', 'Confidence', 'Professionalism'];

    if (negativeEmotions.includes(emotion) && score > 0.5) return 'red';
    if (positiveEmotions.includes(emotion) && score > 0.5) return 'green';
    return 'gray';
}

// ============= HELPER: Format Duration =============
export function MOCK_formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
