import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

interface ScoreData {
    total_score: number;
    quickness_score: number;
    knowledge_score: number;
    hospitality_score: number;
    intro_score: number;
    cta_score: number;
}

// GET /api/performance - Aggregated performance data for dashboard
export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the platform_merchant_id (same as other APIs)
    const { data: merchant } = await supabase
        .from("merchants")
        .select("platform_merchant_id")
        .eq("id", user.id)
        .single();

    const merchantId = merchant?.platform_merchant_id || user.id;

    try {
        // Fetch all tickets with scores for this merchant
        const { data: tickets, error: ticketsError } = await supabase
            .from("tickets")
            .select(`
                id,
                title,
                status,
                outcome,
                created_at,
                resolved_at,
                assigned_to,
                customer_id
            `)
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: false })
            .limit(200);

        if (ticketsError) throw ticketsError;

        // Fetch scores for these tickets
        const ticketIds = (tickets || []).map(t => t.id);
        let scoresMap: Record<string, ScoreData & { feedback_summary: string }> = {};

        if (ticketIds.length > 0) {
            const { data: scores } = await supabaseAdmin
                .from("ticket_scores")
                .select("ticket_id, total_score, quickness_score, knowledge_score, hospitality_score, intro_score, cta_score, feedback_summary")
                .in("ticket_id", ticketIds);

            if (scores) {
                scoresMap = Object.fromEntries(
                    scores.map(s => [s.ticket_id, s])
                );
            }
        }

        // Fetch likes counts
        const { data: likeCounts } = await supabase
            .from("ticket_likes")
            .select("ticket_id")
            .in("ticket_id", ticketIds);

        const likesMap: Record<string, number> = {};
        (likeCounts || []).forEach(l => {
            likesMap[l.ticket_id] = (likesMap[l.ticket_id] || 0) + 1;
        });

        // Calculate KPIs
        const scoredTickets = tickets?.filter(t => scoresMap[t.id]) || [];
        const avgScore = scoredTickets.length > 0
            ? Math.round(scoredTickets.reduce((sum, t) => sum + (scoresMap[t.id]?.total_score || 0), 0) / scoredTickets.length)
            : 0;

        // Resolution speed (for resolved tickets)
        let totalResolutionHours = 0;
        let resolvedCount = 0;
        tickets?.forEach(t => {
            if (t.resolved_at && t.created_at) {
                const hours = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
                totalResolutionHours += hours;
                resolvedCount++;
            }
        });
        const avgResolutionHours = resolvedCount > 0 ? Math.round(totalResolutionHours / resolvedCount * 10) / 10 : 0;

        // Booking rate (tickets with positive outcomes)
        const positiveOutcomes = ['appointment_booked', 'sale_completed', 'issue_resolved'];
        const bookedCount = tickets?.filter(t => positiveOutcomes.includes(t.outcome)).length || 0;
        const bookingRate = tickets?.length ? Math.round((bookedCount / tickets.length) * 100) : 0;

        // Radar chart data - team averages per category
        const categoryTotals = { speed: 0, knowledge: 0, hospitality: 0, process: 0, closing: 0 };
        scoredTickets.forEach(t => {
            const score = scoresMap[t.id];
            if (score) {
                categoryTotals.speed += score.quickness_score;
                categoryTotals.knowledge += score.knowledge_score;
                categoryTotals.hospitality += score.hospitality_score;
                categoryTotals.process += score.intro_score;
                categoryTotals.closing += score.cta_score;
            }
        });

        const count = scoredTickets.length || 1;
        const radarData = [
            { category: "Speed", teamAvg: Math.round(categoryTotals.speed / count), goal: 16 },
            { category: "Knowledge", teamAvg: Math.round(categoryTotals.knowledge / count), goal: 16 },
            { category: "Hospitality", teamAvg: Math.round(categoryTotals.hospitality / count), goal: 16 },
            { category: "Process", teamAvg: Math.round(categoryTotals.process / count), goal: 16 },
            { category: "Closing", teamAvg: Math.round(categoryTotals.closing / count), goal: 16 },
        ];

        // Activity feed - notable performances
        const activityFeed = scoredTickets
            .filter(t => scoresMap[t.id])
            .slice(0, 20)
            .map(t => {
                const score = scoresMap[t.id];
                const isHighPerformance = score.total_score >= 90;
                const isLearningOpp = score.total_score < 70;

                return {
                    ticketId: t.id,
                    title: t.title,
                    score: score.total_score,
                    feedbackSummary: score.feedback_summary || "",
                    type: isHighPerformance ? "high_performance" : isLearningOpp ? "learning" : "normal",
                    createdAt: t.created_at,
                    likes: likesMap[t.id] || 0
                };
            })
            .filter(item => item.type !== "normal"); // Only show notable ones

        // Staff audit data - aggregate by assigned_to
        const staffStats: Record<string, { name: string; interactions: number; totalScore: number; categories: Record<string, number[]> }> = {};

        scoredTickets.forEach(t => {
            const agentId = t.assigned_to || "unassigned";
            if (!staffStats[agentId]) {
                staffStats[agentId] = {
                    name: agentId === "unassigned" ? "AI Agent" : `Agent ${agentId.slice(-4)}`,
                    interactions: 0,
                    totalScore: 0,
                    categories: { speed: [], knowledge: [], hospitality: [], process: [], closing: [] }
                };
            }

            const score = scoresMap[t.id];
            staffStats[agentId].interactions++;
            staffStats[agentId].totalScore += score.total_score;
            staffStats[agentId].categories.speed.push(score.quickness_score);
            staffStats[agentId].categories.knowledge.push(score.knowledge_score);
            staffStats[agentId].categories.hospitality.push(score.hospitality_score);
            staffStats[agentId].categories.process.push(score.intro_score);
            staffStats[agentId].categories.closing.push(score.cta_score);
        });

        const staffAudit = Object.entries(staffStats).map(([id, stats]) => {
            const avgScores: Record<string, number> = {};
            let lowestCategory = "";
            let lowestAvg = Infinity;

            Object.entries(stats.categories).forEach(([cat, scores]) => {
                const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                avgScores[cat] = avg;
                if (avg < lowestAvg) {
                    lowestAvg = avg;
                    lowestCategory = cat;
                }
            });

            return {
                id,
                name: stats.name,
                interactions: stats.interactions,
                consistencyScore: stats.interactions ? Math.round(stats.totalScore / stats.interactions) : 0,
                primaryVariance: lowestCategory.charAt(0).toUpperCase() + lowestCategory.slice(1),
                varianceScore: lowestAvg
            };
        }).sort((a, b) => b.interactions - a.interactions);

        // Fetch Deepgram analyses for sentiment and speaker data
        let deepgramStats = {
            totalAnalyses: 0,
            sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
            avgAgentTalkRatio: 0,
            avgCustomerTalkRatio: 0,
            topTopics: [] as { topic: string; count: number }[],
        };

        const { data: deepgramAnalyses } = await supabase
            .from("deepgram_analyses")
            .select("overall_sentiment, positive_ratio, negative_ratio, neutral_ratio, agent_talk_ratio, customer_talk_ratio, topics")
            .eq("merchant_id", merchantId)
            .eq("processing_status", "completed")
            .order("created_at", { ascending: false })
            .limit(100);

        if (deepgramAnalyses && deepgramAnalyses.length > 0) {
            deepgramStats.totalAnalyses = deepgramAnalyses.length;

            let totalAgentRatio = 0;
            let totalCustomerRatio = 0;
            const topicCounts: Record<string, number> = {};

            for (const analysis of deepgramAnalyses) {
                // Sentiment counts
                if (analysis.overall_sentiment === "positive") deepgramStats.sentimentBreakdown.positive++;
                else if (analysis.overall_sentiment === "negative") deepgramStats.sentimentBreakdown.negative++;
                else deepgramStats.sentimentBreakdown.neutral++;

                // Talk ratios
                totalAgentRatio += analysis.agent_talk_ratio || 0;
                totalCustomerRatio += analysis.customer_talk_ratio || 0;

                // Topics
                if (analysis.topics && Array.isArray(analysis.topics)) {
                    for (const topic of analysis.topics) {
                        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                    }
                }
            }

            deepgramStats.avgAgentTalkRatio = totalAgentRatio / deepgramAnalyses.length;
            deepgramStats.avgCustomerTalkRatio = totalCustomerRatio / deepgramAnalyses.length;
            deepgramStats.topTopics = Object.entries(topicCounts)
                .map(([topic, count]) => ({ topic, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
        }

        // Fetch call logs for AI vs Human handling stats
        // Using supabaseAdmin to bypass RLS since call_logs may not have proper RLS policies
        const { data: callLogs, error: callLogsError } = await supabaseAdmin
            .from("call_logs")
            .select("id, status, direction, duration_seconds, call_successful, created_at")
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: false })
            .limit(500);

        console.log("[Performance API] merchantId:", merchantId, "callLogs count:", callLogs?.length || 0, "error:", callLogsError?.message || "none");

        // Calculate call handling stats
        const callStats = {
            totalCalls: 0,
            inboundCalls: 0,
            outboundCalls: 0,
            aiHandledCalls: 0,
            humanHandledCalls: 0,
            transferredCalls: 0,
            successfulCalls: 0,
            avgDurationSeconds: 0,
            aiSuccessRate: 0,
        };

        if (callLogs && callLogs.length > 0) {
            callStats.totalCalls = callLogs.length;

            let totalDuration = 0;
            for (const call of callLogs) {
                // Direction stats
                if (call.direction === "inbound") callStats.inboundCalls++;
                if (call.direction === "outbound") callStats.outboundCalls++;

                // Success tracking
                if (call.call_successful) callStats.successfulCalls++;

                // Duration
                if (call.duration_seconds) totalDuration += call.duration_seconds;

                // AI vs Human handling - check status for transferred calls
                const status = (call.status || "").toLowerCase();
                if (status.includes("transfer") || status.includes("forward") || status.includes("human")) {
                    callStats.humanHandledCalls++;
                    callStats.transferredCalls++;
                } else {
                    // AI handled if not transferred
                    callStats.aiHandledCalls++;
                }
            }

            callStats.avgDurationSeconds = Math.round(totalDuration / callStats.totalCalls);
            callStats.aiSuccessRate = callStats.aiHandledCalls > 0
                ? Math.round((callStats.successfulCalls / callStats.aiHandledCalls) * 100)
                : 0;
        }

        return NextResponse.json({
            kpis: {
                avgScore,
                avgResolutionHours,
                bookingRate,
                trend: 2.4 // Placeholder for trend calculation
            },
            radarData,
            activityFeed,
            staffAudit,
            totalTickets: tickets?.length || 0,
            // Deepgram analytics
            deepgramStats,
            // Call handling stats
            callStats,
        });

    } catch (error: any) {
        console.error("Performance API error:", error);
        return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 });
    }
}

