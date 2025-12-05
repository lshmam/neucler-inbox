import { supabaseAdmin } from "@/lib/supabase";

const IS_SANDBOX = process.env.SQUARE_ENVIRONMENT === "sandbox";
const BASE_URL = IS_SANDBOX
    ? "https://connect.squareupsandbox.com/v2"
    : "https://connect.squareup.com/v2";


const OAUTH_BASE_URL = IS_SANDBOX
    ? "https://connect.squareupsandbox.com/oauth2/authorize"
    : "https://connect.squareup.com/oauth2/authorize";



// CRITICAL: Keep this list static. Changing it triggers the Permission Screen again.
export const SQUARE_SCOPES = [
    "MERCHANT_PROFILE_READ",
    "CUSTOMERS_READ",
    "CUSTOMERS_WRITE",
    "ORDERS_READ",
    "ITEMS_READ",
    "LOYALTY_READ",
    "LOYALTY_WRITE"
];

// 2. HELPER: Generate the Login URL
export function getAuthUrl() {
    const clientId = process.env.SQUARE_APP_ID;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL; // e.g. https://Neucler.com
    const redirectUri = `${baseUrl}/square/callback`;

    // Use URLSearchParams to handle encoding automatically (spaces -> %20)
    const params = new URLSearchParams({
        client_id: clientId!,
        scope: SQUARE_SCOPES.join(" "),
        redirect_uri: redirectUri,
        // 'state' is optional but good for security. You can add a random string here if needed.
    });

    return `${OAUTH_BASE_URL}?${params.toString()}`;
}


// --- 2. Sync Customers from Square to Supabase ---
export async function syncCustomers(merchantId: string, accessToken: string) {
    console.log("🔄 Syncing Square Customers for:", merchantId);

    try {
        const res = await fetch(`${BASE_URL}/customers`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(`Square API Error: ${JSON.stringify(errorData)}`);
        }

        const data = await res.json();
        const squareCustomers = data.customers || [];

        if (squareCustomers.length === 0) return 0;

        // Map Square data to our Supabase Schema
        const customersToUpsert = squareCustomers.map((c: any) => ({
            id: c.id,
            merchant_id: merchantId, // Links to merchants.platform_merchant_id
            first_name: c.given_name || "",
            last_name: c.family_name || "",
            email: c.email_address || null,
            phone_number: c.phone_number || null,
            total_spend_cents: 0, // We can enhance this later with an Orders sync
            visit_count: 1,
        }));

        // Upsert to Supabase (Update if exists, Insert if new)
        const { error } = await supabaseAdmin
            .from("customers")
            .upsert(customersToUpsert, { onConflict: "id, merchant_id" });

        if (error) {
            console.error("Supabase Upsert Error:", error);
            throw error;
        }

        return customersToUpsert.length;
    } catch (error) {
        console.error("❌ Sync failed:", error);
        throw error;
    }
}

// --- 3. Get Real Daily Revenue & Stats ---
export async function getDailyStats(merchantId: string, accessToken: string) {
    try {
        // Step A: We need a Location ID to search orders. 
        // Square transactions are tied to locations, not just the merchant.
        const locationRes = await fetch(`${BASE_URL}/locations`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            next: { revalidate: 3600 }, // Cache location ID for 1 hour
        });

        const locData = await locationRes.json();
        // Grab the first active location (most single-location businesses)
        const locationId = locData.locations?.find((l: any) => l.status === "ACTIVE")?.id;

        if (!locationId) {
            console.warn("⚠️ No active location found for this merchant.");
            return { total: "0.00", count: 0 };
        }

        // Step B: Calculate Start of Day (UTC)
        // In a polished app, you'd use the merchant's timezone from locData.timezone
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        // Step C: Search Orders
        const ordersRes = await fetch(`${BASE_URL}/orders/search`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                location_ids: [locationId],
                query: {
                    filter: {
                        date_time_filter: {
                            created_at: {
                                start_at: startOfDay.toISOString() // e.g., 2023-10-27T00:00:00Z
                            }
                        },
                        state_filter: {
                            states: ["COMPLETED"] // Only count actual sales, not open tickets
                        }
                    }
                }
            }),
            cache: "no-store",
        });

        if (!ordersRes.ok) {
            console.error("❌ Failed to search orders:", await ordersRes.text());
            return { total: "0.00", count: 0 };
        }

        const ordersData = await ordersRes.json();
        const orders = ordersData.orders || [];

        // Step D: Calculate Totals
        let totalCents = 0;

        orders.forEach((order: any) => {
            // Square returns money objects: { amount: 100, currency: "USD" }
            if (order.total_money?.amount) {
                totalCents += Number(order.total_money.amount);
            }
        });

        return {
            total: (totalCents / 100).toFixed(2), // Convert 1250 cents -> "12.50"
            count: orders.length
        };

    } catch (error) {
        console.error("❌ Error fetching daily stats:", error);
        return { total: "0.00", count: 0 };
    }
}

