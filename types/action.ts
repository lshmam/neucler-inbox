export type ActionPriority = 'high' | 'medium' | 'low';
export type ActionStatus = 'pending' | 'completed' | 'snoozed' | 'dismissed';
export type ActionType = 'missed_call' | 'cancel' | 'no_show' | 'lead' | 'recall' | 'info_pending';

export interface Action {
    id: string;
    personId: string; // Could be customer ID or lead ID
    personName: string;
    personPhone?: string;
    personTags?: string[]; // e.g., "Warm Lead", "VIP"

    actionType: ActionType;
    priority: ActionPriority;

    reasonText: string; // Auto-generated reason
    lastInteractionText?: string; // Context: "Last spoke 6 days ago"

    dueAt: string; // ISO date string
    createdAt: string; // ISO date string

    status: ActionStatus;
}

export const ACTION_PRIORITY_ORDER: Record<ActionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2
};
