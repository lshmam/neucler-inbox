/**
 * Call Analysis Service
 * 
 * Uses Gemini AI to analyze call transcripts and extract:
 * - Call Rating (1-10)
 * - Summary
 * - Next Actions
 * - Customer Info
 * - Tags
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedCustomerInfo } from './customer-info-extractor';




export interface PipelineInfo {
    status: 'new_inquiry' | 'quote_sent' | 'follow_up' | 'booked' | 'lost';
    title: string;
    dealValue: number;
    priority: 'high' | 'medium' | 'low';
    confidence: number; // 0-100
}

export interface CallAnalysisResult {
    rating: number;
    summary: string;
    nextActions: string[];
    tags: string[];
    customerInfo: ExtractedCustomerInfo;
    pipeline: PipelineInfo;
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Analyze a call transcript using AI
 * @param transcript - Either a string transcript or Retell/Deepgram-style transcript object array
 * @returns Comprehensive analysis result
 */
export async function analyzeCall(
    transcript: string | any[]
): Promise<CallAnalysisResult> {
    // Convert transcript array to text if needed
    let transcriptText: string;

    if (Array.isArray(transcript)) {
        transcriptText = transcript.map(entry => {
            if (entry.content) {
                return `${entry.role || 'unknown'}: ${entry.content}`;
            } else if (entry.words) {
                return `${entry.speaker || 'unknown'}: ${entry.words}`;
            } else if (entry.text) {
                return `${entry.speaker !== undefined ? `Speaker ${entry.speaker}` : 'unknown'}: ${entry.text}`;
            }
            return JSON.stringify(entry);
        }).join('\n');
    } else {
        transcriptText = transcript;
    }

    // If transcript is too short, return basic/empty result
    if (!transcriptText || transcriptText.length < 20) {
        console.log('[CallAnalysis] Transcript too short, skipping analysis');
        return {
            rating: 0,
            summary: "Call too short to analyze.",
            nextActions: [],
            tags: [],
            customerInfo: { confidence: 'low' },
            pipeline: { status: 'new_inquiry', title: 'Unknown Call', dealValue: 0, priority: 'medium', confidence: 0 },
            confidence: 'low'
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are an expert call analyst for an auto repair shop. Analyze the following phone call transcript.

TRANSCRIPT:
"""
${transcriptText}
"""

Perform the following tasks:
1.  **Rate the Call (1-10):** How successful was the call from a business perspective? (10 = Booked appointment/Sale, 1 = Angry customer/Lost lead).
2.  **Summarize:** Write a concise 1-2 sentence summary of the call.
3.  **Next Actions:** List specific next steps (e.g., "Send intake form", "Follow up on Tuesday").
4.  **Extract Customer Info:** Identify name, vehicle details, and service needs.
5.  **Tagging:** Suggest tags for the customer profile (e.g., "New Customer", "Urgent", "Brakes", "Price Shopper").
6.  **Pipeline Analysis:** Determine the Deal Status, Title, Estimated Value, and Priority.

Respond ONLY with valid JSON in the following format:

{
  "rating": 8,
  "summary": "Customer called about brake noise...",
  "nextActions": ["Send quote", "Call back tomorrow"],
  "tags": ["New Customer", "Brakes"],
  "customerInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "vehicleYear": "2020",
    "vehicleMake": "Toyota",
    "vehicleModel": "Camry",
    "serviceRequested": "Brake check",
    "confidence": "high"
  },
  "pipeline": {
    "status": "booked", // Options: new_inquiry, quote_sent, follow_up, booked, lost
    "title": "Brake Job - 2020 Toyota Camry",
    "dealValue": 450, // Estimate value based on service (Brakes ~$400, Oil ~$50, Engine ~$2000). Default 0 if unknown.
    "priority": "high", // high, medium, low
    "confidence": 90
  }
}

Guidelines:
- **Rating:** Be objective. If an appointment was booked, rate high (8-10).
- **Pipeline Status:**
  - "booked": Appointment scheduled.
  - "quote_sent": Discussed price/quote.
  - "new_inquiry": Just asking questions.
  - "lost": Customer hung up or said no.
- **Deal Title:** Format as "{Service} - {Vehicle}".
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Clean up the response - remove markdown code blocks
        let jsonText = responseText;
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
        }

        const analysis = JSON.parse(jsonText);

        console.log('[CallAnalysis] Analysis complete:', JSON.stringify(analysis, null, 2));

        return {
            rating: analysis.rating || 0,
            summary: analysis.summary || "",
            nextActions: analysis.nextActions || [],
            tags: analysis.tags || [],
            customerInfo: {
                firstName: cleanString(analysis.customerInfo?.firstName),
                lastName: cleanString(analysis.customerInfo?.lastName),
                vehicleYear: cleanVehicleYear(analysis.customerInfo?.vehicleYear),
                vehicleMake: cleanString(analysis.customerInfo?.vehicleMake),
                vehicleModel: cleanString(analysis.customerInfo?.vehicleModel),
                serviceRequested: cleanString(analysis.customerInfo?.serviceRequested)?.substring(0, 100),
                confidence: analysis.customerInfo?.confidence || 'medium'
            },
            pipeline: {
                status: analysis.pipeline?.status || 'new_inquiry',
                title: analysis.pipeline?.title || 'New Call Deal',
                dealValue: analysis.pipeline?.dealValue || 0,
                priority: analysis.pipeline?.priority || 'medium',
                confidence: analysis.pipeline?.confidence || 0
            },
            confidence: 'high'
        };

    } catch (error: any) {
        console.error('[CallAnalysis] Analysis failed:', error.message);
        return {
            rating: 0,
            summary: "Failed to analyze call. Error: " + error.message,
            nextActions: [],
            tags: [],
            customerInfo: { confidence: 'low' },
            pipeline: { status: 'new_inquiry', title: 'Analysis Failed', dealValue: 0, priority: 'low', confidence: 0 },
            confidence: 'low'
        };
    }
}

function cleanString(value: string | undefined): string | undefined {
    if (!value || value.trim() === '' || value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined') {
        return undefined;
    }
    return value.trim();
}

function cleanVehicleYear(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const match = value.match(/\b(19|20)\d{2}\b/);
    if (match) {
        const year = parseInt(match[0]);
        if (year >= 1980 && year <= 2030) return match[0];
    }
    return undefined;
}

