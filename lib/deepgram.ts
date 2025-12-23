/**
 * Deepgram Speech-to-Text Service
 * 
 * Provides enhanced transcription with:
 * - Speaker diarization (who said what)
 * - Sentiment analysis per utterance
 * - Topic/intent detection
 * - Smart formatting (dates, numbers, punctuation)
 */

import { createClient, DeepgramClient, } from "@deepgram/sdk";

// Initialize Deepgram client
const apiKey = process.env.DEEPGRAM_API_KEY;

if (!apiKey) {
    console.warn("⚠️ DEEPGRAM_API_KEY not configured. Deepgram features will be disabled.");
}

const deepgram: DeepgramClient | null = apiKey ? createClient(apiKey) : null;

// Types for Deepgram response
export interface DiarizedUtterance {
    speaker: number;
    start: number;
    end: number;
    text: string;
    confidence: number;
}

export interface SentimentResult {
    speaker: number;
    text: string;
    sentiment: "positive" | "negative" | "neutral";
    sentiment_score: number;
    start: number;
    end: number;
}

export interface DeepgramAnalysisResult {
    transcript_text: string;
    confidence: number;
    duration_seconds: number;
    diarization: DiarizedUtterance[];
    sentiment_analysis: SentimentResult[];
    overall_sentiment: "positive" | "negative" | "neutral";
    positive_ratio: number;
    negative_ratio: number;
    neutral_ratio: number;
    topics: string[];
    speaker_count: number;
    agent_talk_ratio: number;
    customer_talk_ratio: number;
}

/**
 * Transcribe a recording from URL using Deepgram
 * @param audioUrl - URL to the audio file (must be publicly accessible or a signed URL)
 * @returns Structured analysis result
 */
