export interface CallerContext {
    name: string;
    phone: string;
    isReturning: boolean;
    callReason: string;
    lastInteraction?: string;
    tags: string[];
}

export interface ChecklistItem {
    id: string;
    label: string;
    completed: boolean;
    required: boolean;
}

export type CallOutcome = 'booked' | 'not_booked' | 'callback' | 'not_a_fit' | 'voicemail';

export type CallStatus = 'active' | 'ending' | 'completed';

export interface IntakeFormData {
    reasonForVisit: string;
    preferredTime: string;
    insuranceProvider: string;
    referralSource: string;
}

export interface TimeSlot {
    id: string;
    time: string;
    provider: string;
    available: boolean;
}
