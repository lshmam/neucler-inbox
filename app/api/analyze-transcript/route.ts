/**
 * POST /api/analyze-transcript
 * 
 * Analyzes a call transcript to generate ratings, summaries, next actions, and tags.
 * Updates the database with the results.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { analyzeCall } from "@/services/call-analysis";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { transcript, callLogId } = body;

        if (!transcript) {
            return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
        }

        console.log(`\n🧠 [Analyze API] Starting analysis for user ${user.id}`);
        if (callLogId) console.log(`   Call Log ID: ${callLogId}`);

        // 1. Perform AI Analysis
        const analysis = await analyzeCall(transcript);

        // 2. Update Database (if callLogId provided)
        if (callLogId) {
            // A. Get Call Log & Analysis ID
            const { data: callLog } = await supabaseAdmin
                .from("call_logs")
                .select("id, merchant_id, customer_phone, deepgram_analysis_id")
                .eq("id", callLogId)
                .single();

            if (!callLog) {
                console.warn(`⚠️ [Analyze API] Call log ${callLogId} not found, returning analysis only.`);
                return NextResponse.json({ success: true, analysis });
            }

            // B. Update/Create Deepgram Analysis Record
            let analysisId = callLog.deepgram_analysis_id;

            if (analysisId) {
                // Update existing
                await supabaseAdmin
                    .from("deepgram_analyses")
                    .update({
                        call_rating: analysis.rating,
                        call_summary: analysis.summary,
                        next_actions: analysis.nextActions, // jsonb
                        // processing_status: 'completed' // Assuming it might have been pending
                    })
                    .eq("id", analysisId);
            } else {
                // Create new if missing
                const { data: newAnalysis } = await supabaseAdmin
                    .from("deepgram_analyses")
                    .insert({
                        call_log_id: callLogId,
                        merchant_id: callLog.merchant_id,
                        transcript_text: typeof transcript === 'string' ? transcript : JSON.stringify(transcript),
                        call_rating: analysis.rating,
                        call_summary: analysis.summary,
                        next_actions: analysis.nextActions,
                        processing_status: 'completed',
                        processed_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (newAnalysis) {
                    analysisId = newAnalysis.id;
                    // Link back to call log
                    await supabaseAdmin
                        .from("call_logs")
                        .update({
                            deepgram_analysis_id: analysisId,
                            analysis_source: 'gemini'
                        })
                        .eq("id", callLogId);
                }
            }

            // C. Update Customer Profile & Tags
            if (callLog.customer_phone) {
                const { data: customer } = await supabaseAdmin
                    .from('customers')
                    .select('id, tags, first_name, last_name, phone_number') // Added phone_number for deal
                    .eq('merchant_id', callLog.merchant_id)
                    .eq('phone_number', callLog.customer_phone)
                    .single();

                let customerId: string | null = null;
                let customerData: any = null;

                if (customer) {
                    // EXISTING CUSTOMER - Update tags and info
                    customerId = customer.id;
                    customerData = customer;

                    const updateFields: any = {};
                    const newTags = new Set(customer.tags || []);

                    // Add new tags
                    analysis.tags.forEach(tag => newTags.add(tag));
                    updateFields.tags = Array.from(newTags);

                    // Update customer info if missing/generic
                    const info = analysis.customerInfo;
                    if (info.confidence !== 'low') {
                        if (customer.first_name === 'Unknown Caller' || !customer.first_name) {
                            if (info.firstName) updateFields.first_name = info.firstName;
                            if (info.lastName) updateFields.last_name = info.lastName;
                        }
                        if (info.vehicleYear) updateFields.vehicle_year = info.vehicleYear;
                        if (info.vehicleMake) updateFields.vehicle_make = info.vehicleMake;
                        if (info.vehicleModel) updateFields.vehicle_model = info.vehicleModel;
                        if (info.serviceRequested) updateFields.service_requested = info.serviceRequested;
                    }

                    if (Object.keys(updateFields).length > 0) {
                        await supabaseAdmin
                            .from('customers')
                            .update(updateFields)
                            .eq('id', customer.id);
                        console.log(`✅ [Analyze API] Updated customer ${customer.id} with tags & info`);
                    }
                } else {
                    // NEW CUSTOMER - Create customer record
                    const info = analysis.customerInfo;
                    const { data: newCustomer, error: createError } = await supabaseAdmin
                        .from('customers')
                        .insert({
                            id: crypto.randomUUID(),
                            merchant_id: callLog.merchant_id,
                            phone_number: callLog.customer_phone,
                            first_name: info.firstName || 'Unknown',
                            last_name: info.lastName || 'Caller',
                            email: null,
                            notes: `Auto-created from call analysis.`,
                            tags: analysis.tags || [],
                            vehicle_year: info.vehicleYear,
                            vehicle_make: info.vehicleMake,
                            vehicle_model: info.vehicleModel,
                            service_requested: info.serviceRequested,
                            status: 'active',
                            source: 'phone'
                        })
                        .select()
                        .single();

                    if (createError) {
                        console.error(`❌ [Analyze API] Failed to create customer:`, createError);
                    } else if (newCustomer) {
                        customerId = newCustomer.id;
                        customerData = newCustomer;
                        console.log(`✅ [Analyze API] Created new customer ${customerId} for ${callLog.customer_phone}`);
                    }
                }

                // Only proceed with deals/actions if we have a customer ID
                if (customerId && customerData) {

                    // D. Create/Update Deal in Pipeline
                    if (analysis.pipeline && analysis.pipeline.confidence > 50) {
                        const { data: deal } = await supabaseAdmin
                            .from('deals')
                            .insert({
                                merchant_id: callLog.merchant_id,
                                customer_id: customerId,
                                customer_name: `${customerData.first_name || 'Unknown'} ${customerData.last_name || ''}`.trim() || 'Unknown Customer',
                                customer_phone: customerData.phone_number,
                                title: analysis.pipeline.title,
                                description: analysis.summary,
                                status: analysis.pipeline.status,
                                value: analysis.pipeline.dealValue,
                                priority: analysis.pipeline.priority,
                                source: 'phone',
                                vehicle_year: analysis.customerInfo.vehicleYear,
                                vehicle_make: analysis.customerInfo.vehicleMake,
                                vehicle_model: analysis.customerInfo.vehicleModel,
                                notes: `Auto-generated from Call Analysis.\nRating: ${analysis.rating}/10\nNext Actions: ${analysis.nextActions.join(', ')}`
                            })
                            .select()
                            .single();

                        if (deal) {
                            console.log(`✅ [Analyze API] Created Deal: ${deal.title} (${deal.status})`);

                            // Link analysis to deal if column exists (optional, or store deal_id in analysis)
                            await supabaseAdmin
                                .from("deepgram_analyses")
                                .update({ deal_id: deal.id })
                                .eq("id", analysisId);
                        }
                    }




                    // E. Create Actions (replacing Tickets)
                    if (analysis.nextActions && analysis.nextActions.length > 0) {
                        const actionsToInsert = analysis.nextActions.map(action => ({
                            merchant_id: callLog.merchant_id,
                            customer_id: customerId,
                            title: action,
                            description: `Auto-generated from call analysis.\nContext: ${analysis.summary}`,
                            status: 'open',
                            priority: 'medium',
                            type: 'follow_up',
                            metadata: {
                                source: 'phone',
                                tags: ['AI', ...analysis.tags],
                                vehicle: `${analysis.customerInfo.vehicleYear || ''} ${analysis.customerInfo.vehicleMake || ''} ${analysis.customerInfo.vehicleModel || ''}`.trim()
                            }
                        }));

                        const { error: actionError } = await supabaseAdmin
                            .from('actions')
                            .insert(actionsToInsert);

                        if (actionError) {
                            console.error("❌ [Analyze API] Failed to create actions:", actionError);
                        } else {
                            console.log(`✅ [Analyze API] Created ${actionsToInsert.length} follow-up actions`);
                        }
                    }

                }
            }
        }

        return NextResponse.json({
            success: true,
            analysis
        });

    } catch (error: any) {
        console.error("❌ [Analyze API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