export async function transcribeRecording(audioUrl: string): Promise<DeepgramAnalysisResult> {
    if (!deepgram) {
        throw new Error("Deepgram is not configured. Please set DEEPGRAM_API_KEY.");
    }

    console.log(`🎙️ [Deepgram] Starting transcription for: ${audioUrl.substring(0, 50)}...`);

    try {
        // Call Deepgram pre-recorded transcription API
        const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
            { url: audioUrl },
            {
                model: "nova-2",           // Best accuracy model
                smart_format: true,         // Punctuation, numbers, dates
                diarize: true,              // Speaker identification
                sentiment: true,            // Sentiment per segment
                topics: true,               // Topic detection (replaces deprecated detect_topics)
                utterances: true,           // Natural speech segments
                punctuate: true,            // Add punctuation
                paragraphs: true,           // Group into paragraphs
                language: "en-US",          // Language
            }
        );

        if (error) {
            console.error("❌ [Deepgram] Transcription error:", error);
            throw new Error(`Deepgram error: ${error.message}`);
        }

        if (!result || !result.results) {
            throw new Error("Empty response from Deepgram");
        }

        console.log(`✅ [Deepgram] Transcription complete`);

        // Extract the main transcript
        const channels = result.results.channels;
        const alternatives = channels?.[0]?.alternatives?.[0];

        if (!alternatives) {
            throw new Error("No transcription alternatives found");
        }

        const transcriptText = alternatives.transcript || "";
        const confidence = alternatives.confidence || 0;

        // Process diarization (utterances with speaker labels)
        const diarization: DiarizedUtterance[] = [];
        const utterances = result.results.utterances || [];

        for (const utterance of utterances) {
            diarization.push({
                speaker: utterance.speaker || 0,
                start: utterance.start || 0,
                end: utterance.end || 0,
                text: utterance.transcript || "",
                confidence: utterance.confidence || 0,
            });
        }

        // Process sentiment analysis
        const sentimentAnalysis: SentimentResult[] = [];
        let positiveCount = 0;
        let negativeCount = 0;
        let neutralCount = 0;

        // Deepgram returns sentiment in the sentiments field
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sentiments: any[] = (result.results as any).sentiments?.segments || [];

        for (const segment of sentiments) {
            const sentiment = segment.sentiment || "neutral";
            const sentimentScore = segment.sentiment_score || 0;

            sentimentAnalysis.push({
                speaker: segment.speaker || 0,
                text: segment.text || "",
                sentiment: sentiment as "positive" | "negative" | "neutral",
                sentiment_score: sentimentScore,
                start: segment.start || 0,
                end: segment.end || 0,
            });

            // Count for ratios
            if (sentiment === "positive") positiveCount++;
            else if (sentiment === "negative") negativeCount++;
            else neutralCount++;
        }

        // Calculate sentiment ratios
        const totalSentiments = positiveCount + negativeCount + neutralCount || 1;
        const positiveRatio = positiveCount / totalSentiments;
        const negativeRatio = negativeCount / totalSentiments;
        const neutralRatio = neutralCount / totalSentiments;

        // Determine overall sentiment
        let overallSentiment: "positive" | "negative" | "neutral" = "neutral";
        if (positiveRatio > negativeRatio && positiveRatio > neutralRatio) {
            overallSentiment = "positive";
        } else if (negativeRatio > positiveRatio && negativeRatio > neutralRatio) {
            overallSentiment = "negative";
        }

        // Extract topics
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const topicsData: any[] = (result.results as any).topics?.segments || [];
        const topicsSet = new Set<string>();

        for (const segment of topicsData) {
            for (const topic of segment.topics || []) {
                if (topic.topic) {
                    topicsSet.add(topic.topic);
                }
            }
        }
        const topics = Array.from(topicsSet);

        // Calculate speaker talk ratios
        const speakerDurations: Record<number, number> = {};
        let totalDuration = 0;

        for (const utterance of diarization) {
            const duration = utterance.end - utterance.start;
            speakerDurations[utterance.speaker] = (speakerDurations[utterance.speaker] || 0) + duration;
            totalDuration += duration;
        }

        const speakerCount = Object.keys(speakerDurations).length || 2;

        // Assume speaker 0 is agent, speaker 1 is customer (typical for inbound calls)
        const agentDuration = speakerDurations[0] || 0;
        const customerDuration = speakerDurations[1] || 0;
        const totalSpeakingTime = agentDuration + customerDuration || 1;

        const agentTalkRatio = agentDuration / totalSpeakingTime;
        const customerTalkRatio = customerDuration / totalSpeakingTime;

        // Get duration from metadata
        const durationSeconds = result.metadata?.duration || totalDuration;

        console.log(`📊 [Deepgram] Analysis summary:`);
        console.log(`   - Transcript length: ${transcriptText.length} chars`);
        console.log(`   - Confidence: ${(confidence * 100).toFixed(1)}%`);
        console.log(`   - Speakers: ${speakerCount}`);
        console.log(`   - Sentiment: ${overallSentiment} (${(positiveRatio * 100).toFixed(0)}% pos, ${(negativeRatio * 100).toFixed(0)}% neg)`);
        console.log(`   - Topics: ${topics.join(", ") || "none detected"}`);

        return {
            transcript_text: transcriptText,
            confidence,
            duration_seconds: durationSeconds,
            diarization,
            sentiment_analysis: sentimentAnalysis,
            overall_sentiment: overallSentiment,
            positive_ratio: positiveRatio,
            negative_ratio: negativeRatio,
            neutral_ratio: neutralRatio,
            topics,
            speaker_count: speakerCount,
            agent_talk_ratio: agentTalkRatio,
            customer_talk_ratio: customerTalkRatio,
        };

    } catch (err: any) {
        console.error("❌ [Deepgram] Failed to transcribe:", err.message);
        throw err;
    }
}

/**
 * Check if Deepgram is configured and available
 */
export function isDeepgramConfigured(): boolean {
    return deepgram !== null;
}

/**
 * Public sample audio URL for testing
 */
export const SAMPLE_AUDIO_URL = "https://static.deepgram.com/examples/interview_speech-analytics.wav";
