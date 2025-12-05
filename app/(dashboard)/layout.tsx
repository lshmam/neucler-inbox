import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. Initialize Supabase Client
    const supabase = await createClient();

    // 2. Check if the user is actually logged in
    const { data: { user }, error } = await supabase.auth.getUser();

    // If no user, send them to login
    if (error || !user) {
        redirect("/login");
    }

    // 3. Fetch Merchant Details
    // We query by 'id' (which matches the User ID now)
    const { data: merchant } = await supabase
        .from("merchants")
        .select("business_name, platform_merchant_id")
        .eq("id", user.id)
        .single();

    // Safety Net: If they are logged in but have no merchant data, send to onboarding
    if (!merchant) {
        redirect("/onboarding");
    }

    // 4. Fetch Branding from Business Profile
    // We use the 'platform_merchant_id' we just found to look up the profile
    const { data: profile } = await supabase
        .from("business_profiles")
        .select("logo_url, brand_color")
        .eq("merchant_id", merchant.platform_merchant_id)
        .single();

    const branding = {
        name: merchant.business_name || "My Business",
        logo: profile?.logo_url || null,
        color: profile?.brand_color || "#ffffff"
    };

    return (
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80]">
                <Sidebar branding={branding} />
            </div>
            {/* Dynamic padding logic */}
            <main className="md:pl-20 lg:pl-64 h-full bg-slate-50 transition-all duration-300" id="main-content">
                {children}
            </main>
        </div>
    );
}