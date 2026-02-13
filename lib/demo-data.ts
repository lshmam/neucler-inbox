import { ActionItem } from "@/app/(dashboard)/actions/action-client";

export type Industry = "auto" | "medspa" | "dental" | "real";

export interface DashboardStats {
    name: string;
    todayCalls: number;
    todayBookings: number;
    todayEarnings: number;
    monthBookings: number;
    monthEarnings: number;
    conversionRate: number;
    callTarget: number;
    bookingTarget: number;
    earningsTarget: number;
}

export interface TeamMember {
    id: string;
    name: string;
    avatar: string;
    bookings: number;
    calls: number;
    rate: number;
    earnings: number;
    isYou: boolean;
}

export interface QueueItem {
    id: string;
    name: string;
    phone: string;
    vehicle: string; // This property doubles as "Treatment" or "Service"
    issue: string;
    heat: "hot" | "warm" | "cold";
    lastContact: string;
    value: number;
    lastVisit?: string;
    totalSpend: number;
    visits: number;
    openDeal?: { service: string; value: number; stage: string };
    notes: string;
}

export interface ChartDataPoint {
    day: string;
    calls: number;
    sms: number;
}

export const DEMO_DATA: Record<Industry, {
    actions: ActionItem[];
    stats: DashboardStats;
    team: TeamMember[],
    queue: QueueItem[],
    chart: ChartDataPoint[]
}> = {
    real: {
        actions: [],
        stats: {} as any,
        team: [],
        queue: [],
        chart: []
    },

    // ================= AUTO =================
    auto: {
        actions: [
            { id: "a1", name: "Sarah Miller", phone: "+1 604-555-1234", vehicle: "2020 Toyota RAV4", tags: ["Warm Lead"], type: "missed_call", priority: "urgent", reason: "Missed inbound call", context: "Brake squeaking noise", value: 0, timeAgo: "45 min ago", customerData: { notes: "Found us via Google. Mentioned brake noise at low speeds." } },
            { id: "a2", name: "Mike Ross", phone: "+1 604-555-5678", vehicle: "2019 Honda Civic", tags: ["Cancelled"], type: "cancellation", priority: "urgent", reason: "Cancelled 3PM appt", context: "Brake pad replacement", value: 420, timeAgo: "1 hour ago", customerData: { lastVisit: "2 months ago", totalSpend: 1200, visits: 4, openDeal: { service: "Brake Pad Replacement", value: 420, stage: "Booked → Cancelled" }, notes: "Reliable customer." } },
            { id: "a3", name: "Harvey Specter", phone: "+1 604-555-9012", vehicle: "2022 BMW 530i", tags: ["VIP", "No-Show"], type: "no_show", priority: "urgent", reason: "No-show for 10:00 AM oil change", context: "High lifetime value.", value: 350, timeAgo: "3 hours ago", customerData: { lastVisit: "3 months ago", totalSpend: 4800, visits: 6, openDeal: { service: "Oil Change", value: 350, stage: "Booked → No Show" } } },
        ],
        stats: {
            name: "Sarah (Auto)", todayCalls: 14, todayBookings: 4, todayEarnings: 100,
            monthBookings: 22, monthEarnings: 550, conversionRate: 29,
            callTarget: 20, bookingTarget: 6, earningsTarget: 150
        },
        team: [
            { id: "1", name: "Sarah M.", avatar: "SM", bookings: 22, calls: 98, rate: 29, earnings: 550, isYou: true },
            { id: "2", name: "Mike R.", avatar: "MR", bookings: 28, calls: 112, rate: 25, earnings: 1120, isYou: false },
            { id: "3", name: "Jessica L.", avatar: "JL", bookings: 18, calls: 85, rate: 21, earnings: 450, isYou: false },
            { id: "4", name: "David K.", avatar: "DK", bookings: 34, calls: 130, rate: 26, earnings: 1360, isYou: false },
            { id: "5", name: "Amy T.", avatar: "AT", bookings: 12, calls: 72, rate: 17, earnings: 300, isYou: false },
        ],
        queue: [
            { id: "q1", name: "John Peterson", phone: "+1 604-555-0123", vehicle: "2021 BMW X5", issue: "Brake inspection needed", heat: "hot", lastContact: "2 days ago", value: 850, lastVisit: "Jan 3, 2026", totalSpend: 4200, visits: 8, openDeal: { service: "Brake Job", value: 850, stage: "Quote Sent" }, notes: "Price sensitive." },
            { id: "q2", name: "Karen Williams", phone: "+1 604-555-0456", vehicle: "2019 Honda CR-V", issue: "Oil change overdue", heat: "hot", lastContact: "1 day ago", value: 280, lastVisit: "Dec 15, 2025", totalSpend: 1800, visits: 5, notes: "Usually books same day." },
            { id: "q3", name: "Steve Brooks", phone: "+1 604-555-0789", vehicle: "2022 Toyota Camry", issue: "AC not blowing cold", heat: "warm", lastContact: "3 hours ago", value: 0, lastVisit: undefined, totalSpend: 0, visits: 0, notes: "First-time caller." },
            { id: "q4", name: "Lisa Chen", phone: "+1 604-555-0321", vehicle: "2020 Mercedes C300", issue: "Transmission service", heat: "warm", lastContact: "4 days ago", value: 1200, lastVisit: "Nov 20, 2025", totalSpend: 6500, visits: 12, openDeal: { service: "Trans Flush", value: 1200, stage: "Follow-Up" }, notes: "VIP." },
        ],
        chart: [
            { day: "Mon", calls: 12, sms: 5 }, { day: "Tue", calls: 18, sms: 8 },
            { day: "Wed", calls: 15, sms: 12 }, { day: "Thu", calls: 22, sms: 9 },
            { day: "Fri", calls: 28, sms: 15 }, { day: "Sat", calls: 10, sms: 4 }, { day: "Sun", calls: 5, sms: 2 }
        ]
    },

    // ================= MEDSPA =================
    medspa: {
        actions: [
            { id: "m1", name: "Jessica Cheng", phone: "+1 604-555-2233", vehicle: "Botox Treatment", tags: ["New Client"], type: "missed_call", priority: "urgent", reason: "Missed inquiry call", context: "Pricing for 20 units", value: 300, timeAgo: "15 min ago", customerData: { notes: "First time." } },
            { id: "m2", name: "Amanda Pierce", phone: "+1 604-555-4455", vehicle: "Laser Hair Removal", tags: ["High Value"], type: "cancellation", priority: "high", reason: "Cancelled Session", context: "Need to reschedule", value: 450, timeAgo: "2 hours ago", customerData: { lastVisit: "6 weeks ago", totalSpend: 3200, visits: 8 } },
        ],
        stats: {
            name: "Dr. Emily (MedSpa)", todayCalls: 8, todayBookings: 5, todayEarnings: 1200,
            monthBookings: 45, monthEarnings: 12500, conversionRate: 42,
            callTarget: 15, bookingTarget: 8, earningsTarget: 2000
        },
        team: [
            { id: "1", name: "Dr. Emily", avatar: "DE", bookings: 45, calls: 120, rate: 42, earnings: 12500, isYou: true },
            { id: "2", name: "Sarah RN", avatar: "SR", bookings: 60, calls: 150, rate: 38, earnings: 18000, isYou: false },
            { id: "3", name: "Jessica Aest.", avatar: "JA", bookings: 30, calls: 80, rate: 35, earnings: 6000, isYou: false },
        ],
        queue: [
            { id: "q1", name: "Rachel Green", phone: "+1 604-555-8899", vehicle: "CoolSculpting", issue: "Consultation follow-up", heat: "hot", lastContact: "1 day ago", value: 2400, lastVisit: "Jan 10, 2026", totalSpend: 0, visits: 1, openDeal: { service: "CoolSculpting Abdomen", value: 2400, stage: "Quote Sent" }, notes: "Thinking about it." },
            { id: "q2", name: "Monica Geller", phone: "+1 604-555-7777", vehicle: "HydraFacial", issue: "Monthly maintenance", heat: "warm", lastContact: "3 days ago", value: 199, lastVisit: "Dec 12, 2025", totalSpend: 2400, visits: 12, notes: "Loves the booster add-on." },
            { id: "q3", name: "Phoebe Buffay", phone: "+1 604-555-6666", vehicle: "Chemical Peel", issue: "New inquiry", heat: "cold", lastContact: "1 week ago", value: 150, lastVisit: undefined, totalSpend: 0, visits: 0, notes: "Asked about downtime." }
        ],
        chart: [
            { day: "Mon", calls: 20, sms: 10 }, { day: "Tue", calls: 25, sms: 15 },
            { day: "Wed", calls: 30, sms: 20 }, { day: "Thu", calls: 28, sms: 18 },
            { day: "Fri", calls: 35, sms: 25 }, { day: "Sat", calls: 40, sms: 30 }, { day: "Sun", calls: 15, sms: 5 }
        ]
    },

    // ================= DENTAL =================
    dental: {
        actions: [
            { id: "d1", name: "Tom Holland", phone: "+1 604-555-1010", vehicle: "Invisalign Inquiry", tags: ["High Value"], type: "missed_call", priority: "urgent", reason: "Missed call", context: "Invisalign specials", value: 5000, timeAgo: "30 min ago", customerData: { lastVisit: "6 months ago", totalSpend: 1500 } },
            { id: "d2", name: "Zendaya C.", phone: "+1 604-555-2020", vehicle: "Whitening", tags: ["Cosmetic"], type: "no_show", priority: "medium", reason: "No-show", context: "Zoom Whitening", value: 600, timeAgo: "2 hours ago", customerData: { lastVisit: "1 year ago", totalSpend: 400 } },
        ],
        stats: {
            name: "Dr. Smile (Dental)", todayCalls: 12, todayBookings: 8, todayEarnings: 4500,
            monthBookings: 80, monthEarnings: 45000, conversionRate: 55,
            callTarget: 20, bookingTarget: 10, earningsTarget: 5000
        },
        team: [
            { id: "1", name: "Dr. Smile", avatar: "DS", bookings: 80, calls: 140, rate: 55, earnings: 45000, isYou: true },
            { id: "2", name: "Hannah Hyg.", avatar: "HH", bookings: 120, calls: 200, rate: 60, earnings: 24000, isYou: false },
            { id: "3", name: "David Admin", avatar: "DA", bookings: 40, calls: 180, rate: 22, earnings: 0, isYou: false },
        ],
        queue: [
            { id: "q1", name: "Chris Evans", phone: "+1 604-555-3030", vehicle: "Implant #19", issue: "Accept treatment plan", heat: "hot", lastContact: "yesterday", value: 4500, lastVisit: "Jan 12, 2026", totalSpend: 800, visits: 2, openDeal: { service: "Implant #19", value: 4500, stage: "Proposal Sent" }, notes: "Insurance covers 50%." },
            { id: "q2", name: "Scarlett J.", phone: "+1 604-555-4040", vehicle: "Root Canal", issue: "Pain in upper right", heat: "hot", lastContact: "1 hour ago", value: 1200, lastVisit: "Nov 2025", totalSpend: 5000, visits: 5, notes: "Needs asap appt." },
        ],
        chart: [
            { day: "Mon", calls: 40, sms: 10 }, { day: "Tue", calls: 35, sms: 12 },
            { day: "Wed", calls: 45, sms: 15 }, { day: "Thu", calls: 50, sms: 20 },
            { day: "Fri", calls: 40, sms: 15 }, { day: "Sat", calls: 10, sms: 2 }, { day: "Sun", calls: 5, sms: 1 }
        ]
    }
};

export function getDemoMode(hostname: string): Industry {
    if (hostname.includes("medspa")) return "medspa";
    if (hostname.includes("dental")) return "dental";
    if (hostname.includes("auto")) return "auto";
    if (hostname === "app.neucler.com" || hostname === "localhost") return "real";
    return "auto";
}
