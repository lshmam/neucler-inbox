import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Validate token
    const { data: invite } = await supabaseAdmin
        .from("team_invites")
        .select("*")
        .eq("token", token)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

    if (!invite) {
        // Invalid or expired token
        return NextResponse.redirect(new URL("/login?error=invalid_invite", req.url));
    }

    // Check if user is logged in
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Not logged in - redirect to signup with invite context
        return NextResponse.redirect(
            new URL(`/login?invite_token=${token}&email=${encodeURIComponent(invite.email)}`, req.url)
        );
    }

    // User is logged in - accept the invite
    try {
        // Check if already a member
        const { data: existingMember } = await supabaseAdmin
            .from("team_members")
            .select("id")
            .eq("merchant_id", invite.merchant_id)
            .eq("user_id", user.id)
            .single();

        if (!existingMember) {
            // Create team member record
            await supabaseAdmin
                .from("team_members")
                .insert({
                    merchant_id: invite.merchant_id,
                    user_id: user.id,
                    role: invite.role
                });
        }

        // Mark invite as accepted
        await supabaseAdmin
            .from("team_invites")
            .update({ accepted_at: new Date().toISOString() })
            .eq("id", invite.id);

        // Redirect to dashboard
        return NextResponse.redirect(new URL("/dashboard?welcome=team", req.url));
    } catch (err: any) {
        console.error("[Accept Invite]", err);
        return NextResponse.redirect(new URL("/login?error=invite_failed", req.url));
    }
}
