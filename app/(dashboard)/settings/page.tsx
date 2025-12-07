import { getMerchantId } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getKnowledgeBaseData } from "@/app/actions/knowledge-base";
import { ArticlesManager } from "@/components/knowledge-base/articles-manager";
import { BusinessInfoManager } from "@/components/knowledge-base/business-info-manager";

export default async function SettingsPage() {
    const merchantId = await getMerchantId();

    // Fetch existing data for the General tab - use 'id' not 'platform_merchant_id'
    const { data: merchant } = await supabaseAdmin
        .from("merchants")
        .select("business_name")
        .eq("id", merchantId)
        .single();

    const { data: profile } = await supabaseAdmin
        .from("business_profiles")
        .select("*")
        .eq("merchant_id", merchantId)
        .single();

    // Fetch data for the Knowledge Base tab
    const kbData = await getKnowledgeBaseData();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            </div>

            <Tabs defaultValue="knowledge-base" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">Business Profile</TabsTrigger>
                    <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
                </TabsList>

                {/* TAB 1: General Business Settings */}
                <TabsContent value="general" className="space-y-4">
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Business Configuration</CardTitle>
                                    <CardDescription>
                                        General settings for your business profile.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground p-4 bg-slate-50 rounded border">
                                        Configuration forms will appear here in future updates.
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Account</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Business Name</p>
                                        <p className="text-sm text-muted-foreground">{merchant?.business_name || "Not set"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Merchant ID</p>
                                        <p className="text-xs font-mono bg-muted p-1 rounded">{merchantId}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 2: Knowledge Base */}
                <TabsContent value="knowledge-base" className="space-y-4">
                    <div className="grid gap-6">
                        {/* 1. Business Identity & Hours */}
                        <BusinessInfoManager
                            initialServices={kbData.services_summary}
                            initialHours={kbData.business_hours}
                            initialTone={kbData.ai_tone}
                            initialAiName={kbData.ai_name}
                        />

                        {/* 2. Articles Management */}
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">Knowledge & Services</h3>
                            <p className="text-sm text-muted-foreground">
                                Add Q&A articles, services, and policies. The AI uses these to answer customer questions accurately.
                            </p>
                            <ArticlesManager initialArticles={kbData.articles} />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}