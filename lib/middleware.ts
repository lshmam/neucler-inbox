import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // 1. Create an initial response
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 2. Initialize the Supabase client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // Set cookies on the request (for the server to see)
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))

                    // Re-create the response with the updated request headers
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })

                    // Set cookies on the response (for the browser to see)
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 3. Refresh the session (this is the magic step)
    // This updates the auth cookie if it's expired
    await supabase.auth.getUser()

    return response
}