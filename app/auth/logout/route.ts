import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const cookieStore = await cookies();

    // Destroy the cookie
    cookieStore.delete("session_merchant_id");

    // Redirect to login
    return NextResponse.redirect(new URL("/", request.url));
}