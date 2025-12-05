import { getMerchantId } from "@/lib/auth-helpers";
import { getAnalyticsData } from "@/app/actions/analytics";
import { AnalyticsCharts } from "@/components/analytics-charts";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import {
    Phone, Users, DollarSign, Clock, TrendingUp, Sparkles, Brain
} from "lucide-react";

export default async function AnalyticsPage() {
    const merchantId = await getMerchantId();

    // Fetch real data
    const data = await getAnalyticsData(merchantId);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Performance Analytics</h2>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">Last 30 Days</span>
                </div>
            </div>

            {/* TOP METRICS: THE "IMPACT" */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                {/* Metric 1: Labor Saved */}
                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-900">AI Labor Saved</CardTitle>
                        <Clock className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-700">{data.hoursSaved} Hours</div>
                        <p className="text-xs text-indigo-600/80">
                            ~${data.moneySaved} saved in wages
                        </p>
                    </CardContent>
                </Card>

                {/* Metric 2: Revenue */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.revenue}</div>
                        <p className="text-xs text-muted-foreground">
                            Processed via Square
                        </p>
                    </CardContent>
                </Card>

                {/* Metric 3: Leads */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Leads</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{data.newLeads}</div>
                        <p className="text-xs text-muted-foreground">
                            New customers added
                        </p>
                    </CardContent>
                </Card>

                {/* Metric 4: Call Volume */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Voice AI Traffic</CardTitle>
                        <Phone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalCalls} Calls</div>
                        <p className="text-xs text-muted-foreground">
                            Handled autonomously
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* CHARTS SECTION */}
            <AnalyticsCharts data={data} />

            {/* ROI / INSIGHTS CARD */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-7 bg-slate-950 text-white border-none shadow-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-400" />
                            AI Impact Report
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            How Neucler is growing your business compared to last month.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-6">
                        <div className="p-4 bg-white/10 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-green-400" />
                                <h4 className="font-semibold">Conversion Rate</h4>
                            </div>
                            <p className="text-2xl font-bold">4.8%</p>
                            <p className="text-xs text-slate-400">Calls converting to Bookings</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Brain className="h-4 w-4 text-purple-400" />
                                <h4 className="font-semibold">Knowledge Gap</h4>
                            </div>
                            <p className="text-2xl font-bold">2 Questions</p>
                            <p className="text-xs text-slate-400">AI failed to answer 2 times (Add to FAQ)</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-4 w-4 text-blue-400" />
                                <h4 className="font-semibold">Avg. Response</h4>
                            </div>
                            <p className="text-2xl font-bold">0.8s</p>
                            <p className="text-xs text-slate-400">Voice Latency</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}