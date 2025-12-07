import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    // 1. Sign out from Supabase (invalidates the JWT)
    await supabase.auth.signOut();

    // 2. Destroy our custom session cookie
    cookieStore.delete("session_merchant_id");

    // 3. Redirect to home/login and ensure no caching
    return NextResponse.redirect(new URL("/", request.url), { status: 302 });
}