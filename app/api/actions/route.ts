import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// Dedicated Actions API - v2
export async function GET(request: Request) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const merchantId = user.id;

    // 1. Fetch actions (without join)
    const { data: actionsData, error: actionsError } = await supabase
        .from("actions")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });

    if (actionsError) {
        return NextResponse.json({ error: actionsError.message }, { status: 500 });
    }

    if (!actionsData || actionsData.length === 0) {
        return NextResponse.json([]);
    }

    // 2. Fetch related customers manually (to avoid FK constraint issues)
    const customerIds = Array.from(new Set(actionsData.map(a => a.customer_id).filter(Boolean)));

    let customersMap: Record<string, any> = {};

    if (customerIds.length > 0) {
        const { data: customersData, error: customersError } = await supabase
            .from("customers")
            .select("id, first_name, last_name, phone_number, vehicle_year, vehicle_make, vehicle_model")
            .in("id", customerIds)
            .eq("merchant_id", merchantId); // Ensure we only get customers for this merchant

        if (!customersError && customersData) {
            customersMap = customersData.reduce((acc, c) => {
                acc[c.id] = c;
                return acc;
            }, {} as Record<string, any>);
        }
    }

    // 3. Merge data
    const enrichedActions = actionsData.map(action => ({
        ...action,
        customers: action.customer_id ? customersMap[action.customer_id] : null
    }));

    return NextResponse.json(enrichedActions);
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const merchantId = user.id;

    // Handle Customer Resolution
    let { customer_id, customer_phone, customer_name } = body;

    if (!customer_id && customer_phone) {
        const { data: existingCustomer } = await supabase
            .from("customers")
            .select("id")
            .eq("merchant_id", merchantId)
            .eq("phone_number", customer_phone)
            .single();

        if (existingCustomer) {
            customer_id = existingCustomer.id;
        } else if (customer_name) {
            const { data: newCustomer } = await supabase
                .from("customers")
                .insert({
                    merchant_id: merchantId,
                    phone_number: customer_phone,
                    first_name: customer_name.split(' ')[0],
                    last_name: customer_name.split(' ').slice(1).join(' ') || '',
                    source: 'manual_action',
                    status: 'active'
                })
                .select()
                .single();

            if (newCustomer) {
                customer_id = newCustomer.id;
            }
        }
    }

    const { data, error } = await supabase
        .from("actions")
        .insert({
            merchant_id: merchantId,
            customer_id: customer_id,
            title: body.title,
            description: body.description,
            type: body.type || 'follow_up',
            priority: body.priority || 'medium',
            status: body.status || 'open',
            due_date: body.due_date,
            metadata: body.metadata || {}
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
