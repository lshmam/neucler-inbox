'use server'

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase"; // Import admin client
import { mg, DOMAIN } from "@/lib/mailgun";

// Define the shape of data coming from your form
interface OnboardingData {
    business_name: string;
    address: string;
    phone: string;
    website: string;
    business_hours: string[];
    services: string[];
    generated_articles: { title: string; content: string; category: string }[];
}

export async function saveOnboardingData(data: OnboardingData) {
    const supabase = await createClient();

    // 1. Get current logged-in user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    console.log("🔑 [Onboarding] Saving data for user:", user.id);

    // 2. Insert into MERCHANTS table (uses user.id as primary key)
    const { error: merchantError } = await supabaseAdmin
        .from('merchants')
        .upsert({
            id: user.id,
            platform_merchant_id: user.id, // Keep them the same for simplicity
            email: user.email,
            business_name: data.business_name,
            subscription_status: 'trialing',
            access_token: 'pending_generation'
        }, { onConflict: 'id' });

    if (merchantError) {
        console.error("Merchant Upsert Error:", merchantError);
        throw new Error("Failed to create merchant account");
    }
    console.log("✅ [Onboarding] Merchant created/updated");

    // 2b. Auto-create team_members owner record
    await supabaseAdmin
        .from('team_members')
        .upsert({
            merchant_id: user.id,
            user_id: user.id,
            role: 'owner'
        }, { onConflict: 'merchant_id,user_id' });
    console.log("✅ [Onboarding] Team owner record created");

    // 3. Insert into BUSINESS_PROFILES table
    // Using user.id as the merchant_id so dashboard can find it
    const { error: profileError } = await supabaseAdmin
        .from('business_profiles')
        .upsert({
            merchant_id: user.id, // <-- CRITICAL: Use user.id, not a generated ID
            address: data.address,
            phone: data.phone,
            website: data.website,
            business_hours: JSON.stringify(data.business_hours),
            services_summary: data.services.join(', '),
            is_onboarding_completed: true
        }, { onConflict: 'merchant_id' });

    if (profileError) {
        console.error("Profile Upsert Error:", profileError);
        throw new Error("Failed to save business profile details");
    }
    console.log("✅ [Onboarding] Business profile created/updated");

    // 4. Insert Knowledge Base Articles (if any)
    if (data.generated_articles && data.generated_articles.length > 0) {
        const articlesToInsert = data.generated_articles.map(article => ({
            merchant_id: user.id, // <-- CRITICAL: Use user.id
            title: article.title,
            content: article.content,
            category: article.category,
            is_published: true
        }));

        const { error: articlesError } = await supabaseAdmin
            .from('knowledge_base_articles')
            .insert(articlesToInsert);

        if (articlesError) {
            console.error("Articles Insert Error:", articlesError);
            throw new Error(`Failed to save articles: ${articlesError.message}`);
        }
        console.log(`✅ [Onboarding] ${articlesToInsert.length} KB articles created`);
    }

    // 6. Send notification email to admin
    try {
        await mg.messages.create(DOMAIN!, {
            from: `Neucler <noreply@${DOMAIN}>`,
            to: ['ishmam.aminul@gmail.com'],
            subject: `🎉 New User Signup: ${data.business_name}`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px;">
                    <h2 style="color: #000;">New User Signed Up!</h2>
                    <p style="color: #333; font-size: 16px;">A new user has completed onboarding:</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666; font-weight: 500;">Business Name</td>
                            <td style="padding: 10px 0; color: #000;">${data.business_name}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666; font-weight: 500;">Email</td>
                            <td style="padding: 10px 0; color: #000;">${user.email}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666; font-weight: 500;">Phone</td>
                            <td style="padding: 10px 0; color: #000;">${data.phone || 'Not provided'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666; font-weight: 500;">Address</td>
                            <td style="padding: 10px 0; color: #000;">${data.address || 'Not provided'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666; font-weight: 500;">Website</td>
                            <td style="padding: 10px 0; color: #000;">${data.website || 'Not provided'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #666; font-weight: 500;">Signed Up At</td>
                            <td style="padding: 10px 0; color: #000;">${new Date().toLocaleString()}</td>
                        </tr>
                    </table>
                    <p style="color: #888; font-size: 12px; margin-top: 30px;">
                        This is an automated notification from Neucler.
                    </p>
                </div>
            `
        });
        console.log("✅ [Onboarding] Admin notification email sent");
    } catch (emailError) {
        // Don't fail the onboarding if email fails
        console.error("⚠️ [Onboarding] Failed to send admin notification email:", emailError);
    }

    // 7. Return success
    return { success: true };
}