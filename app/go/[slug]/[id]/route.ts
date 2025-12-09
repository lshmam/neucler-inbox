import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    console.log(`\n========================================`);
    console.log(`🔗 SMART LINK ROUTE HIT`);
    console.log(`URL: ${request.url}`);
    console.log(`========================================`);

    try {
        const { slug, id } = await params;
        console.log(`[Smart Link] Params: slug=${slug}, id=${id}`);

        // 1. Look up the smart link
        const { data: link, error } = await supabaseAdmin
            .from("smart_links")
            .select("id, target_url, merchant_id")
            .eq("id", id)
            .single();

        console.log(`[Smart Link] Query result:`, JSON.stringify({ link, error }, null, 2));

        if (error || !link) {
            console.log(`[Smart Link] ❌ Not found, redirecting to 404`);
            return NextResponse.redirect(new URL("/404", request.url));
        }

        if (!link.target_url) {
            console.log(`[Smart Link] ❌ No target_url in link`);
            return NextResponse.redirect(new URL("/404", request.url));
        }

        // 2. Update clicked_at (fire-and-forget)
        supabaseAdmin
            .from("smart_links")
            .update({ clicked_at: new Date().toISOString() })
            .eq("id", id)
            .is("clicked_at", null)
            .then(() => console.log(`[Smart Link] ✅ Click tracked for ${id}`))
            .catch((err) => console.error(`[Smart Link] Track error:`, err));

        // 3. Redirect to the target URL
        console.log(`[Smart Link] ✅ Redirecting to: ${link.target_url}`);
        return NextResponse.redirect(link.target_url);

    } catch (err: any) {
        console.error(`[Smart Link] ❌ ERROR:`, err);
        return NextResponse.redirect(new URL("/404", request.url));
    }
}
