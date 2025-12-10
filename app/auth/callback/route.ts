import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    const supabase = await createClient()
    let authError = null

    // Handle OAuth callback (Google, etc.)
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        authError = error
    }
    // Handle Magic Link / OTP callback
    else if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as 'email' | 'signup' | 'magiclink' | 'recovery' | 'invite',
        })
        authError = error
    } else {
        // No valid auth parameters
        return NextResponse.redirect(`${origin}/login?error=missing_params`)
    }

    if (!authError) {
        // Check if this user exists in YOUR 'merchants' table
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // We assume your 'merchants' table uses the same ID as auth.users, 
            // OR you check via email. Let's check via ID first.
            const { data: merchant } = await supabase
                .from('merchants')
                .select('id')
                .eq('id', user.id) // Assuming you link them by ID
                .single()

            // Decide where to go
            if (merchant) {
                // User exists -> Dashboard
                const response = NextResponse.redirect(`${origin}/dashboard`)
                response.cookies.set('session_merchant_id', merchant.id, {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 7 // 1 week
                })
                return response
            } else {
                // User is new -> Onboarding
                return NextResponse.redirect(`${origin}/onboarding`)
            }
        }
    }

    // If something failed, send them back to login
    return NextResponse.redirect(`${origin}/login?error=auth`)
}