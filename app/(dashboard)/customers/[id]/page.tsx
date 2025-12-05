import { supabaseAdmin } from "@/lib/supabase";
import {
    Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Phone,
    Mail,
    MessageCircle,
    Star,
    Sparkles,
    CreditCard,
    MapPin,
    MoreHorizontal,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    ShoppingBag
} from "lucide-react";
import Link from "next/link";

// Helper to get initials
const getInitials = (first: string | null, last: string | null) => {
    const f = first?.charAt(0) || "";
    const l = last?.charAt(0) || "";
    return (f + l).toUpperCase() || "CX";
};

// Helper to format currency
const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(cents / 100);
};

export default async function CustomerProfilePage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;

    const { data: c, error } = await supabaseAdmin
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !c) {
        return <div>Customer not found</div>;
    }

    // Metrics
    const totalSpend = c.total_spend_cents || 0;
    const visitCount = c.visit_count || 0;
    const averageOrderValue = visitCount > 0 ? totalSpend / visitCount : 0;
    const loyaltyPoints = Math.floor(totalSpend / 100);

    // Risk Logic
    const lastVisit = c.last_visit_date ? new Date(c.last_visit_date) : null;
    const daysSinceVisit = lastVisit
        ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    let riskLevel = "Low";
    let riskColor = "text-green-700 bg-green-50 border-green-200";
    if (daysSinceVisit > 60) {
        riskLevel = "High";
        riskColor = "text-red-700 bg-red-50 border-red-200";
    } else if (daysSinceVisit > 30) {
        riskLevel = "Medium";
        riskColor = "text-yellow-700 bg-yellow-50 border-yellow-200";
    }

    return (
        <div className="flex-1 bg-gray-50/50 min-h-screen flex flex-col">

            {/* --- 1. TOP NAVIGATION & PAGINATION --- */}
            <div className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                        <Link href="/customers">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Customers
                        </Link>
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-2">Customer 4 of 58</span>
                    <div className="flex items-center border rounded-md bg-white">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none border-r" disabled>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto w-full space-y-8">

                {/* --- 2. IMPROVED PROFILE HEADER --- */}
                <Card className="overflow-hidden border-none shadow-md bg-white relative">
                    {/* Banner Background with Gradient/Pattern */}
                    <div className="h-40 bg-gradient-to-r from-slate-900 via-[#2d1b4e] to-slate-900 w-full relative">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                        {/* Top Right Actions on Banner */}
                        <div className="absolute top-6 right-6 flex gap-2">
                            <Button size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="px-8 pb-8">
                        <div className="flex flex-col md:flex-row gap-6 items-start">

                            {/* Avatar - Overlapping the Banner */}
                            <div className="-mt-14 relative">
                                <Avatar className="h-28 w-28 border-[5px] border-white shadow-lg bg-white">
                                    <AvatarFallback className="bg-[#906CDD] text-white text-3xl font-bold">
                                        {getInitials(c.first_name, c.last_name)}
                                    </AvatarFallback>
                                </Avatar>
                                {/* VIP Badge Positioned on Avatar */}
                                {totalSpend > 50000 && (
                                    <div className="absolute -bottom-2 -right-2 bg-amber-400 text-amber-950 text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-sm">
                                        VIP
                                    </div>
                                )}
                            </div>

                            {/* Customer Info Section */}
                            <div className="flex-1 pt-3 min-w-0">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900 truncate">
                                            {c.first_name} {c.last_name}
                                        </h1>
                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-muted-foreground mt-1">
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5" />
                                                {c.phone_number || "No Phone"}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="h-3.5 w-3.5" />
                                                {c.email || "No Email"}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5" />
                                                San Francisco, CA
                                            </div>
                                        </div>
                                    </div>

                                    {/* Primary Actions */}
                                    <div className="flex items-center gap-3 mt-2 md:mt-0">
                                        <Button variant="outline" className="h-10 shadow-sm">
                                            <Phone className="h-4 w-4 mr-2" /> Call
                                        </Button>
                                        <Button className="h-10 bg-[#906CDD] hover:bg-[#7a5bb5] shadow-md shadow-purple-100">
                                            <MessageCircle className="h-4 w-4 mr-2" /> Send Message
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* --- 3. STATS GRID (Horizontal Layout) --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">LTV (Total Spend)</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Visits</CardTitle>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold">{visitCount}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order</CardTitle>
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold">{formatCurrency(averageOrderValue)}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Loyalty Balance</CardTitle>
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold">{loyaltyPoints} <span className="text-sm font-normal text-muted-foreground">pts</span></div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- 4. MAIN CONTENT (AI + TABS) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: AI INSIGHTS */}
                    <div className="space-y-6">
                        <Card className="border-l-4 border-l-[#906CDD] shadow-md">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-[#906CDD]">
                                        <Sparkles className="h-5 w-5" /> AI Analysis
                                    </CardTitle>
                                    <Badge variant="outline" className={`${riskColor} border shadow-sm`}>
                                        {riskLevel} Risk
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed">
                                    <strong>Strategy:</strong> {c.first_name} is a high-value client.
                                    {daysSinceVisit > 45
                                        ? " Their activity has dropped. We recommend an immediate win-back offer."
                                        : " Their behavior is consistent. Upsell 'Add-on' services next visit."}
                                </div>

                                {daysSinceVisit > 45 && (
                                    <Button className="w-full bg-white border border-[#906CDD] text-[#906CDD] hover:bg-purple-50 shadow-sm">
                                        Generate Win-Back Offer
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Customer Attributes</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Joined</span>
                                    <span>Oct 12, 2023</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Preferred Staff</span>
                                    <span>Sarah J.</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Segments</span>
                                    <div className="flex gap-1">
                                        <Badge variant="secondary" className="text-xs">Local</Badge>
                                        <Badge variant="secondary" className="text-xs">Gel User</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: TABS */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="activity" className="w-full">
                            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
                                <TabsTrigger
                                    value="activity"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#906CDD] data-[state=active]:text-[#906CDD] px-6 py-3"
                                >
                                    Activity Log
                                </TabsTrigger>
                                <TabsTrigger
                                    value="transactions"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#906CDD] data-[state=active]:text-[#906CDD] px-6 py-3"
                                >
                                    Transactions
                                </TabsTrigger>
                                <TabsTrigger
                                    value="notes"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#906CDD] data-[state=active]:text-[#906CDD] px-6 py-3"
                                >
                                    Notes
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB CONTENT */}
                            <TabsContent value="activity">
                                <Card className="border-none shadow-none bg-transparent">
                                    <div className="space-y-8 pl-2 pt-2">
                                        {/* Timeline Item 1 */}
                                        <div className="flex gap-4 relative group">
                                            <div className="absolute left-[19px] top-8 bottom-[-32px] w-0.5 bg-gray-200 group-last:hidden"></div>
                                            <div className="relative z-10 h-10 w-10 rounded-full bg-white border-2 border-blue-100 flex items-center justify-center shrink-0 text-blue-600 shadow-sm">
                                                <MessageSquare className="h-5 w-5" />
                                            </div>
                                            <div className="pt-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-gray-900">Received "Monthly Special" SMS</p>
                                                    <Badge variant="secondary" className="text-[10px] h-5 bg-green-100 text-green-700 hover:bg-green-100">Delivered</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Yesterday at 2:30 PM</p>
                                                <div className="text-sm text-gray-600 bg-white p-3 rounded-md mt-2 border shadow-sm">
                                                    "Hey {c.first_name}! It's been a while. Come in this week for 10% off."
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timeline Item 2 */}
                                        <div className="flex gap-4 relative group">
                                            <div className="relative z-10 h-10 w-10 rounded-full bg-white border-2 border-purple-100 flex items-center justify-center shrink-0 text-purple-600 shadow-sm">
                                                <ShoppingBag className="h-5 w-5" />
                                            </div>
                                            <div className="pt-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-gray-900">Visit Completed</p>
                                                    <span className="text-sm font-bold text-gray-900">$65.00</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Oct 12, 2024 • 10:30 AM</p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* Other tabs placeholders */}
                            <TabsContent value="transactions">
                                <Card className="bg-gray-50 border-dashed border-2">
                                    <CardContent className="py-12 text-center text-muted-foreground">
                                        Syncing transaction history...
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="notes">
                                <Card className="bg-gray-50 border-dashed border-2">
                                    <CardContent className="py-12 text-center text-muted-foreground">
                                        No notes added yet.
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}