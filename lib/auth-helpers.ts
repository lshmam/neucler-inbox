import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamContext {
    merchantId: string;
    userId: string;
    role: TeamRole;
}

/**
 * Server-side helper to get the current authenticated user's merchant context
 * Checks both direct ownership and team membership
 */
export async function getMerchantId(): Promise<string> {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error } = await supabase.auth.getUser();

    // If no user or error, redirect to login
    if (error || !user) {
        console.log('[getMerchantId] No user found, redirecting to login');
        redirect('/login');
    }

    // First, check if they own a merchant directly
    const { data: merchant } = await supabase
        .from('merchants')
        .select('platform_merchant_id')
        .eq('id', user.id)
        .single();

    if (merchant?.platform_merchant_id) {
        return merchant.platform_merchant_id;
    }

    // If not an owner, check if they're a team member
    const { data: teamMember } = await supabase
        .from('team_members')
        .select('merchant_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

    if (teamMember?.merchant_id) {
        return teamMember.merchant_id;
    }

    // No access – redirect to onboarding
    console.log('[getMerchantId] User has no merchant access, redirecting to onboarding');
    redirect('/onboarding');
}

/**
 * Get full team context including role
 */
export async function getTeamContext(): Promise<TeamContext> {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        redirect('/login');
    }

    // Check if they own a merchant
    const { data: merchant } = await supabase
        .from('merchants')
        .select('platform_merchant_id')
        .eq('id', user.id)
        .single();

    if (merchant?.platform_merchant_id) {
        return {
            merchantId: merchant.platform_merchant_id,
            userId: user.id,
            role: 'owner'
        };
    }

    // Check team membership
    const { data: teamMember } = await supabase
        .from('team_members')
        .select('merchant_id, role')
        .eq('user_id', user.id)
        .limit(1)
        .single();

    if (teamMember) {
        return {
            merchantId: teamMember.merchant_id,
            userId: user.id,
            role: teamMember.role as TeamRole
        };
    }

    redirect('/onboarding');
}

/**
 * Check if user has required role or higher
 */
export function hasPermission(userRole: TeamRole, requiredRole: TeamRole): boolean {
    const roleHierarchy: Record<TeamRole, number> = {
        owner: 3,
        admin: 2,
        member: 1
    };
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
