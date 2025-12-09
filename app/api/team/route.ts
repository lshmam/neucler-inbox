import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { mg, DOMAIN } from "@/lib/mailgun";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get user's merchant_id
        const { data: merchant } = await supabase
            .from("merchants")
            .select("platform_merchant_id, business_name")
            .eq("id", user.id)
            .single();

        let merchantId = merchant?.platform_merchant_id;
        let businessName = merchant?.business_name;

        // If not an owner, check team membership
        if (!merchantId) {
            const { data: tm } = await supabase
                .from("team_members")
                .select("merchant_id")
                .eq("user_id", user.id)
                .single();
            merchantId = tm?.merchant_id;
        }

        if (!merchantId) {
            return NextResponse.json({ error: "No team access" }, { status: 403 });
        }

        // Fetch team members with user details
        const { data: members, error } = await supabaseAdmin
            .from("team_members")
            .select(`
                id,
                user_id,
                role,
                created_at
            `)
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        // Get user emails from auth.users
        const memberDetails = await Promise.all(
            (members || []).map(async (m) => {
                const { data: { user: memberUser } } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
                return {
                    ...m,
                    email: memberUser?.email || "Unknown",
                    name: memberUser?.user_metadata?.full_name || memberUser?.email?.split("@")[0] || "Unknown"
                };
            })
        );

        // Also get pending invites
        const { data: invites } = await supabaseAdmin
            .from("team_invites")
            .select("id, email, role, created_at, expires_at")
            .eq("merchant_id", merchantId)
            .is("accepted_at", null)
            .gt("expires_at", new Date().toISOString());

        return NextResponse.json({
            members: memberDetails,
            invites: invites || [],
            businessName
        });
    } catch (err: any) {
        console.error("[Team Members GET]", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { email, role } = await req.json();

        if (!email || !role || !["admin", "member"].includes(role)) {
            return NextResponse.json({ error: "Invalid email or role" }, { status: 400 });
        }

        // Get merchant context
        const { data: merchant } = await supabase
            .from("merchants")
            .select("platform_merchant_id, business_name")
            .eq("id", user.id)
            .single();

        let merchantId = merchant?.platform_merchant_id;
        let businessName = merchant?.business_name || "the team";
        let userRole: string = "owner";

        if (!merchantId) {
            const { data: tm } = await supabase
                .from("team_members")
                .select("merchant_id, role")
                .eq("user_id", user.id)
                .single();
            merchantId = tm?.merchant_id;
            userRole = tm?.role || "member";
        }

        if (!merchantId) {
            return NextResponse.json({ error: "No team access" }, { status: 403 });
        }

        // Check permission
        if (userRole !== "owner" && userRole !== "admin") {
            return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 });
        }

        // Check if already a member
        const { data: existingMember } = await supabaseAdmin
            .from("team_members")
            .select("id")
            .eq("merchant_id", merchantId)
            .eq("user_id", (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id || "none")
            .single();

        if (existingMember) {
            return NextResponse.json({ error: "User is already a team member" }, { status: 400 });
        }

        // Check for existing pending invite
        const { data: existingInvite } = await supabaseAdmin
            .from("team_invites")
            .select("id")
            .eq("merchant_id", merchantId)
            .eq("email", email.toLowerCase())
            .is("accepted_at", null)
            .gt("expires_at", new Date().toISOString())
            .single();

        if (existingInvite) {
            return NextResponse.json({ error: "Invite already pending for this email" }, { status: 400 });
        }

        // Create invite
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from("team_invites")
            .insert({
                merchant_id: merchantId,
                email: email.toLowerCase(),
                role,
                invited_by: user.id
            })
            .select()
            .single();

        if (inviteError) throw inviteError;

        // Send invite email
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/accept?token=${invite.token}`;

        if (DOMAIN && mg) {
            await mg.messages.create(DOMAIN, {
                from: `${businessName} <noreply@${DOMAIN}>`,
                to: [email],
                subject: `You're invited to join ${businessName}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>You're Invited! 🎉</h2>
                        <p>You've been invited to join <strong>${businessName}</strong> as a ${role}.</p>
                        <p style="margin: 24px 0;">
                            <a href="${inviteUrl}" 
                               style="background: #6366f1; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 8px; display: inline-block;">
                                Accept Invitation
                            </a>
                        </p>
                        <p style="color: #666; font-size: 14px;">
                            This invitation expires in 7 days.<br>
                            If you didn't expect this invite, you can safely ignore it.
                        </p>
                    </div>
                `
            });
        }

        return NextResponse.json({
            success: true,
            invite: { id: invite.id, email: invite.email, role: invite.role }
        });
    } catch (err: any) {
        console.error("[Team Invite POST]", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const memberId = searchParams.get("memberId");
        const inviteId = searchParams.get("inviteId");

        // Get merchant context
        const { data: merchant } = await supabase
            .from("merchants")
            .select("platform_merchant_id")
            .eq("id", user.id)
            .single();

        let merchantId = merchant?.platform_merchant_id;
        let userRole: string = "owner";

        if (!merchantId) {
            const { data: tm } = await supabase
                .from("team_members")
                .select("merchant_id, role")
                .eq("user_id", user.id)
                .single();
            merchantId = tm?.merchant_id;
            userRole = tm?.role || "member";
        }

        if (!merchantId) {
            return NextResponse.json({ error: "No team access" }, { status: 403 });
        }

        // Delete member
        if (memberId) {
            if (userRole !== "owner") {
                return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 });
            }

            const { error } = await supabaseAdmin
                .from("team_members")
                .delete()
                .eq("id", memberId)
                .eq("merchant_id", merchantId);

            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // Delete invite
        if (inviteId) {
            if (userRole !== "owner" && userRole !== "admin") {
                return NextResponse.json({ error: "Only admins can cancel invites" }, { status: 403 });
            }

            const { error } = await supabaseAdmin
                .from("team_invites")
                .delete()
                .eq("id", inviteId)
                .eq("merchant_id", merchantId);

            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "No member or invite ID provided" }, { status: 400 });
    } catch (err: any) {
        console.error("[Team DELETE]", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
