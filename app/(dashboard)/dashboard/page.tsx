import Link from "next/link";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ShieldCheck,
    AlertCircle,
    MousePointerClick,
    ArrowUpRight,
    Phone,
    MessageSquare,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { getMerchantId } from "@/lib/auth-helpers";
import { getDashboardData } from "@/app/actions/dashboard";
import { DashboardClient } from "./dashboard-client";

import { headers } from "next/headers";

export default async function DashboardPage() {
    const headersList = await headers();
    const isDemo = headersList.get("x-demo-mode") === "true";

    let data;

    if (isDemo) {
        // In demo mode, provide empty shell data - client component will use useDemo() data
        data = {
            serviceDesk: { conversations: 0, unread: 0 },
            pipeline: { deals: 0, customers: 0 },
            performance: { calls: 0, messages: 0 },
            knowledgeBase: { articles: 0 },
            tickets: { open: 0 },
            chartData: []
        };
    } else {
        const merchantId = await getMerchantId();
        data = await getDashboardData(merchantId);
    }

    return <DashboardClient data={data} />;
}