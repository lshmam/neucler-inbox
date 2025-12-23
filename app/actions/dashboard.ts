"use server";

import { supabaseAdmin } from "@/lib/supabase";

export async function getDashboardData(merchantId: string) {
    const supabase = supabaseAdmin;

    // Fetch real counts from database
    const [
        messagesResult,
        callsResult,
        customersResult,
        ticketsResult,
        articlesResult,
    ] = await Promise.all([
        // SMS messages count
        supabase.from("sms_messages").select("id", { count: "exact", head: true }).eq("merchant_id", merchantId),
        // Call logs count  
        supabase.from("call_logs").select("id", { count: "exact", head: true }).eq("merchant_id", merchantId),
        // Customers count
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("merchant_id", merchantId),
        // Open tickets count
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("merchant_id", merchantId).eq("status", "open"),
        // Knowledge base articles count
        supabase.from("knowledge_base_articles").select("id", { count: "exact", head: true }).eq("merchant_id", merchantId),
    ]);

    // Get unread messages (inbound without response)
    const { count: unreadCount } = await supabase
        .from("sms_messages")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchantId)
        .eq("direction", "inbound")
        .eq("status", "received");

    // Get call logs from last 7 days for chart
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentCalls } = await supabase
        .from("call_logs")
        .select("created_at")
        .eq("merchant_id", merchantId)
        .gte("created_at", sevenDaysAgo);

    const { data: recentMessages } = await supabase
        .from("sms_messages")
        .select("created_at, direction")
        .eq("merchant_id", merchantId)
        .gte("created_at", sevenDaysAgo);

    // Build chart data from real data
    const chartData = buildChartData(recentCalls || [], recentMessages || []);

    return {
        // Section counts
        serviceDesk: {
            conversations: (messagesResult.count || 0) + (callsResult.count || 0),
            unread: unreadCount || 0,
        },
        pipeline: {
            deals: 0, // Will be populated when deals table exists
            customers: customersResult.count || 0,
        },
        performance: {
            calls: callsResult.count || 0,
            messages: messagesResult.count || 0,
        },
        knowledgeBase: {
            articles: articlesResult.count || 0,
        },
        tickets: {
            open: ticketsResult.count || 0,
        },
        chartData,
    };
}

function buildChartData(calls: { created_at: string }[], messages: { created_at: string; direction: string }[]) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const data: { day: string; calls: number; sms: number }[] = [];

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];

        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const callCount = calls.filter(c => {
            const d = new Date(c.created_at);
            return d >= dayStart && d <= dayEnd;
        }).length;

        const smsCount = messages.filter(m => {
            const d = new Date(m.created_at);
            return d >= dayStart && d <= dayEnd && m.direction === "inbound";
        }).length;

        data.push({ day: dayName, calls: callCount, sms: smsCount });
    }

    return data;
}
