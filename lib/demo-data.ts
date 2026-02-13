import { ActionItem } from "@/app/(dashboard)/actions/action-client";

export type Industry = "auto" | "medspa" | "dental" | "real";

export const DEMO_DATA: Record<Industry, { actions: ActionItem[] }> = {
    real: { actions: [] }, // Will be hydrated from API in the component
    auto: {
        actions: [
            {
                id: "a1", name: "Sarah Miller", phone: "+1 604-555-1234",
                vehicle: "2020 Toyota RAV4", tags: ["Warm Lead"], type: "missed_call", priority: "urgent",
                reason: "Missed inbound call — tried calling back, no answer",
                context: "Called about brake squeaking noise. First-time caller from Google Ads.",
                value: 0, timeAgo: "45 min ago",
                customerData: { notes: "Found us via Google. Mentioned brake noise at low speeds." }
            },
            {
                id: "a2", name: "Mike Ross", phone: "+1 604-555-5678",
                vehicle: "2019 Honda Civic", tags: ["Cancelled Today"], type: "cancellation", priority: "urgent",
                reason: "Cancelled 3:00 PM appointment — \"something came up\"",
                context: "Had a $420 brake pad replacement scheduled. Confirmed yesterday via SMS.",
                value: 420, timeAgo: "1 hour ago",
                customerData: { lastVisit: "2 months ago", totalSpend: 1200, visits: 4, openDeal: { service: "Brake Pad Replacement", value: 420, stage: "Booked → Cancelled" }, notes: "Reliable customer. Usually responds to rescheduling offers." }
            },
            {
                id: "a3", name: "Harvey Specter", phone: "+1 604-555-9012",
                vehicle: "2022 BMW 530i", tags: ["VIP", "No-Show"], type: "no_show", priority: "urgent",
                reason: "No-show for 10:00 AM oil change + inspection",
                context: "Confirmed yesterday. This is his 3rd visit. High lifetime value.",
                value: 350, timeAgo: "3 hours ago",
                customerData: { lastVisit: "3 months ago", totalSpend: 4800, visits: 6, openDeal: { service: "Oil Change + Full Inspection", value: 350, stage: "Booked → No Show" }, notes: "VIP customer. Very busy schedule. Offer flexible rescheduling." }
            },
        ]
    },
    medspa: {
        actions: [
            {
                id: "m1", name: "Jessica Cheng", phone: "+1 604-555-2233",
                vehicle: "Botox Treatment", tags: ["New Client"], type: "missed_call", priority: "urgent",
                reason: "Missed inquiry call - left voicemail",
                context: "Asked about pricing for 20 units of Botox. Saw Instagram ad.",
                value: 300, timeAgo: "15 min ago",
                customerData: { notes: "Interested in forehead and crow's feet. First time." }
            },
            {
                id: "m2", name: "Amanda Pierce", phone: "+1 604-555-4455",
                vehicle: "Laser Hair Removal", tags: ["High Value"], type: "cancellation", priority: "high",
                reason: "Cancelled Full Body Session - sick",
                context: "Recurring client. Usually books every 6 weeks. Need to reschedule to optimize results.",
                value: 450, timeAgo: "2 hours ago",
                customerData: { lastVisit: "6 weeks ago", totalSpend: 3200, visits: 8, openDeal: { service: "Full Body Laser", value: 450, stage: "Booked → Cancelled" }, notes: "Very consistent client." }
            },
            {
                id: "m3", name: "Rachel Green", phone: "+1 604-555-8899",
                vehicle: "CoolSculpting", tags: ["Consultation"], type: "unbooked_lead", priority: "medium",
                reason: "Came in for consult, didn't book yet",
                context: "Quoted $2,400 for abdomen package. Said she needs to talk to husband.",
                value: 2400, timeAgo: "1 day ago",
                customerData: { visits: 1, openDeal: { service: "CoolSculpting Abdomen", value: 2400, stage: "Quote Sent" }, notes: "Follow up in 2 days with financing options." }
            }
        ]
    },
    dental: {
        actions: [
            {
                id: "d1", name: "Tom Holland", phone: "+1 604-555-1010",
                vehicle: "Invisalign", tags: ["High Value"], type: "missed_call", priority: "urgent",
                reason: "Missed call during lunch hour",
                context: "Existing patient asking about Invisalign specials.",
                value: 5000, timeAgo: "30 min ago",
                customerData: { lastVisit: "6 months ago", totalSpend: 1500, visits: 3, notes: "Has mentioned crooked teeth before." }
            },
            {
                id: "d2", name: "Zendaya Coleman", phone: "+1 604-555-2020",
                vehicle: "Teeth Whitening", tags: ["Cosmetic"], type: "no_show", priority: "medium",
                reason: "No-show for Zoom Whitening appointment",
                context: "Booked online 2 weeks ago. No confirmation reply.",
                value: 600, timeAgo: "2 hours ago",
                customerData: { lastVisit: "1 year ago", totalSpend: 400, visits: 1, openDeal: { service: "Zoom Whitening", value: 600, stage: "Booked → No Show" } }
            },
            {
                id: "d3", name: "Chris Evans", phone: "+1 604-555-3030",
                vehicle: "Dental Implant", tags: ["Surgery"], type: "unbooked_lead", priority: "high",
                reason: "Pending treatment plan acceptance",
                context: " Presented $4,500 treatment plan for #19 implant. Insurance covers 50%.",
                value: 4500, timeAgo: "3 days ago",
                customerData: { lastVisit: "1 week ago", totalSpend: 800, visits: 2, openDeal: { service: "Implant #19", value: 4500, stage: "Proposal Sent" } }
            }
        ]
    }
};

export function getDemoMode(hostname: string): Industry {
    if (hostname.includes("medspa")) return "medspa";
    if (hostname.includes("dental")) return "dental";
    if (hostname.includes("auto")) return "auto"; // Explicit auto demo
    if (hostname === "app.neucler.com" || hostname === "localhost") return "real"; // Default to real/auto on raw app

    return "auto"; // Default fallback
}
