import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CustomersClient } from "./client"; // Your beautiful client component
import { createClient } from "@/lib/supabase-server";
import { getDemoCustomers } from "@/lib/demo-server-helpers";
import { Industry } from "@/lib/demo-data";

export default async function CustomersPage() {
    const headersList = await headers();
    const isDemo = headersList.get("x-demo-mode") === "true";
    const demoIndustry = (headersList.get("x-demo-industry") || "auto") as Industry;

    if (isDemo) {
        const demoCustomers = getDemoCustomers(demoIndustry);
        return (
            <CustomersClient
                initialCustomers={demoCustomers}
                merchantId="demo-merchant-id"
            />
        );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // The user's ID is the merchant ID
    const merchantId = user.id;

    // Fetch customers belonging to this merchant
    const { data: customers } = await supabase
        .from("customers")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });

    // Pass the real data to the client component
    return (
        <CustomersClient
            initialCustomers={customers || []}
            merchantId={merchantId}
        />
    );
}