// 1. GET FULL LOCATION DETAILS (Hours, Address, Phone)
export async function getPrimaryLocation(accessToken: string) {
    try {
        const res = await fetch(`${BASE_URL}/locations`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            next: { revalidate: 3600 },
        });

        const data = await res.json();
        // Get the first active location
        const location = data.locations?.find((l: any) => l.status === "ACTIVE");

        if (!location) return null;

        return {
            id: location.id,
            name: location.name,
            address: location.address ?
                `${location.address.address_line_1}, ${location.address.locality}` : "",
            phone: location.phone_number || "",
            website: location.website_url || "",
            timezone: location.timezone || "UTC",
            // Square hours format: { periods: [ { start_local_time: "09:00", end_local_time: "17:00", day_of_week: "MON" } ] }
            raw_hours: location.business_hours?.periods || []
        };
    } catch (error) {
        console.error("Square Location Fetch Error:", error);
        return null;
    }
}

// 2. GET SERVICE MENU (Catalog)
export async function getCatalogSummary(accessToken: string) {
    try {
        const res = await fetch(`${BASE_URL}/catalog/list?types=ITEM,CATEGORY`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            next: { revalidate: 3600 },
        });

        const data = await res.json();
        const items = data.objects || [];

        // Filter for top 20 items to keep the prompt concise
        const services = items
            .filter((i: any) => i.type === "ITEM" && !i.is_deleted)
            .slice(0, 20)
            .map((i: any) => {
                const name = i.item_data.name;
                // Square pricing is complex (variations), grabbing the first variation price
                const priceMoney = i.item_data.variations?.[0]?.item_variation_data?.price_money;
                const price = priceMoney ? `$${(Number(priceMoney.amount) / 100).toFixed(2)}` : "Varies";
                return `- ${name}: ${price}`;
            })
            .join("\n");

        return services || ""; // Returns a string like "- Haircut: $50.00\n- Color: $120.00"
    } catch (error) {
        console.error("Square Catalog Fetch Error:", error);
        return "";
    }
}

export async function getCustomerFromOrder(orderId: string, accessToken: string) {
    try {
        // 1. Get Order to find Customer ID
        const orderRes = await fetch(`${BASE_URL}/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
        });

        if (!orderRes.ok) return null;
        const orderData = await orderRes.json();
        const customerId = orderData.order?.customer_id;

        if (!customerId) return null; // Guest checkout (no phone number)

        // 2. Get Customer Profile to find Phone Number
        const customerRes = await fetch(`${BASE_URL}/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
        });

        if (!customerRes.ok) return null;
        const customerData = await customerRes.json();

        return {
            id: customerData.customer.id,
            firstName: customerData.customer.given_name,
            phoneNumber: customerData.customer.phone_number
        };

    } catch (error) {
        console.error("Error fetching customer from order:", error);
        return null;
    }
}

export async function getMerchantInfo(accessToken: string) {
    try {
        const res = await fetch(`${BASE_URL}/merchants/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            next: { revalidate: 3600 },
        });

        if (!res.ok) return { name: "Square Merchant", logo: null };
        const data = await res.json();

        // Square returns the logo in the 'main_location' or the merchant object
        // Usually data.merchant.main_location_id -> fetch location -> logo_url
        // OR data.merchant.logo_url (if set at account level)

        // Attempt to find a logo in the response (Square API varies based on version/setup)
        // We will assume data.merchant.logo_url exists or return null
        return {
            name: data.merchant.business_name || "My Business",
            logo: data.merchant.logo_url || null
        };
    } catch (error) {
        return { name: "Square Merchant", logo: null };
    }
}