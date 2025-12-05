import { getMerchantId } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { LoyaltySetupWizard } from "./setup-wizard";
import { CustomerPointsTable } from "./customer-table";
import { ProgramSettings } from "./program-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, TrendingUp, Plus, ArrowRight } from "lucide-react";

export default async function LoyaltyPage({ searchParams }: { searchParams: { prog?: string, action?: string } }) {
    const merchantId = await getMerchantId();

    const { prog: selectedProgramId, action } = await searchParams;

    // 1. Fetch ALL Active Programs
    const { data: activePrograms } = await supabaseAdmin
        .from("loyalty_programs")
        .select("*, loyalty_rewards(*)")
        .eq("merchant_id", merchantId)
        .eq("status", "active")
        .order("created_at", { ascending: true });

    const programs = activePrograms || [];

    // --- CASE 1: CREATE NEW MODE ---
    // Renders if action=new OR if there are absolutely no programs
    if (action === "new" || programs.length === 0) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <LoyaltySetupWizard merchantId={merchantId} hasExisting={programs.length > 0} />
            </div>
        );
    }

    // --- CASE 2: DASHBOARD MODE ---
    const currentProgram = selectedProgramId
        ? programs.find(p => p.id === selectedProgramId) || programs[0]
        : programs[0];

    const { data: balances } = await supabaseAdmin
        .from("loyalty_balances")
        .select("customer_id, balance")
        .eq("program_id", currentProgram.id);

    const { data: allCustomers } = await supabaseAdmin
        .from("customers")
        .select("id, first_name, last_name, email, phone_number")
        .eq("merchant_id", merchantId);

    const customersWithBalance = allCustomers?.map(c => {
        const bal = balances?.find(b => b.customer_id === c.id);
        return { ...c, loyalty_balance: bal?.balance || 0 };
    }) || [];

    const { data: history } = await supabaseAdmin
        .from("loyalty_programs")
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("status", "archived");

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Loyalty Dashboard</h2>
                    <p className="text-muted-foreground">Manage your {programs.length} active program{programs.length !== 1 ? 's' : ''}.</p>
                </div>
                {/* HEADER BUTTON */}
                <Button asChild>
                    <a href="/loyalty?action=new"><Plus className="mr-2 h-4 w-4" /> New Program</a>
                </Button>
            </div>

            <Tabs defaultValue={currentProgram.id} className="space-y-4">
                <div className="overflow-x-auto pb-2">
                    <TabsList>
                        {programs.map((prog) => (
                            <TabsTrigger key={prog.id} value={prog.id} asChild>
                                <a href={`/loyalty?prog=${prog.id}`}>
                                    {prog.terminology} Program
                                </a>
                            </TabsTrigger>
                        ))}
                        {/* TAB TRIGGER FOR NEW PROGRAM (Visual cue) */}
                        <TabsTrigger value="new-trigger" asChild>
                            <a href="/loyalty?action=new" className="text-muted-foreground hover:text-foreground">
                                <Plus className="h-3 w-3 mr-1" /> Add
                            </a>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value={currentProgram.id} className="space-y-4">

                    {/* OVERVIEW STATS */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Participants</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{balances?.length || 0}</div>
                                <p className="text-xs text-muted-foreground">With active balance</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Rewards</CardTitle>
                                <Trophy className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{currentProgram.loyalty_rewards.length}</div>
                                <p className="text-xs text-muted-foreground">Redeemable options</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Structure</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold capitalize">{currentProgram.accrual_type.replace('_', ' ')}</div>
                                <p className="text-xs text-muted-foreground">Earning rule</p>
                            </CardContent>
                        </Card>

                        {/* THE CARD YOU ASKED FOR: ADD NEW PROGRAM BUTTON IN OVERVIEW */}
                        <Card className="bg-muted/30 border-dashed hover:bg-muted/50 transition-colors cursor-pointer">
                            <a href="/loyalty?action=new" className="block h-full w-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-primary">New Strategy?</CardTitle>
                                    <Plus className="h-4 w-4 text-primary" />
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="flex items-center text-primary font-medium">
                                        Create another program <ArrowRight className="ml-2 h-4 w-4" />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Run multiple programs at once</p>
                                </CardContent>
                            </a>
                        </Card>
                    </div>

                    {/* DETAILED TABS */}
                    <Tabs defaultValue="customers" className="mt-6">
                        <TabsList>
                            <TabsTrigger value="customers">Customers & Points</TabsTrigger>
                            <TabsTrigger value="settings">Program Settings</TabsTrigger>
                        </TabsList>

                        <TabsContent value="customers" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Member Database</CardTitle>
                                    <CardDescription>
                                        Managing points for: <span className="font-semibold text-primary">{currentProgram.terminology}</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CustomerPointsTable
                                        customers={customersWithBalance}
                                        merchantId={merchantId}
                                        terminology={currentProgram.terminology}
                                        programId={currentProgram.id}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="settings" className="mt-4">
                            <ProgramSettings
                                programId={currentProgram.id}
                                history={history || []}
                            />
                        </TabsContent>
                    </Tabs>

                </TabsContent>
            </Tabs>
        </div>
    );
}