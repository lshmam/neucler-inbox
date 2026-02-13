import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
    let hostname = request.headers.get("host") || "";
    let pathname = request.nextUrl.pathname;

    // Initialize demo state
    let isDemo = false;
    let demoIndustry = "auto";
    let isRewrite = false;
    let rewritePath = pathname;

    // 1. Check Path-based Demo (Priority)
    // e.g. /medspa-demo/actions -> /actions
    if (pathname.startsWith("/medspa-demo")) {
        isDemo = true;
        demoIndustry = "medspa";
        isRewrite = true;
        rewritePath = pathname.replace("/medspa-demo", "") || "/dashboard"; // Handle root /medspa-demo -> /dashboard
    } else if (pathname.startsWith("/dental-demo")) {
        isDemo = true;
        demoIndustry = "dental";
        isRewrite = true;
        rewritePath = pathname.replace("/dental-demo", "") || "/dashboard";
    }
    // 2. Check Hostname-based Demo
    else if (hostname.includes("medspa")) {
        isDemo = true;
        demoIndustry = "medspa";
    } else if (hostname.includes("dental")) {
        isDemo = true;
        demoIndustry = "dental";
    } else if (hostname.includes("demo")) {
        isDemo = true;
        demoIndustry = "auto";
    }
    // 3. Check Query Param (Override)
    else if (request.nextUrl.searchParams.has("demo")) {
        isDemo = true;
        const param = request.nextUrl.searchParams.get("demo");
        if (param === "medspa" || param === "dental" || param === "auto") {
            demoIndustry = param;
        }
    }

    // Set Headers
    const requestHeaders = new Headers(request.headers);
    if (isDemo) {
        requestHeaders.set("x-demo-mode", "true");
        requestHeaders.set("x-demo-industry", demoIndustry);
    }

    // Prepare Response (Rewrite or Next)
    let supabaseResponse: NextResponse;

    if (isRewrite) {
        // Rewrite to the internal path
        const url = request.nextUrl.clone();
        url.pathname = rewritePath;
        // Don't lose search params
        supabaseResponse = NextResponse.rewrite(url, {
            request: {
                headers: requestHeaders,
            },
        });
    } else {
        supabaseResponse = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session if expired - this will also set the cookie
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Redirect to login if user is not authenticated and trying to access protected routes
    const isLocalhost = hostname.includes("localhost");

    if (
        !user &&
        !isDemo &&
        !isLocalhost && // Allow localhost to bypass auth check (will fall back to demo mode in client)
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        !request.nextUrl.pathname.startsWith('/go')  // Smart links don't need auth
    ) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api/ (API routes - they handle their own auth)
         * - public files (images, etc)
         */
        '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
