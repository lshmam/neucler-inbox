import { redirect } from "next/navigation";
import { CustomersClient } from "./client"; // Your beautiful client component
import { createClient } from "@/lib/supabase-server";

export default async function CustomersPage() {
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