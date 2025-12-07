import { getMerchantId } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { AutomationCard } from "./automation-card";

const AUTOMATIONS_LIB = [
    {
        category: "Revenue Recovery",
        items: [
            {
                id: "missed_call_sms",
                title: "Missed Call Text Back",
                description: "Automatically text customers when you miss their call to save the booking.",
                iconName: "PhoneMissed",
                defaultMessage: "Hey! Sorry we missed your call. How can we help you today?",
            },
            {
                id: "abandoned_appt",
                title: "No-Show Recovery",
                description: "Re-engage customers who cancelled last minute or didn't show up.",
                iconName: "CalendarX",
                defaultMessage: "Hi! We missed you today. Would you like to reschedule? Here is our availability: [Link]",
            },
            {
                id: "winback_90",
                title: "90-Day Winback",
                description: "Automatically reactivate customers who haven't visited in 3 months.",
                iconName: "History",
                defaultMessage: "It's been a while! Come back in this week for 10% off your next service.",
            }
        ]
    },
    {
        category: "Growth & Loyalty",
        items: [
            {
                id: "review_booster",
                title: "Review Booster",
                description: "Send a Google Review request immediately after a service is completed.",
                iconName: "Star",
                defaultMessage: "Thanks for visiting! If you enjoyed your service, please leave us a review here: [Link]",
                inputs: [{ label: "Google Review Link", key: "review_link", type: "text", placeholder: "https://g.page/..." }]
            },
            {
                id: "referral_request",
                title: "Referral Request",
                description: "Ask loyal customers to refer a friend for a bonus.",
                iconName: "UserPlus",
                defaultMessage: "Love our service? Refer a friend and you both get $10 off!",
            }
        ]
    },
    {
        category: "Smart Operations",
        items: [
            {
                id: "rebooking_reminder",
                title: "Rebooking Reminder",
                description: "Remind customers to book again based on their cycle (e.g. every 3 weeks).",
                iconName: "CalendarClock",
                defaultMessage: "Time for a refresh? It's been 3 weeks since your last visit. Book here: [Link]",
                inputs: [{ label: "Days after service", key: "days_delay", type: "number", placeholder: "21" }]
            },
            {
                id: "waitlist_alert",
                title: "Waitlist Alerts",
                description: "Automatically notify the waitlist when a slot opens up.",
                iconName: "ListRestart",
                defaultMessage: "Good news! A slot just opened up for Today at 2pm. Reply YES to claim it.",
            },
            {
                id: "invoice_reminder",
                title: "Invoice Chase",
                description: "Nudge clients who have outstanding unpaid invoices.",
                iconName: "Receipt",
                defaultMessage: "Hi! Just a friendly reminder that invoice #123 is due. You can pay securely here: [Link]",
            },
            {
                id: "post_care_tips",
                title: "Post-Service Tips",
                description: "Send helpful after-care instructions to build trust.",
                iconName: "Info",
                defaultMessage: "Thanks for visiting! Remember to avoid direct sunlight on your skin for 24 hours.",
            }
        ]
    },
    {
        category: "AI Intelligence",
        items: [
            {
                id: "ai_auto_reply",
                title: "AI Auto-Reply",
                description: "Automatically respond to SMS, Email, and Widget messages using your Knowledge Base.",
                iconName: "Bot",
                defaultMessage: "(AI generates replies based on your Knowledge Base)",
                inputs: [
                    { label: "Enable SMS", key: "channel_sms", type: "checkbox", placeholder: "" },
                    { label: "Enable Email", key: "channel_email", type: "checkbox", placeholder: "" },
                    { label: "Enable Widget", key: "channel_widget", type: "checkbox", placeholder: "" }
                ]
            },
            {
                id: "ai_receptionist_handoff",
                title: "AI Receptionist Handoff",
                description: "If the AI Voice Agent can't finish a task, follow up via SMS.",
                iconName: "MessageSquare",
                defaultMessage: "Here is the booking link I mentioned on the phone: [Link]",
            },
            {
                id: "smart_dropoff",
                title: "Smart Retention",
                description: "Detects deviation from individual customer habits.",
                iconName: "Sparkles",
                defaultMessage: "Hey [Name], we noticed you broke your streak! We miss you.",
            },
            {
                id: "promo_broadcast",
                title: "Promo Broadcast",
                description: "Blast a one-time offer to fill slow days.",
                iconName: "Megaphone",
                defaultMessage: "Flash Sale: 20% off all bookings made for tomorrow!",
            }
        ]
    }
];

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
                    Turn on "Set & Forget" workflows to grow your business automatically.
                </p>
            </div>

            {AUTOMATIONS_LIB.map((section, idx) => (
                <div key={idx} className="space-y-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        {section.category}
                        <div className="h-px bg-border flex-1 ml-4" />
                    </h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            ))}
        </div>
    );
}