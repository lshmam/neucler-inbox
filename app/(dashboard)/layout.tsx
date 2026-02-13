import { DashboardShell } from "@/components/DashboardShell";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. Initialize Supabase Client
    const supabase = await createClient();

    // 2. Check if the user is actually logged in
    const { data: { user }, error } = await supabase.auth.getUser();

    // Check for demo mode
    const headersList = await headers();
    const hostname = headersList.get("host") || "";
    const isDemoHeader = headersList.get("x-demo-mode") === "true";
    const demoIndustryHeader = headersList.get("x-demo-industry");

    // Check hostname for direct subdomains as fallback
    const isDemo = isDemoHeader || hostname.includes("demo") || hostname.includes("medspa") || hostname.includes("dental");
    const industry = demoIndustryHeader || (hostname.includes("medspa") ? "medspa" : hostname.includes("dental") ? "dental" : "auto");

    // If no user AND not demo, send them to login
    if ((error || !user) && !isDemo) {
        redirect("/login");
    }

    let merchant = null;
    let profile = null;
    let kbArticles: any[] = [];

    if (user) {
        // --- REAL USER LOGIC ---

        // 3. Fetch Merchant Details
        const { data: merchantData } = await supabase
            .from("merchants")
            .select("business_name, platform_merchant_id")
            .eq("id", user.id)
            .single();

        merchant = merchantData;

        // Safety Net: If they are logged in but have no merchant data, send to onboarding
        if (!merchant) {
            redirect("/onboarding");
        }

        // 4. Fetch Branding from Business Profile
        const { data: profileData } = await supabase
            .from("business_profiles")
            .select("logo_url, brand_color")
            .eq("merchant_id", merchant.platform_merchant_id)
            .single();

        profile = profileData;

        // 5. Fetch Knowledge Base Articles
        const { data: kbData } = await supabase
            .from("knowledge_base_articles")
            .select("id, title, content, category")
            .eq("merchant_id", user.id)
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(50);

        kbArticles = kbData || [];

    } else if (isDemo) {
        // --- DEMO MOCK LOGIC ---
        // Provide fake merchant data so the layout doesn't break
        const businessName = industry === "medspa" ? "Luxe MedSpa Demo" :
            industry === "dental" ? "Bright Smile Dental" : "Demo Enterprise";

        merchant = {
            business_name: businessName,
            platform_merchant_id: "demo_id"
        };

        profile = {
            logo_url: null,
            brand_color: "#000000"
        };

        kbArticles = [];
    }

    const branding = {
        name: merchant?.business_name || "My Business",
        logo: profile?.logo_url || null,
        color: profile?.brand_color || "#ffffff"
    };

    return (
        <DashboardShell branding={branding} knowledgeBaseArticles={kbArticles || []}>
            {children}
        </DashboardShell>
    );
}
