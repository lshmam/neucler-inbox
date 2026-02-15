import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;

    const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;
    const body = await request.json();

    // Basic Validation
    if (!body.first_name && !body.name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const firstName = body.first_name || body.name.split(" ")[0];
    const lastName = body.last_name || (body.name.includes(" ") ? body.name.split(" ").slice(1).join(" ") : "");

    const { data, error } = await supabase
        .from("customers")
        .insert({
            id: crypto.randomUUID(),
            merchant_id: merchantId,
            first_name: firstName,
            last_name: lastName,
            phone_number: body.phone,
            email: body.email,
            notes: body.notes,
            tags: body.tags || [],
            vehicle_year: body.vehicle_year,
            vehicle_make: body.vehicle_make,
            vehicle_model: body.vehicle_model,
            status: 'active'
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
