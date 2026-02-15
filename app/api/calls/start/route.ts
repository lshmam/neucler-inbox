
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMerchantId } from "@/lib/auth-helpers";

export async function POST(request: Request) {
    try {
        const merchantId = await getMerchantId();
        const body = await request.json();
        const { customer, direction } = body;

        console.log(`[Call Start] Starting ${direction} call for merchant ${merchantId}`);

        // 1. Find or Create Customer if phone provided
        let customerId = null;
        if (customer?.phone) {
            const { data: existingCustomer } = await supabaseAdmin
                .from("customers")
                .select("id")
                .eq("merchant_id", merchantId)
                .eq("phone_number", customer.phone)
                .single();

            if (existingCustomer) {
                customerId = existingCustomer.id;
            } else {
                if (customer.name) {
                    // Create new customer
                    const { data: newCustomer, error: createError } = await supabaseAdmin
                        .from("customers")
                        .insert({
                            merchant_id: merchantId,
                            phone_number: customer.phone,
                            first_name: customer.name.split(' ')[0],
                            last_name: customer.name.split(' ').slice(1).join(' ') || '',
                            source: 'phone_call' // or 'inbound_call'
                        })
                        .select()
                        .single();

                    if (newCustomer) {
                        customerId = newCustomer.id;
                        console.log(`[Call Start] Created new customer: ${customerId}`);
                    } else if (createError) {
                        console.warn(`[Call Start] Failed to create customer:`, createError);
                    }
                }
            }
        }

        // 2. Create Call Log

        // Use a placeholder UUID for agent_id if we don't have a real one from auth context yet
        // In real app, this should be the user's ID or the selected agent's ID
        const dummyAgentId = "00000000-0000-0000-0000-000000000000";

        const { data: callLog, error } = await supabaseAdmin
            .from("call_logs")
            .insert({
                merchant_id: merchantId,
                customer_phone: customer.phone,
                direction: direction || 'outbound',
                status: 'in-progress',

                // Required fields based on schema
                agent_id: dummyAgentId,
                retell_call_id: `internal-${Date.now()}-${Math.random().toString(36).substring(7)}`,

                customer_id: customerId
            })
            .select()
            .single();

        if (error) {
            console.error("[Call Start] Error creating log:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`✅ [Call Start] Started call ${callLog.id}`);

        return NextResponse.json({
            success: true,
            callId: callLog.id,
            customerId: customerId
        });

    } catch (error: any) {
        console.error("[Call Start] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
