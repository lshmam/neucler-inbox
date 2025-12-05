import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server"; // <--- Use this instead of supabaseAdmin for auth
import { supabaseAdmin } from "@/lib/supabase"; // Keep this for data fetching if you prefer
import { getMerchantInfo, getDailyStats } from "@/lib/square";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    DollarSign,
    Users,
    Mic,
    MessageSquare,
    Bot,
    Globe,
    Mail,
    ArrowRight,
    CheckCircle2,
    Activity,
    TrendingUp
} from "lucide-react";
import { SyncButton } from "@/components/SyncButton";

export default async function DashboardPage() {
    // 1. Initialize Supabase Client
    const supabase = await createClient();

    // 2. Check Auth (Supabase Session)
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect("/login");

    // 3. Fetch Core Merchant Data using the User ID
    const { data: merchant } = await supabase
        .from("merchants")
        .select("id, platform_merchant_id, access_token, business_name")
        .eq("id", user.id) // Match Auth ID
        .single();

    // Safety: If logged in but no merchant row, send to onboarding
    if (!merchant) redirect("/onboarding");

    // Define the ID used for Foreign Keys in other tables
    const merchantId = merchant.platform_merchant_id;
    const hasSquareConnection = merchant.access_token && merchant.access_token !== "pending_generation";

    // 4. Fetch EVERYTHING in Parallel
    const [
        squareStats,
        customerCount,
        agents,
        automations,
        widgets,
        campaigns,
        recentMessages
    ] = await Promise.all([
        // A. Revenue (Handle case where Square isn't connected yet)
        hasSquareConnection
            ? getDailyStats(merchantId, merchant.access_token)
            : Promise.resolve({ total: "0.00", count: 0 }),

        // B. Customers
        supabaseAdmin.from("customers").select("*", { count: "exact", head: true }).eq("merchant_id", merchantId),

        // C. Voice Agents
        supabaseAdmin.from("ai_agents").select("*").eq("merchant_id", merchantId),

        // D. Automations (SMS)
        supabaseAdmin.from("automations").select("*").eq("merchant_id", merchantId).eq("is_active", true),

        // E. Web Widget
        supabaseAdmin.from("web_widgets").select("*").eq("merchant_id", merchantId),

        // F. Email Campaigns
        supabaseAdmin.from("email_campaigns").select("*", { count: "exact", head: true }).eq("merchant_id", merchantId),

        // G. Recent Activity Log
        supabaseAdmin.from("messages").select("*").eq("merchant_id", merchantId).order('created_at', { ascending: false }).limit(5)
    ]);

    // 5. Calculate Setup Status
    const hasVoice = agents.data && agents.data.length > 0 && agents.data[0].phone_number;
    const hasSMS = automations.data && automations.data.length > 0;
    const hasWidget = widgets.data && widgets.data.length > 0;
    const hasEmail = campaigns.count ? campaigns.count > 0 : false;

    const checklist = [
        {
            id: "voice",
            label: "Deploy AI Voice Agent",
            desc: "Get a phone number and train your receptionist.",
            link: "/ai-agent?action=new",
            done: hasVoice,
            icon: Mic,
            color: "text-orange-500"
        },
        {
            id: "sms",
            label: "Enable SMS Automations",
            desc: "Turn on Missed Call Text Back or Review Booster.",
            link: "/automations",
            done: hasSMS,
            icon: MessageSquare,
            color: "text-green-500"
        },
        {
            id: "widget",
            label: "Install Chat Widget",
            desc: "Customize and embed the chat bubble on your site.",
            link: "/site-widgets",
            done: hasWidget,
            icon: Globe,
            color: "text-indigo-500"
        },
        {
            id: "email",
            label: "Send First Email Blast",
            desc: "Create and send a newsletter to your customers.",
            link: "/email/new",
            done: hasEmail,
            icon: Mail,
            color: "text-blue-500"
        }
    ];

    const completedSteps = checklist.filter(i => i.done).length;
    const progressPercent = (completedSteps / 4) * 100;
    const isFullySetup = progressPercent === 100;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">

            {/* HEADER */}
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        Dashboard
                    </h2>
                    <p className="text-muted-foreground">
                        Overview for <strong>{merchant.business_name}</strong>
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    {/* Only show Sync button if Square is connected */}
                    {hasSquareConnection && <SyncButton />}
                </div>
            </div>

            {/* TOP ROW: REAL-TIME STATS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${squareStats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {hasSquareConnection ? `${squareStats.count} orders via Square` : "Connect Square to see orders"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customerCount.count || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Synced Database
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Automations</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{automations.data?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Workflows running
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Agent Status</CardTitle>
                        <Mic className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {hasVoice ? "Online" : "Offline"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {hasVoice ? agents.data?.[0]?.phone_number : "Setup Required"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* DYNAMIC SECTION (Checklist or Feed) */}
            {!isFullySetup && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-7 bg-slate-50 border-blue-100">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl text-blue-900">Get Started Guide</CardTitle>
                                    <CardDescription>Complete these steps to fully automate your business.</CardDescription>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-blue-900">{Math.round(progressPercent)}%</span>
                                </div>
                            </div>
                            <Progress value={progressPercent} className="h-2 mt-2 bg-blue-200" />
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4">
                            {checklist.map((item) => (
                                <Link href={item.link} key={item.id}>
                                    <div className={`
                                        relative flex flex-col justify-between h-full p-4 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer bg-white
                                        ${item.done ? 'border-green-100 opacity-80' : 'border-slate-200 hover:border-blue-300 shadow-sm'}
                                    `}>
                                        {item.done && (
                                            <div className="absolute top-3 right-3 text-green-500">
                                                <CheckCircle2 className="h-6 w-6" />
                                            </div>
                                        )}

                                        <div className={`p-3 rounded-full w-fit mb-3 ${item.done ? 'bg-green-50' : 'bg-slate-100'}`}>
                                            <item.icon className={`h-6 w-6 ${item.done ? 'text-green-600' : item.color}`} />
                                        </div>

                                        <div>
                                            <h4 className={`font-semibold ${item.done ? 'text-green-800' : 'text-slate-900'}`}>
                                                {item.label}
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-1 leading-snug">
                                                {item.desc}
                                            </p>
                                        </div>

                                        {!item.done && (
                                            <div className="mt-4 flex items-center text-xs font-medium text-blue-600">
                                                Start Now <ArrowRight className="ml-1 h-3 w-3" />
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}

            {isFullySetup && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    {/* Activity Feed */}
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest AI interactions and messages.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentMessages.data?.map((msg) => (
                                    <div key={msg.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                                        <div className={`p-2 rounded-full ${msg.direction === 'inbound' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                            {msg.direction === 'inbound' ? <Users className="h-4 w-4 text-blue-600" /> : <Bot className="h-4 w-4 text-green-600" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">
                                                {msg.direction === 'inbound' ? `Customer (${msg.customer_phone})` : "AI Agent"}
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{msg.body}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                {new Date(msg.created_at).toLocaleTimeString()} • {new Date(msg.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {(!recentMessages.data || recentMessages.data.length === 0) && (
                                    <div className="text-center text-muted-foreground text-sm py-8">
                                        No activity yet. Waiting for calls or texts...
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ROI Card */}
                    <Card className="col-span-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-400" />
                                AI Performance
                            </CardTitle>
                            <CardDescription className="text-slate-400">Estimated value generated this month.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-sm opacity-80">Calls Handled</span>
                                <span className="text-xl font-bold">0</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm opacity-80">Reviews Generated</span>
                                <span className="text-xl font-bold">0</span>
                            </div>
                            <div className="pt-4 border-t border-slate-700">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-slate-400">Est. Savings</p>
                                        <p className="text-3xl font-bold text-green-400">$0.00</p>
                                    </div>
                                    <Button variant="secondary" size="sm" asChild>
                                        <Link href="/analytics">Full Report</Link>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}