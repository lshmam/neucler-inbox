"use server";

import { supabaseAdmin } from "@/lib/supabase";

export async function getDashboardData(merchantId: string) {
    // DEMO MODE: Return hardcoded data for video demo
    // TODO: Remove this and use real data after demo

    const chartData = [
        { day: "Mon", calls: 12, sms: 8 },
        { day: "Tue", calls: 19, sms: 14 },
        { day: "Wed", calls: 8, sms: 11 },
        { day: "Thu", calls: 15, sms: 9 },
        { day: "Fri", calls: 22, sms: 17 },
        { day: "Sat", calls: 6, sms: 4 },
        { day: "Sun", calls: 3, sms: 2 },
    ];

    const pipeline = {
        newLeads: 24,
        inConversation: 8,
        linksSent: 15,
        booked: 12
    };

    return {
        leadsCaptured: 47,
        leadsTrend: 5,
        needsAttention: 8,
        linkClicks: 23,
        chartData,
        pipeline
    };
}
