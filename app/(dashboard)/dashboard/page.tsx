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

export default async function DashboardPage() {
    const merchantId = await getMerchantId();
    const data = await getDashboardData(merchantId);

    return <DashboardClient data={data} />;
}