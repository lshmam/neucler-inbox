import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
    const cookieStore = await cookies();
    const merchantId = cookieStore.get("session_merchant_id")?.value;

    if (!merchantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Define Date Range (Last 30 Days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        // 2. Fetch Data in Parallel
        const [callsRes, messagesRes, emailsRes] = await Promise.all([
            supabaseAdmin
                .from("call_logs")
                .select("created_at, duration_seconds, cost_cents, status")
                .eq("merchant_id", merchantId)
                .gte("created_at", startDate.toISOString()),

            supabaseAdmin
                .from("messages")
                .select("created_at, channel, direction, body")
                .eq("merchant_id", merchantId)
                .gte("created_at", startDate.toISOString()),

            supabaseAdmin
                .from("email_campaigns")
                .select("created_at, delivered_count")
                .eq("merchant_id", merchantId)
                .gte("created_at", startDate.toISOString())
        ]);

        const calls = callsRes.data || [];
        const messages = messagesRes.data || [];
        const emails = emailsRes.data || [];

        // 3. Aggregate Data by Day
        const dailyUsage: Record<string, any> = {};

        // Helper to init day
        const getDay = (isoString: string) => isoString.split('T')[0];
        const initDay = (date: string) => {
            if (!dailyUsage[date]) {
                dailyUsage[date] = {
                    date,
                    calls_cost: 0,
                    sms_cost: 0,
                    email_cost: 0,
                    token_cost: 0,
                    total_cost: 0,
                    calls_count: 0,
                    sms_count: 0,
                    email_count: 0,
                    token_count: 0
                };
            }
        };

        // --- COST CONSTANTS & MARGIN ---
        const MARGIN_MULTIPLIER = 1.5; // 50% Margin
        const SMS_BASE_COST = 0.0079;
        const EMAIL_BASE_COST = 0.0008;
        const TOKEN_BASE_COST = 0.00000015; // Blended input/output for GPT-4o-mini approx

        // Process Calls
        calls.forEach(call => {
            const day = getDay(call.created_at);
            initDay(day);

            // Cost is already in cents in DB, convert to dollars
            const baseCost = (call.cost_cents || 0) / 100;
            const finalCost = baseCost * MARGIN_MULTIPLIER;

            dailyUsage[day].calls_cost += finalCost;
            dailyUsage[day].calls_count += 1;
        });

        // Process Messages (SMS & Tokens)
        messages.forEach(msg => {
            const day = getDay(msg.created_at);
            initDay(day);

            if (msg.channel === 'sms' && msg.direction === 'outbound') {
                const baseCost = SMS_BASE_COST;
                const finalCost = baseCost * MARGIN_MULTIPLIER;
                dailyUsage[day].sms_cost += finalCost;
                dailyUsage[day].sms_count += 1;
            } else if (msg.channel === 'widget') {
                // Estimate tokens: 1 token ~= 4 chars
                const length = msg.body ? msg.body.length : 0;
                const tokens = Math.ceil(length / 4);
                const baseCost = tokens * TOKEN_BASE_COST;
                const finalCost = baseCost * MARGIN_MULTIPLIER;

                dailyUsage[day].token_cost += finalCost;
                dailyUsage[day].token_count += tokens;
            }
        });

        // Process Emails
        emails.forEach(campaign => {
            const day = getDay(campaign.created_at);
            initDay(day);

            const count = campaign.delivered_count || 0;
            const baseCost = count * EMAIL_BASE_COST;
            const finalCost = baseCost * MARGIN_MULTIPLIER;

            dailyUsage[day].email_cost += finalCost;
            dailyUsage[day].email_count += count;
        });

        // 4. Final Formatting
        const history = Object.values(dailyUsage).sort((a: any, b: any) => a.date.localeCompare(b.date));

        // Calculate Totals
        const totals = history.reduce((acc: any, day: any) => {
            day.total_cost = day.calls_cost + day.sms_cost + day.email_cost + day.token_cost;

            acc.calls_cost += day.calls_cost;
            acc.sms_cost += day.sms_cost;
            acc.email_cost += day.email_cost;
            acc.token_cost += day.token_cost;
            acc.total_cost += day.total_cost;
            return acc;
        }, { calls_cost: 0, sms_cost: 0, email_cost: 0, token_cost: 0, total_cost: 0 });

        return NextResponse.json({
            history,
            totals
        });

    } catch (error) {
        console.error("Usage API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
