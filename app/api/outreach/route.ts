/**
 * GET /api/outreach
 * 
 * Fetches customer data and groups by tags for audience selection.
 * Returns tag groups with customer counts and average spend.
 */

import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// Icon mapping for common tags (default to Users icon)
const TAG_ICONS: Record<string, { color: string; bgColor: string; textColor: string }> = {
    "vip": { color: "from-purple-500 to-indigo-600", bgColor: "bg-purple-50", textColor: "text-purple-700" },
    "new lead": { color: "from-blue-500 to-cyan-600", bgColor: "bg-blue-50", textColor: "text-blue-700" },
    "active": { color: "from-green-500 to-emerald-600", bgColor: "bg-green-50", textColor: "text-green-700" },
    "cold": { color: "from-slate-500 to-slate-700", bgColor: "bg-slate-50", textColor: "text-slate-700" },
    "oil change": { color: "from-amber-500 to-orange-600", bgColor: "bg-amber-50", textColor: "text-amber-700" },
    "due for service": { color: "from-amber-500 to-orange-600", bgColor: "bg-amber-50", textColor: "text-amber-700" },
    "declined": { color: "from-red-500 to-rose-600", bgColor: "bg-red-50", textColor: "text-red-700" },
    "high value": { color: "from-yellow-500 to-amber-600", bgColor: "bg-yellow-50", textColor: "text-yellow-700" },
};

