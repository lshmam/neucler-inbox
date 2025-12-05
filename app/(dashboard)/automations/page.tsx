import { getMerchantId } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { AutomationCard } from "./automation-card";

// Note: No need to import Lucide icons here anymore!

const AUTOMATIONS_LIB = [
    {
        category: "Revenue Recovery",
        items: [
            {
                id: "missed_call_sms",
                title: "Missed Call Text Back",
                description: "Automatically text customers when you miss their call to save the booking.",
                iconName: "PhoneMissed", // CHANGED TO STRING
                defaultMessage: "Hey! Sorry we missed your call. How can we help you today?",
            },
            {
                id: "abandoned_appt",
                title: "No-Show Recovery",
                description: "Re-engage customers who cancelled last minute or didn't show up.",
                iconName: "CalendarX", // CHANGED TO STRING
                defaultMessage: "Hi! We missed you today. Would you like to reschedule? Here is our availability: [Link]",
            },
            {
                id: "winback_90",
                title: "90-Day Winback",
                description: "Automatically reactivate customers who haven't visited in 3 months.",
                iconName: "History", // CHANGED TO STRING
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
                iconName: "Star", // CHANGED TO STRING
                defaultMessage: "Thanks for visiting! If you enjoyed your service, please leave us a review here: [Link]",
                inputs: [{ label: "Google Review Link", key: "review_link", type: "text", placeholder: "https://g.page/..." }]
            },
            {
                id: "loyalty_milestone",
                title: "Loyalty Milestones",
                description: "Notify customers when they are close to unlocking a reward.",
                iconName: "Gift", // CHANGED TO STRING
                defaultMessage: "You're only 12 points away from a free reward! Book now to earn points.",
            },
            {
                id: "referral_request",
                title: "Referral Request",
                description: "Ask loyal customers to refer a friend for a bonus.",
                iconName: "UserPlus", // CHANGED TO STRING
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
                iconName: "CalendarClock", // CHANGED TO STRING
                defaultMessage: "Time for a refresh? It's been 3 weeks since your last visit. Book here: [Link]",
                inputs: [{ label: "Days after service", key: "days_delay", type: "number", placeholder: "21" }]
            },
            {
                id: "waitlist_alert",
                title: "Waitlist Alerts",
                description: "Automatically notify the waitlist when a slot opens up.",
                iconName: "ListRestart", // CHANGED TO STRING
                defaultMessage: "Good news! A slot just opened up for Today at 2pm. Reply YES to claim it.",
            },
            {
                id: "invoice_reminder",
                title: "Invoice Chase",
                description: "Nudge clients who have outstanding unpaid invoices.",
                iconName: "Receipt", // CHANGED TO STRING
                defaultMessage: "Hi! Just a friendly reminder that invoice #123 is due. You can pay securely here: [Link]",
            },
            {
                id: "post_care_tips",
                title: "Post-Service Tips",
                description: "Send helpful after-care instructions to build trust.",
                iconName: "Info", // CHANGED TO STRING
                defaultMessage: "Thanks for visiting! Remember to avoid direct sunlight on your skin for 24 hours.",
            }
        ]
    },
    {
        category: "AI Intelligence",
        items: [
            {
                id: "ai_receptionist_handoff",
                title: "AI Receptionist Handoff",
                description: "If the AI Voice Agent can't finish a task, follow up via SMS.",
                iconName: "MessageSquare", // CHANGED TO STRING
                defaultMessage: "Here is the booking link I mentioned on the phone: [Link]",
            },
            {
                id: "ai_persona_texting",
                title: "AI Persona Texting",
                description: "Dynamic messages based on if customer is 'Price Sensitive' or 'VIP'.",
                iconName: "BrainCircuit", // CHANGED TO STRING
                defaultMessage: "(AI will generate this message based on customer tag)",
            },
            {
                id: "smart_dropoff",
                title: "Smart Retention",
                description: "Detects deviation from individual customer habits.",
                iconName: "Sparkles", // CHANGED TO STRING
                defaultMessage: "Hey [Name], we noticed you broke your streak! We miss you.",
            },
            {
                id: "promo_broadcast",
                title: "Promo Broadcast",
                description: "Blast a one-time offer to fill slow days.",
                iconName: "Megaphone", // CHANGED TO STRING
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