import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    if (code) {
        const supabase = await createClient()

        // 1. Exchange the Google Code for a Session
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // 2. Check if this user exists in YOUR 'merchants' table
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // We assume your 'merchants' table uses the same ID as auth.users, 
                // OR you check via email. Let's check via ID first.
                const { data: merchant } = await supabase
                    .from('merchants')
                    .select('id')
                    .eq('id', user.id) // Assuming you link them by ID
                    .single()

                // 3. Decide where to go
                if (merchant) {
                    // User exists -> Dashboard
                    return NextResponse.redirect(`${origin}/dashboard`)
                } else {
                    // User is new -> Onboarding
                    return NextResponse.redirect(`${origin}/onboarding`)
                }
            }
        }
    }

    // If something failed, send them back to login
    return NextResponse.redirect(`${origin}/login?error=auth`)
}