const DEFAULT_STYLE = { color: "from-gray-500 to-slate-600", bgColor: "bg-gray-50", textColor: "text-gray-700" };

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = user.id;

    try {
        // Fetch business name for message preview
        const { data: merchant } = await supabase
            .from("merchants")
            .select("business_name")
            .eq("id", merchantId)
            .single();

        const businessName = merchant?.business_name || "Your Business";

        // Fetch all customers for this merchant
        const { data: customers, error: customersError } = await supabase
            .from("customers")
            .select("id, first_name, last_name, phone_number, email, tags, total_spend_cents, status")
            .eq("merchant_id", merchantId);

        if (customersError) throw customersError;

        if (!customers || customers.length === 0) {
            return NextResponse.json({
                audienceGroups: [],
                totalCustomers: 0,
                allTags: [],
                businessName,
            });
        }

        // Aggregate by tags
        const tagGroups: Record<string, {
            count: number;
            totalSpend: number;
            customerIds: string[];
        }> = {};

        // Also track customers without tags
        let untaggedCount = 0;
        let untaggedSpend = 0;
        const untaggedIds: string[] = [];

        for (const customer of customers) {
            const tags: string[] = customer.tags || [];
            const spend = customer.total_spend_cents || 0;

            if (tags.length === 0) {
                untaggedCount++;
                untaggedSpend += spend;
                untaggedIds.push(customer.id);
            } else {
                for (const tag of tags) {
                    const normalizedTag = tag.toLowerCase().trim();
                    if (!tagGroups[normalizedTag]) {
                        tagGroups[normalizedTag] = { count: 0, totalSpend: 0, customerIds: [] };
                    }
                    tagGroups[normalizedTag].count++;
                    tagGroups[normalizedTag].totalSpend += spend;
                    tagGroups[normalizedTag].customerIds.push(customer.id);
                }
            }
        }

        // Internal/system tags to hide from marketing audiences
        const HIDDEN_TAGS = ['needs_human', 'needs human', 'internal', 'system'];

        // Build audience groups array (excluding internal tags)
        const audienceGroups = Object.entries(tagGroups)
            .filter(([tag]) => !HIDDEN_TAGS.includes(tag.toLowerCase()))
            .map(([tag, data]) => {
                const style = TAG_ICONS[tag] || DEFAULT_STYLE;
                const avgSpend = data.count > 0 ? Math.round(data.totalSpend / data.count / 100) : 0;

                // Format tag name: replace underscores/hyphens with spaces, capitalize each word
                const formattedName = tag
                    .replace(/[_-]/g, ' ')  // Replace underscores and hyphens with spaces
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                return {
                    id: tag.replace(/\s+/g, '-'),
                    name: formattedName,
                    count: data.count,
                    avgValue: avgSpend,
                    customerIds: data.customerIds,
                    ...style,
                };
            });

        // Add untagged group if there are customers without tags
        if (untaggedCount > 0) {
            audienceGroups.push({
                id: "untagged",
                name: "No Tags",
                count: untaggedCount,
                avgValue: untaggedCount > 0 ? Math.round(untaggedSpend / untaggedCount / 100) : 0,
                customerIds: untaggedIds,
                color: "from-gray-400 to-gray-500",
                bgColor: "bg-gray-50",
                textColor: "text-gray-600",
            });
        }

        // Sort by count (descending)
        audienceGroups.sort((a, b) => b.count - a.count);

        // Fetch custom segments for this merchant
        const { data: customSegments } = await supabase
            .from("customer_segments")
            .select("id, name, customer_ids")
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: false });

        // Add custom segments to audience groups with distinct styling
        if (customSegments && customSegments.length > 0) {
            for (const segment of customSegments) {
                const customerIds = segment.customer_ids || [];

                // Calculate average spend for customers in this segment
                const segmentCustomers = customers.filter(c => customerIds.includes(c.id));
                const totalSpend = segmentCustomers.reduce((sum, c) => sum + (c.total_spend_cents || 0), 0);
                const avgSpend = segmentCustomers.length > 0 ? Math.round(totalSpend / segmentCustomers.length / 100) : 0;

                audienceGroups.push({
                    id: `custom_${segment.id}`,
                    name: segment.name,
                    count: customerIds.length,
                    avgValue: avgSpend,
                    customerIds: customerIds,
                    color: "from-blue-500 to-indigo-600",
                    bgColor: "bg-blue-50",
                    textColor: "text-blue-700",
                });
            }
        }

        // Get all unique tags for reference
        const allTags = Object.keys(tagGroups).sort();

        // Fetch past campaigns
        const { data: campaigns } = await supabase
            .from("sms_campaigns")
            .select("id, name, message_body, audience, recipient_count, status, created_at")
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: false })
            .limit(10);

        const pastBroadcasts = (campaigns || []).map(c => ({
            id: c.id,
            name: c.name || "Untitled Broadcast",
            message: c.message_body || "",
            audience: c.audience || "All",
            recipientCount: c.recipient_count || 0,
            status: c.status || "sent",
            sentAt: c.created_at,
        }));

        // Fetch automations (workflows) for this merchant
        const { data: automations } = await supabase
            .from("automations")
            .select("id, type, is_active, config")
            .eq("merchant_id", merchantId);

        // Fetch automation logs from the past week for stats
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data: automationLogs } = await supabase
            .from("automation_logs")
            .select("action_type, status, created_at")
            .eq("merchant_id", merchantId)
            .gte("created_at", oneWeekAgo.toISOString());

        // Calculate stats per workflow type
        const workflowStats: Record<string, number> = {};
        for (const log of (automationLogs || [])) {
            const type = log.action_type;
            if (log.status === "success") {
                workflowStats[type] = (workflowStats[type] || 0) + 1;
            }
        }

        // Build workflow data
        const workflows = (automations || []).map(a => ({
            id: a.type,
            type: a.type,
            isActive: a.is_active || false,
            config: a.config || {},
            weeklyCount: workflowStats[a.type] || 0,
        }));

        // Calculate total automation value (estimate $150 per successful automation)
        const totalWeeklyValue = Object.values(workflowStats).reduce((sum, count) => sum + count * 150, 0);

        return NextResponse.json({
            audienceGroups,
            totalCustomers: customers.length,
            allTags,
            businessName,
            pastBroadcasts,
            workflows,
            workflowStats,
            totalWeeklyValue,
        });

    } catch (error: any) {
        console.error("Outreach API error:", error);
        return NextResponse.json({ error: "Failed to fetch outreach data" }, { status: 500 });
    }
}
