'use server'

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type KnowledgeBaseArticle = {
    id: string;
    title: string;
    content: string;
    category: string | null;
    is_published: boolean;
    created_at: string;
};

export type KnowledgeBaseData = {
    articles: KnowledgeBaseArticle[];
    services_summary: string;
    business_hours: any; // JSONB
    ai_tone: string;
    ai_name: string;
};

// Use user.id directly as merchant_id (aligned with onboarding)
async function getMerchantId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    return user.id;
}

export async function getKnowledgeBaseData(): Promise<KnowledgeBaseData> {
    const supabase = await createClient();
    const merchantId = await getMerchantId();

    console.log("📚 [KB] Fetching data for merchant:", merchantId);

    // 1. Fetch Articles
    const { data: articles, error: articlesError } = await supabase
        .from('knowledge_base_articles')
        .select('id, title, content, category, is_published, created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

    if (articlesError) {
        console.error("Error fetching articles:", articlesError);
    }

    // 2. Fetch Business Profile Info
    const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .select('services_summary, business_hours, ai_tone, ai_name')
        .eq('merchant_id', merchantId)
        .single();

    if (profileError) {
        console.error("Error fetching profile:", profileError);
    }

    // Handle business_hours - it may be stored as a JSON string
    let parsedHours = profile?.business_hours || {};
    if (typeof parsedHours === 'string') {
        try {
            parsedHours = JSON.parse(parsedHours);
        } catch {
            parsedHours = {};
        }
    }

    console.log("📚 [KB] Found", articles?.length || 0, "articles");

    return {
        articles: articles || [],
        services_summary: profile?.services_summary || '',
        business_hours: parsedHours,
        ai_tone: profile?.ai_tone || 'friendly',
        ai_name: profile?.ai_name || 'Alex'
    };
}

export async function createKnowledgeBaseArticle(data: { title: string; content: string; category?: string }) {
    const supabase = await createClient();
    const merchantId = await getMerchantId();

    const { error } = await supabase
        .from('knowledge_base_articles')
        .insert({
            merchant_id: merchantId,
            title: data.title,
            content: data.content,
            category: data.category || 'General',
            is_published: true
        });

    if (error) {
        console.error("Create Article Error:", error);
        throw new Error("Failed to create article");
    }

    revalidatePath('/settings');
    return { success: true };
}

export async function updateKnowledgeBaseArticle(id: string, data: { title?: string; content?: string; category?: string; is_published?: boolean }) {
    const supabase = await createClient();
    const merchantId = await getMerchantId();

    const { error } = await supabase
        .from('knowledge_base_articles')
        .update(data)
        .eq('id', id)
        .eq('merchant_id', merchantId); // Security check

    if (error) {
        console.error("Update Article Error:", error);
        throw new Error("Failed to update article");
    }

    revalidatePath('/settings');
    return { success: true };
}

export async function deleteKnowledgeBaseArticle(id: string) {
    const supabase = await createClient();
    const merchantId = await getMerchantId();

    const { error } = await supabase
        .from('knowledge_base_articles')
        .delete()
        .eq('id', id)
        .eq('merchant_id', merchantId); // Security check

    if (error) {
        console.error("Delete Article Error:", error);
        throw new Error("Failed to delete article");
    }

    revalidatePath('/settings');
    return { success: true };
}

export async function updateBusinessProfileSettings(data: { services_summary?: string; business_hours?: any; ai_tone?: string; ai_name?: string }) {
    const supabase = await createClient();
    const merchantId = await getMerchantId();

    const { error } = await supabase
        .from('business_profiles')
        .update(data)
        .eq('merchant_id', merchantId);

    if (error) {
        console.error("Update Profile Error:", error);
        throw new Error("Failed to update settings");
    }

    revalidatePath('/settings');
    return { success: true };
}
