"use server";

import { supabaseAdmin } from "@/lib/supabase";

export async function getAnalyticsData(merchantId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 1. Fetch Call Logs (Last 30 Days)
    const { data: calls } = await supabaseAdmin
        .from("call_logs")
        .select("duration_seconds, status, created_at, sentiment")
        .eq("merchant_id", merchantId)
        .gte("created_at", thirtyDaysAgo.toISOString());

    // 2. Fetch Transactions (Revenue)
    const { data: transactions } = await supabaseAdmin
        .from("transactions")
        .select("amount_cents, created_at")
        .eq("merchant_id", merchantId)
        .gte("created_at", thirtyDaysAgo.toISOString());

    // 3. Fetch New Leads (Customers)
    const { data: newCustomers } = await supabaseAdmin
        .from("customers")
        .select("created_at")
        .eq("merchant_id", merchantId)
        .gte("created_at", thirtyDaysAgo.toISOString());

    // --- CALCULATIONS ---

    const totalCalls = calls?.length || 0;

    // Calculate "Hours Saved" (Total call duration / 3600)
    // If duration is missing, assume average 3 mins (180s)
    const totalSeconds = calls?.reduce((acc, c) => acc + (c.duration_seconds || 180), 0) || 0;
    const hoursSaved = (totalSeconds / 3600).toFixed(1);

    // Calculate "Money Saved" (Hours * $15/hr reception wage)
    const moneySaved = (Number(hoursSaved) * 15).toFixed(2);

    // Total Revenue
    const revenueCents = transactions?.reduce((acc, t) => acc + t.amount_cents, 0) || 0;
    const revenue = (revenueCents / 100).toFixed(2);

    // Sentiment Breakdown
    const sentimentCounts = {
        positive: calls?.filter(c => c.sentiment === 'positive').length || 0,
        neutral: calls?.filter(c => c.sentiment === 'neutral').length || 0,
        negative: calls?.filter(c => c.sentiment === 'negative').length || 0,
    };

    // Mock Graph Data (Group by Day) - In production, use comprehensive grouping
    // This generates the last 7 days of data structure
    const dailyActivity = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        return {
            name: d.toLocaleDateString('en-US', { weekday: 'short' }),
            calls: calls?.filter(c => c.created_at.startsWith(dateStr)).length || 0,
            sales: (transactions?.filter(t => t.created_at.startsWith(dateStr)).reduce((acc, t) => acc + t.amount_cents, 0) || 0) / 100
        };
    });

    return {
        totalCalls,
        hoursSaved,
        moneySaved,
        revenue,
        newLeads: newCustomers?.length || 0,
        sentiment: sentimentCounts,
        dailyActivity
    };
}