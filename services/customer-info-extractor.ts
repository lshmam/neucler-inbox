/**
 * Customer Info Extraction Service
 * 
 * Uses Gemini AI to extract structured customer information from call transcripts.
 * Extracts: customer name, vehicle info, and service requested.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ExtractedCustomerInfo {
    firstName?: string;
    lastName?: string;
    vehicleYear?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    serviceRequested?: string;
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Extract customer information from a call transcript using AI
 * @param transcript - Either a string transcript or Retell-style transcript object array
 * @returns Extracted customer information
 */
export async function extractCustomerInfo(
    transcript: string | any[]
): Promise<ExtractedCustomerInfo> {
    // Convert transcript array to text if needed
    let transcriptText: string;

    if (Array.isArray(transcript)) {
        // Retell-style transcript: array of { role, content } or { speaker, words }
        transcriptText = transcript.map(entry => {
            if (entry.content) {
                return `${entry.role || 'unknown'}: ${entry.content}`;
            } else if (entry.words) {
                return `${entry.speaker || 'unknown'}: ${entry.words}`;
            }
            return JSON.stringify(entry);
        }).join('\n');
    } else {
        transcriptText = transcript;
    }

    // If transcript is too short, return empty
    if (!transcriptText || transcriptText.length < 20) {
        console.log('[CustomerExtractor] Transcript too short, skipping extraction');
        return { confidence: 'low' };
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are analyzing a phone call transcript for an auto repair shop. Extract customer information mentioned during the call.

TRANSCRIPT:
"""
${transcriptText}
"""

Extract the following information if mentioned. If not mentioned, leave the field empty.
Respond ONLY with valid JSON, no markdown or extra text.

{
  "firstName": "customer's first name if mentioned",
  "lastName": "customer's last name if mentioned", 
  "vehicleYear": "4-digit year like 2022",
  "vehicleMake": "brand like Toyota, Honda, Ford",
  "vehicleModel": "model like Camry, Civic, F-150",
  "serviceRequested": "brief description of service needed, max 50 chars",
  "confidence": "high if clearly stated, medium if inferred, low if uncertain"
}

Only extract information that is EXPLICITLY mentioned or very clearly implied in the transcript.
For vehicle info, only extract if the customer mentions their actual vehicle, not hypotheticals.
For names, only extract if the customer states their name, not if the agent uses a placeholder name.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Clean up the response - remove markdown code blocks if present
        let jsonText = responseText;
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
        }

        // Parse the JSON response
        const extracted = JSON.parse(jsonText) as ExtractedCustomerInfo;

        console.log('[CustomerExtractor] Extracted info:', JSON.stringify(extracted, null, 2));

        // Validate and clean the data
        return {
            firstName: cleanString(extracted.firstName),
            lastName: cleanString(extracted.lastName),
            vehicleYear: cleanVehicleYear(extracted.vehicleYear),
            vehicleMake: cleanString(extracted.vehicleMake),
            vehicleModel: cleanString(extracted.vehicleModel),
            serviceRequested: cleanString(extracted.serviceRequested)?.substring(0, 100),
            confidence: extracted.confidence || 'medium'
        };

    } catch (error: any) {
        console.error('[CustomerExtractor] Extraction failed:', error.message);
        return { confidence: 'low' };
    }
}

/**
 * Clean and validate a string value
 */
function cleanString(value: string | undefined): string | undefined {
    if (!value || value.trim() === '' || value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined') {
        return undefined;
    }
    return value.trim();
}

/**
 * Clean and validate a vehicle year
 */
function cleanVehicleYear(value: string | undefined): string | undefined {
    if (!value) return undefined;

    // Extract 4-digit year
    const match = value.match(/\b(19|20)\d{2}\b/);
    if (match) {
        const year = parseInt(match[0]);
        // Validate year is reasonable (1980-2030)
        if (year >= 1980 && year <= 2030) {
            return match[0];
        }
    }
    return undefined;
}
