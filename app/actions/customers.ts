'use server'

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import crypto from 'crypto'; // Import Node.js crypto for UUID generation

interface CustomerData {
    first_name: string;
    last_name?: string; // Make optional if not always provided
    phone_number: string;
    email?: string;
    // tags?: string[]; // Remove if not in DB, or provide default
}

export async function createCustomer(merchantId: string, data: CustomerData) {
    const supabase = await createClient();

    // The RLS Debugging confirms IDs are matching, keep it for reference or remove it now.
    // const { data: { user } } = await supabase.auth.getUser();
    // console.log("--- RLS DEBUG ---");
    // console.log("Value passed to action (merchantId):", merchantId);
    // console.log("Value from session (auth.uid()):   ", user?.id);
    // console.log("Are they the same?", merchantId === user?.id);
    // console.log("-----------------");

    // Validate required fields
    if (!data.first_name || !data.phone_number) {
        return { success: false, error: "First name and phone number are required" };
    }

    try {
        // --- FIX IS HERE: Generate a unique ID ---
        const newCustomerId = crypto.randomUUID(); // Generate a new UUID for the customer ID
        // ------------------------------------------

        const { data: customer, error } = await supabase
            .from('customers')
            .insert({
                id: newCustomerId, // Assign the generated UUID to the id column
                merchant_id: merchantId,
                first_name: data.first_name,
                last_name: data.last_name || '', // Ensure last_name is not undefined
                phone_number: data.phone_number,
                email: data.email || null, // Ensure email is null, not undefined
                // If 'tags' column exists and is array, keep:
                // tags: data.tags || [],
                // If 'tags' column does NOT exist, REMOVE this line.
                // If it exists and is TEXT, change to: tags: JSON.stringify(data.tags || [])
                created_at: new Date().toISOString(),
                // Add other default values for NOT NULL columns if necessary
                total_spend_cents: 0,
                visit_count: 0,
                is_subscribed: true // Default to true if you added this column
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating customer:", error);
            return { success: false, error: `Supabase error: ${error.message}` };
        }

        revalidatePath('/customers');

        return { success: true, customer };
    } catch (error: any) {
        console.error("Catch block error:", error);
        return { success: false, error: error.message || "Failed to create customer" };
    }
}