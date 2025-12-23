/**
 * POST /api/deepgram/analyze
 * 
 * Manually trigger Deepgram analysis for a call recording.
 * Can be used for:
 * - Analyzing existing recordings that weren't processed
 * - Re-analyzing calls with updated settings
 * - Testing with sample audio
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { transcribeRecording, isDeepgramConfigured, SAMPLE_AUDIO_URL, DeepgramAnalysisResult } from "@/lib/deepgram";
import { extractCustomerInfo } from "@/services/customer-info-extractor";

export async function POST(request: Request) {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Deepgram is configured
    if (!isDeepgramConfigured()) {
        return NextResponse.json(
            { error: "Deepgram is not configured. Please set DEEPGRAM_API_KEY in environment variables." },
            { status: 503 }
        );
    }

    try {
        const body = await request.json();
        const { callLogId, audioUrl, useSample = false } = body;

        // Use sample audio if requested or no URL provided
        const recordingUrl = useSample ? SAMPLE_AUDIO_URL : audioUrl;

        if (!recordingUrl) {
            return NextResponse.json(
                { error: "audioUrl is required, or set useSample: true to test with sample audio" },
                { status: 400 }
            );
        }

        console.log(`\n🎙️ [Deepgram API] Starting analysis`);
        console.log(`   User: ${user.id}`);
        console.log(`   CallLogId: ${callLogId || "none (direct analysis)"}`);
        console.log(`   Audio URL: ${recordingUrl.substring(0, 60)}...`);

        // If we have a callLogId, verify ownership and create tracking record
        let analysisId: string | null = null;

        if (callLogId) {
            // Verify the call log belongs to this merchant
            const { data: callLog, error: callLogError } = await supabaseAdmin
                .from("call_logs")
                .select("id, merchant_id")
                .eq("id", callLogId)
                .single();

            if (callLogError || !callLog) {
                return NextResponse.json({ error: "Call log not found" }, { status: 404 });
            }

            // Create analysis record in pending state
            const { data: analysis, error: insertError } = await supabaseAdmin
                .from("deepgram_analyses")
                .insert({
                    call_log_id: callLogId,
                    merchant_id: callLog.merchant_id,
                    processing_status: "processing",
                })
                .select()
                .single();

            if (insertError) {
                console.error("❌ Failed to create analysis record:", insertError);
                return NextResponse.json({ error: "Failed to create analysis record" }, { status: 500 });
            }

            analysisId = analysis.id;
        }

        // Run Deepgram transcription
        let result: DeepgramAnalysisResult;
        try {
            result = await transcribeRecording(recordingUrl);
        } catch (transcribeError: any) {
            // Mark analysis as failed if we have a record
            if (analysisId) {
                await supabaseAdmin
                    .from("deepgram_analyses")
                    .update({
                        processing_status: "failed",
                        error_message: transcribeError.message,
                    })
                    .eq("id", analysisId);
            }

            return NextResponse.json(
                { error: `Transcription failed: ${transcribeError.message}` },
                { status: 500 }
            );
        }

        // Store the analysis result if we have a tracking record
        if (analysisId) {
            const { error: updateError } = await supabaseAdmin
                .from("deepgram_analyses")
                .update({
                    transcript_text: result.transcript_text,
                    confidence: result.confidence,
                    duration_seconds: result.duration_seconds,
                    diarization: result.diarization,
                    sentiment_analysis: result.sentiment_analysis,
                    overall_sentiment: result.overall_sentiment,
                    positive_ratio: result.positive_ratio,
                    negative_ratio: result.negative_ratio,
                    neutral_ratio: result.neutral_ratio,
                    topics: result.topics,
                    speaker_count: result.speaker_count,
                    agent_talk_ratio: result.agent_talk_ratio,
                    customer_talk_ratio: result.customer_talk_ratio,
                    processing_status: "completed",
                    processed_at: new Date().toISOString(),
                })
                .eq("id", analysisId);

            if (updateError) {
                console.error("❌ Failed to update analysis record:", updateError);
            }

            // Update call_logs with reference to analysis
            await supabaseAdmin
                .from("call_logs")
                .update({
                    deepgram_analysis_id: analysisId,
                    analysis_source: "deepgram",
                })
                .eq("id", callLogId);

            // --- EXTRACT CUSTOMER INFO FROM TRANSCRIPT ---
            if (result.transcript_text && result.transcript_text.length > 20) {
                console.log(`\n👤 [Deepgram] Extracting customer info from transcript...`);

                try {
                    // Get the call log to find the customer phone
                    const { data: callLog } = await supabaseAdmin
                        .from("call_logs")
                        .select("customer_phone, merchant_id")
                        .eq("id", callLogId)
                        .single();

                    if (callLog?.customer_phone && callLog?.merchant_id) {
                        const extractedInfo = await extractCustomerInfo(result.transcript_text);
                        console.log(`[Deepgram CustomerExtractor] Extracted:`, JSON.stringify(extractedInfo, null, 2));

                        const hasData = extractedInfo.firstName || extractedInfo.vehicleYear ||
                            extractedInfo.vehicleMake || extractedInfo.serviceRequested;

                        if (hasData && extractedInfo.confidence !== 'low') {
                            const updateFields: any = {};

                            // Only update name if current name is "Unknown Caller"
                            if (extractedInfo.firstName) {
                                const { data: currentCustomer } = await supabaseAdmin
                                    .from('customers')
                                    .select('first_name')
                                    .eq('merchant_id', callLog.merchant_id)
                                    .eq('phone_number', callLog.customer_phone)
                                    .single();

                                if (currentCustomer?.first_name === 'Unknown Caller' || !currentCustomer?.first_name) {
                                    updateFields.first_name = extractedInfo.firstName;
                                    if (extractedInfo.lastName) updateFields.last_name = extractedInfo.lastName;
                                }
                            }

                            if (extractedInfo.vehicleYear) updateFields.vehicle_year = extractedInfo.vehicleYear;
                            if (extractedInfo.vehicleMake) updateFields.vehicle_make = extractedInfo.vehicleMake;
                            if (extractedInfo.vehicleModel) updateFields.vehicle_model = extractedInfo.vehicleModel;
                            if (extractedInfo.serviceRequested) updateFields.service_requested = extractedInfo.serviceRequested;

                            if (Object.keys(updateFields).length > 0) {
                                await supabaseAdmin
                                    .from('customers')
                                    .update(updateFields)
                                    .eq('merchant_id', callLog.merchant_id)
                                    .eq('phone_number', callLog.customer_phone);

                                console.log(`✅ [Deepgram] Customer info updated:`, Object.keys(updateFields).join(', '));
                            }
                        }
                    }
                } catch (extractError: any) {
                    console.error(`❌ [Deepgram] Customer extraction error:`, extractError.message);
                }
            }
            // --- END CUSTOMER INFO EXTRACTION ---
        }

        console.log(`✅ [Deepgram API] Analysis complete`);

        return NextResponse.json({
            success: true,
            analysisId,
            result: {
                transcript_length: result.transcript_text.length,
                confidence: result.confidence,
                duration_seconds: result.duration_seconds,
                speaker_count: result.speaker_count,
                overall_sentiment: result.overall_sentiment,
                sentiment_breakdown: {
                    positive: result.positive_ratio,
                    negative: result.negative_ratio,
                    neutral: result.neutral_ratio,
                },
                topics: result.topics,
                agent_talk_ratio: result.agent_talk_ratio,
                customer_talk_ratio: result.customer_talk_ratio,
                // Include full transcript for direct API calls
                transcript: callLogId ? undefined : result.transcript_text,
                diarization: callLogId ? undefined : result.diarization,
            },
        });

    } catch (error: any) {
        console.error("❌ [Deepgram API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// GET endpoint to check Deepgram status
export async function GET() {
    return NextResponse.json({
        configured: isDeepgramConfigured(),
        sampleAudioUrl: SAMPLE_AUDIO_URL,
        message: isDeepgramConfigured()
            ? "Deepgram is configured and ready"
            : "Deepgram is not configured. Add DEEPGRAM_API_KEY to environment variables.",
    });
}
