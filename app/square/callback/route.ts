import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // 1. Handle User Denied / Error from Square
    if (error) {
        return NextResponse.redirect(new URL(`/?error=square_${error}`, request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL("/?error=no_code", request.url));
    }

    try {
        // 2. Determine Environment
        const isSandbox = process.env.SQUARE_ENVIRONMENT === "sandbox";
        const tokenUrl = isSandbox
            ? "https://connect.squareupsandbox.com/oauth2/token"
            : "https://connect.squareup.com/oauth2/token";

        console.log("🔄 Exchanging code for token with Square...");

        // 3. Exchange Code for Token
        // IMPORTANT: redirect_uri here MUST match the one used in the button link EXACTLY
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: process.env.SQUARE_APP_ID,
                client_secret: process.env.SQUARE_APP_SECRET,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/square/callback`, // <--- THIS WAS LIKELY MISSING
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ Square Token Error:", JSON.stringify(data, null, 2));
            return NextResponse.redirect(new URL("/?error=token_failed_check_console", request.url));
        }

        const { access_token, merchant_id, refresh_token } = data;

        console.log(`✅ Success! Token received for Merchant: ${merchant_id}`);

        // 4. Save to Supabase
        const { error: dbError } = await supabaseAdmin
            .from("merchants")
            .upsert({
                platform_merchant_id: merchant_id,
                access_token: access_token,
                refresh_token: refresh_token,
                // We can fetch business name later
            }, { onConflict: "platform_merchant_id" });

        if (dbError) {
            console.error("❌ DB Error:", dbError);
            return NextResponse.redirect(new URL("/?error=db_save_failed", request.url));
        }

        // 5. Set Session Cookie
        const cookieStore = await cookies();
        cookieStore.set("session_merchant_id", merchant_id, {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 Days
            path: "/", // <--- ADD THIS LINE!
        });

        return NextResponse.redirect(new URL("/dashboard?status=connected", request.url));

    } catch (error) {
        console.error("❌ Internal Error:", error);
        return NextResponse.redirect(new URL("/?error=internal_server_error", request.url));
    }
}