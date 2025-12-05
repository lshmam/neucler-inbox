import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");

    if (!merchantId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { data: widget } = await supabaseAdmin
        .from("web_widgets")
        .select("primary_color, greeting_message, business_name")
        .eq("merchant_id", merchantId)
        .single();

    return NextResponse.json(widget || {
        primary_color: "#0F172A",
        greeting_message: "Hi there! How can we help?",
        business_name: "Support"
    });
}