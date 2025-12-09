import { getMerchantId } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { AutomationCard } from "./automation-card";
import { Shield, Target, TrendingUp } from "lucide-react";

type AutomationItem = {
    id: string;
    title: string;
    description: string;
    iconName: string;
    defaultMessage?: string;
    triggerType?: "event" | "schedule" | "ai" | "tag";
    triggerTag?: string;
    inputs?: { label: string; key: string; type: string; placeholder?: string }[];
};

type AutomationCategory = {
    category: string;
    subtitle: string;
    description: string;
    icon: string;
    items: AutomationItem[];
};

const AUTOMATIONS_LIB: AutomationCategory[] = [
    {
        category: "Lead Capture",
        subtitle: "The Shield",
        description: "Never miss a lead, even when you're busy",
        icon: "Shield",
        items: [
            {
                id: "missed_call_sms",
                title: "Missed Call Text Back",
                description: "Auto-text customers immediately when you miss a call.",
                iconName: "PhoneMissed",
                defaultMessage: "Hey! Sorry we missed your call. How can we help you today?",
                triggerType: "event"
            },
            {
                id: "after_hours_responder",
                title: "After-Hours Responder",
                description: "Send a specific message during nights and weekends to save leads.",
                iconName: "Moon",
                defaultMessage: "Thanks for reaching out! We're currently closed but will get back to you first thing tomorrow. In the meantime, book online: [Link]",
                triggerType: "schedule",
                inputs: [
                    { label: "Business Hours Start", key: "hours_start", type: "time", placeholder: "09:00" },
                    { label: "Business Hours End", key: "hours_end", type: "time", placeholder: "17:00" }
                ]
            },
            {
                id: "ai_auto_reply",
                title: "AI FAQ Agent",
                description: "Allow AI to automatically answer incoming SMS questions using your Knowledge Base.",
                iconName: "Bot",
                defaultMessage: "(AI generates replies based on your Knowledge Base)",
                triggerType: "ai"
            }
        ]
    },
    {
        category: "Sales Recovery",
        subtitle: "The Nudge",
        description: "Convert interested leads into paying customers",
        icon: "Target",
        items: [
            {
                id: "smart_link_nudge",
                title: "Smart Link Nudge",
                description: "If a lead clicks a booking link but doesn't reply in 1 hour, send a follow-up.",
                iconName: "MousePointerClick",
                defaultMessage: "Hey! I saw you were checking out our booking page. Did you have any questions I can help with?",
                triggerType: "event",
                inputs: [
                    { label: "Wait Time (minutes)", key: "delay_minutes", type: "number", placeholder: "60" }
                ]
            },
            {
                id: "quote_followup",
                title: "Quote Follow-Up",
                description: "When you tag a lead as 'Quote Sent', wait 2 days and send a check-in text.",
                iconName: "FileText",
                defaultMessage: "Hi! Just checking in on the quote I sent over. Do you have any questions or want to move forward?",
                triggerType: "tag",
                triggerTag: "Quote Sent",
                inputs: [
                    { label: "Wait Time (days)", key: "delay_days", type: "number", placeholder: "2" }
                ]
            },
            {
                id: "no_show_recovery",
                title: "No-Show Recovery",
                description: "When you tag a customer as 'No Show', instantly send a reschedule link.",
                iconName: "CalendarX",
                defaultMessage: "We missed you today! No worries - here's a link to easily reschedule: [Link]",
                triggerType: "tag",
                triggerTag: "No Show"
            }
        ]
    },
    {
        category: "Growth & Retention",
        subtitle: "The Long Game",
        description: "Turn customers into loyal fans and referrals",
        icon: "TrendingUp",
        items: [
            {
                id: "review_booster",
                title: "Review Booster",
                description: "When you tag a customer as 'Job Done', wait 1 hour and send a Google Review request.",
                iconName: "Star",
                defaultMessage: "Thanks for choosing us! If you enjoyed your experience, we'd love a quick review: [Link]",
                triggerType: "tag",
                triggerTag: "Job Done",
                inputs: [
                    { label: "Google Review Link", key: "review_link", type: "text", placeholder: "https://g.page/..." },
                    { label: "Wait Time (hours)", key: "delay_hours", type: "number", placeholder: "1" }
                ]
            },
            {
                id: "winback_90",
                title: "90-Day Winback",
                description: "If a customer hasn't messaged you in 90 days, send a reactivation offer.",
                iconName: "History",
                defaultMessage: "It's been a while! We miss you. Come back this week for a special returning customer discount.",
                triggerType: "event"
            },
            {
                id: "referral_request",
                title: "Referral Request",
                description: "When you tag a customer as 'VIP', ask them to refer a friend.",
                iconName: "UserPlus",
                defaultMessage: "You're one of our favorite customers! Know anyone who might love our services? Refer a friend and you both get $10 off!",
                triggerType: "tag",
                triggerTag: "VIP"
            }
        ]
    }
];

const CATEGORY_ICONS: Record<string, any> = {
    Shield,
    Target,
    TrendingUp
};

export default async function AutomationsPage() {
    const merchantId = await getMerchantId();

    const { data: existingConfigs } = await supabaseAdmin
        .from("automations")
        .select("*")
        .eq("merchant_id", merchantId);

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex flex-col space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Automations Library</h2>
                <p className="text-muted-foreground">
                    "Set & Forget" workflows that run based on Communications, Tags, and AI Events.
                </p>
            </div>

            {AUTOMATIONS_LIB.map((section, idx) => {
                const CategoryIcon = CATEGORY_ICONS[section.icon] || Shield;
                return (
                    <div key={idx} className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${idx === 0 ? 'bg-blue-100 text-blue-600' :
                                idx === 1 ? 'bg-amber-100 text-amber-600' :
                                    'bg-green-100 text-green-600'
                                }`}>
                                <CategoryIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    {section.category}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        — {section.subtitle}
                                    </span>
                                </h3>
                                <p className="text-sm text-muted-foreground">{section.description}</p>
                            </div>
                            <div className="h-px bg-border flex-1 ml-4 hidden md:block" />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {section.items.map((item) => {
                                const existing = existingConfigs?.find(e => e.type === item.id);
                                return (
                                    <AutomationCard
                                        key={item.id}
                                        merchantId={merchantId}
                                        data={item}
                                        existingState={existing}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}