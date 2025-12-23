/**
 * POST /api/twilio/recording
 * 
 * Twilio Recording Status Callback Webhook
 * 
 * This endpoint is called by Twilio when a call recording is complete.
 * It captures the recording URL and triggers Deepgram analysis for
 * free-tier merchants who don't have Retell AI voice.
 * 
 * SETUP INSTRUCTIONS:
 * 1. In Twilio Console, go to your phone number settings
 * 2. Under "Voice & Fax" > "A Call Comes In", configure your webhook
 * 3. Add `record=true` to your TwiML or set Recording URL to this endpoint
 * 4. Set Recording Status Callback URL to: https://your-app.com/api/twilio/recording
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { transcribeRecording, isDeepgramConfigured } from "@/lib/deepgram";

export async function POST(request: Request) {
    try {
        // Get query params from callback URL
        const url = new URL(request.url);
        const merchantIdParam = url.searchParams.get("merchantId");
        const agentPhoneParam = url.searchParams.get("agentPhone");

        // Parse Twilio webhook data (form-urlencoded)
        const data = await request.formData();

        const callSid = data.get("CallSid") as string;
        const recordingSid = data.get("RecordingSid") as string;
        const recordingUrl = data.get("RecordingUrl") as string;
        const recordingStatus = data.get("RecordingStatus") as string;
        const recordingDuration = data.get("RecordingDuration") as string;
        const fromNumber = data.get("From") as string;
        const toNumber = data.get("To") as string || agentPhoneParam;

        console.log("\n========================================");
        console.log("📼 TWILIO RECORDING WEBHOOK");
        console.log("========================================");
        console.log(`CallSid: ${callSid}`);
        console.log(`RecordingSid: ${recordingSid}`);
        console.log(`Status: ${recordingStatus}`);
        console.log(`Duration: ${recordingDuration}s`);
        console.log(`From: ${fromNumber}`);
        console.log(`To: ${toNumber}`);
        console.log(`Recording URL: ${recordingUrl}`);
        console.log(`MerchantId (from URL): ${merchantIdParam}`);
        console.log("========================================\n");

        // Only process completed recordings
        if (recordingStatus !== "completed") {
            console.log(`⏭️ Skipping - recording status is ${recordingStatus}`);
            return NextResponse.json({ status: "skipped", reason: "not_completed" });
        }

        if (!recordingUrl) {
            console.log("⚠️ No recording URL provided");
            return NextResponse.json({ status: "skipped", reason: "no_url" });
        }

        // Twilio recording URL needs authentication for Deepgram to access
        // Format: https://AccountSid:AuthToken@api.twilio.com/...
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

        let audioUrl: string;
        if (twilioAccountSid && twilioAuthToken) {
            // Inject Basic Auth into URL
            audioUrl = recordingUrl
                .replace("https://", `https://${twilioAccountSid}:${twilioAuthToken}@`)
                + ".wav";
        } else {
            // Fallback without auth (may fail)
            audioUrl = `${recordingUrl}.wav`;
            console.log("⚠️ Twilio credentials not found, recording URL may not be accessible");
        }

        // Find the merchant - prefer query param, fallback to phone lookup
        let agent: { id: string; merchant_id: string; phone_number: string } | null = null;

        if (merchantIdParam) {
            // Use merchant ID from callback URL
            const { data: agentData } = await supabaseAdmin
                .from("ai_agents")
                .select("id, merchant_id, phone_number")
                .eq("merchant_id", merchantIdParam)
                .single();
            agent = agentData;
        }

        // Fallback to phone number lookup
        if (!agent && toNumber) {
            const { data: agentData } = await supabaseAdmin
                .from("ai_agents")
                .select("id, merchant_id, phone_number")
                .eq("phone_number", toNumber)
                .single();
            agent = agentData;
        }

        if (!agent) {
            console.log(`⚠️ No agent found for merchant: ${merchantIdParam} or number: ${toNumber}`);
        }

        const merchantId = agent?.merchant_id || merchantIdParam || "unknown";

        // Check if we already have a call log for this CallSid
        const { data: existingLog } = await supabaseAdmin
            .from("call_logs")
            .select("id, retell_call_id")
            .eq("retell_call_id", callSid)
            .single();

        let callLogId: string;

        if (existingLog) {
            // Update existing call log with recording URL
            callLogId = existingLog.id;
            await supabaseAdmin
                .from("call_logs")
                .update({ recording_url: audioUrl })
                .eq("id", callLogId);
            console.log(`📝 Updated existing call log ${callLogId} with recording URL`);
        } else if (agent?.id) {
            // Create new call log only if we have an agent
            const { data: newLog, error: insertError } = await supabaseAdmin
                .from("call_logs")
                .insert({
                    retell_call_id: callSid,
                    merchant_id: merchantId,
                    agent_id: agent.id,
                    direction: "inbound",
                    customer_phone: fromNumber,
                    status: "completed",
                    duration_seconds: parseInt(recordingDuration) || 0,
                    recording_url: audioUrl,
                    analysis_source: "twilio",
                })
                .select()
                .single();

            if (insertError) {
                console.error("❌ Failed to create call log:", insertError);
                return NextResponse.json({ error: "Failed to create call log" }, { status: 500 });
            }

            callLogId = newLog.id;
            console.log(`✅ Created new call log: ${callLogId}`);
        } else {
            // No agent and no existing log - can't create call log without agent_id
            console.log("⚠️ Cannot create call log: no agent found and no existing log. Skipping Deepgram analysis.");
            return NextResponse.json({
                status: "skipped",
                reason: "no_agent_found",
                recordingUrl: audioUrl
            });
        }

        // Trigger Deepgram analysis if configured
        if (isDeepgramConfigured()) {
            console.log("🎙️ Triggering Deepgram analysis...");

            // Create analysis record
            const { data: analysis, error: analysisError } = await supabaseAdmin
                .from("deepgram_analyses")
                .insert({
                    call_log_id: callLogId,
                    merchant_id: merchantId,
                    processing_status: "processing",
                })
                .select()
                .single();

            if (analysisError) {
                console.error("❌ Failed to create analysis record:", analysisError);
            } else {
                // Fire-and-forget: Process in background
                transcribeRecording(audioUrl)
                    .then(async (result) => {
                        await supabaseAdmin
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
                            .eq("id", analysis.id);

                        // Update call log with analysis reference
                        await supabaseAdmin
                            .from("call_logs")
                            .update({
                                deepgram_analysis_id: analysis.id,
                                analysis_source: "deepgram",
                                summary: result.transcript_text.substring(0, 500),
                            })
                            .eq("id", callLogId);

                        console.log(`✅ Deepgram analysis complete for call ${callLogId}`);
                    })
                    .catch(async (err) => {
                        console.error(`❌ Deepgram analysis failed:`, err.message);
                        await supabaseAdmin
                            .from("deepgram_analyses")
                            .update({
                                processing_status: "failed",
                                error_message: err.message,
                            })
                            .eq("id", analysis.id);
                    });
            }
        } else {
            console.log("⚠️ Deepgram not configured, skipping analysis");
        }

        return NextResponse.json({
            status: "success",
            callLogId,
            recordingUrl: audioUrl,
        });

    } catch (error: any) {
        console.error("❌ Recording webhook error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
