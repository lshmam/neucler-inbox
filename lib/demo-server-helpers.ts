
import { DEMO_DATA, Industry } from "./demo-data";
import { addDays, subDays, subHours, subMinutes } from "date-fns";

// ================= TYPES =================
// These mirror the types expected by the client components

export interface DemoTicket {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    vehicle?: {
        year: string;
        make: string;
        model: string;
        color?: string;
        vin?: string;
    };
    vehicleYear?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    serviceRequested?: string;
    ltv?: number;
    lastVisit?: string;
    unread: boolean;
    lastMessageAt: string;
    ticket?: {
        id: string;
        number: number;
        subject: string;
        status: "open" | "waiting" | "resolved";
        priority: "low" | "normal" | "high";
        assignee?: string;
        createdAt: string;
    };
    messages: any[];
    deal?: {
        id: string;
        title: string;
        stage: "new_inquiry" | "quote_sent" | "follow_up" | "booked";
        value: number;
    };
    tags: string[];
    pastTickets: any[];
}

export interface DemoCustomer {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    phone: string;
    email: string;
    vehicles: { year: string; make: string; model: string; }[];
    totalSpend: number;
    lastVisit: string;
    tags: string[];
    isVip: boolean;
    isFleet: boolean;
    status: string;
    last_contacted_at?: string;
}

export interface DemoArticle {
    id: string;
    title: string;
    content: string;
    category: string | null;
    is_published: boolean;
    created_at: string;
}

export interface DemoKBData {
    articles: DemoArticle[];
    ai_name: string;
    ai_tone: string;
}

// ================= HELPERS =================

export function getDemoServiceDeskTickets(industry: Industry): DemoTicket[] {
    const data = DEMO_DATA[industry] || DEMO_DATA.auto;
    const queue = data.queue || [];
    const actions = data.actions || [];

    // Combine queue and actions to verify we have enough data
    const allItems = [...queue, ...actions];

    return allItems.map((item, index) => {
        const isAction = 'type' in item;
        const customerName = item.name;
        const customerPhone = item.phone;

        // Parse vehicle string if possible (e.g. "2020 Toyota RAV4")
        let vehicle = { year: "2020", make: "Toyota", model: "RAV4" };
        const vehicleStr = item.vehicle || "";
        const parts = vehicleStr.split(" ");
        if (parts.length >= 3 && !isNaN(Number(parts[0]))) {
            vehicle = { year: parts[0], make: parts[1], model: parts.slice(2).join(" ") };
        } else if (industry !== 'auto') {
            // For non-auto, vehicle acts as service/treatment
            vehicle = { year: "", make: "", model: vehicleStr };
        }

        const now = new Date();
        const lastMessageTime = subMinutes(now, Math.random() * 60 * 24).toISOString();

        return {
            id: item.id,
            customerId: `cust-${item.id}`,
            customerName,
            customerPhone,
            vehicle: industry === 'auto' ? vehicle : undefined,
            vehicleYear: industry === 'auto' ? vehicle.year : undefined,
            vehicleMake: industry === 'auto' ? vehicle.make : undefined,
            vehicleModel: industry === 'auto' ? vehicle.model : undefined,
            serviceRequested: industry !== 'auto' ? item.vehicle : (item as any).issue || "Service",
            ltv: (item as any).totalSpend || (item.value * 5),
            lastVisit: (item as any).lastVisit || subDays(now, 30).toISOString(),
            unread: index < 2, // First 2 are unread
            lastMessageAt: lastMessageTime,
            ticket: {
                id: `ticket-${item.id}`,
                number: 1000 + index,
                subject: (item as any).issue || (item as any).reason || "Inquiry",
                status: index % 3 === 0 ? "open" : "waiting",
                priority: (item as any).priority === "urgent" || (item as any).heat === "hot" ? "high" : "normal",
                assignee: "You",
                createdAt: subDays(now, 1).toISOString()
            },
            messages: [
                {
                    id: `msg-${item.id}-1`,
                    type: "customer",
                    content: (item as any).notes || "Hello, I have a question about my service.",
                    sender: customerName,
                    timestamp: subMinutes(now, 60).toISOString(),
                    channel: "sms"
                },
                {
                    id: `msg-${item.id}-2`,
                    type: "agent",
                    content: "Hi there! I can help with that. What works best for you?",
                    sender: "Shop",
                    timestamp: subMinutes(now, 30).toISOString(),
                    channel: "sms"
                }
            ],
            deal: (item as any).openDeal ? {
                id: `deal-${item.id}`,
                title: (item as any).openDeal.service,
                stage: (item as any).openDeal.stage.includes("Quote") ? "quote_sent" : "new_inquiry",
                value: (item as any).openDeal.value
            } : undefined,
            tags: (item as any).tags || [],
            pastTickets: []
        };
    });
}

export function getDemoCustomers(industry: Industry): DemoCustomer[] {
    const data = DEMO_DATA[industry] || DEMO_DATA.auto;
    const queue = data.queue || [];
    const actions = data.actions || [];

    // Create unique list of customers from queue and actions
    const allItems = [...queue, ...actions];
    const uniqueCustomers = new Map<string, DemoCustomer>();

    allItems.forEach(item => {
        if (uniqueCustomers.has(item.phone)) return;

        // Parse vehicle
        let vehicles = [];
        const vehicleStr = item.vehicle || "";
        if (industry === 'auto') {
            const parts = vehicleStr.split(" ");
            if (parts.length >= 3 && !isNaN(Number(parts[0]))) {
                vehicles.push({ year: parts[0], make: parts[1], model: parts.slice(2).join(" ") });
            }
        }

        const names = item.name.split(" ");

        uniqueCustomers.set(item.phone, {
            id: `cust-${item.id}`,
            name: item.name,
            first_name: names[0],
            last_name: names.slice(1).join(" "),
            phone: item.phone,
            email: `${names[0].toLowerCase()}@example.com`,
            vehicles: vehicles,
            totalSpend: (item as any).totalSpend || item.value || 0,
            lastVisit: (item as any).lastVisit || new Date().toISOString(),
            tags: (item as any).tags || [],
            isVip: (item as any).totalSpend > 2000 || (item as any).tags?.includes("VIP"),
            isFleet: (item as any).tags?.includes("Fleet") || false,
            status: "active",
            last_contacted_at: new Date().toISOString()
        });
    });

    return Array.from(uniqueCustomers.values());
}

export function getDemoKBData(industry: Industry): DemoKBData {
    const commonArticles: DemoArticle[] = [
        {
            id: 'kb-1',
            title: 'What are your hours of operation?',
            content: "We are open Monday to Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 4:00 PM. We are closed on Sundays.",
            category: 'General',
            is_published: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'kb-2',
            title: 'Do you offer financing?',
            content: "Yes, we partner with several financing providers to offer flexible payment plans for services over $500.",
            category: 'Billing',
            is_published: true,
            created_at: new Date().toISOString()
        }
    ];

    const autoArticles: DemoArticle[] = [
        {
            id: 'kb-auto-1',
            title: 'How much is an oil change?',
            content: "Our standard synthetic blend oil change starts at $69.99 for most passenger vehicles. Full synthetic starts at $89.99. This includes a multi-point inspection.",
            category: 'Pricing',
            is_published: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'kb-auto-2',
            title: 'Do you service electric vehicles?',
            content: "Yes, we are certified to perform maintenance on most EV makes including Tesla, Nissan, and Chevrolet.",
            category: 'Services',
            is_published: true,
            created_at: new Date().toISOString()
        }
    ];

    const medspaArticles: DemoArticle[] = [
        {
            id: 'kb-med-1',
            title: 'What is the downtime for a chemical peel?',
            content: "Downtime depends on the depth of the peel. Light peels have little to no downtime. Medium peels may cause peeling for 3-5 days. We will provide a custom post-care kit.",
            category: 'Services',
            is_published: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'kb-med-2',
            title: 'How much is Botox?',
            content: "Our Botox pricing is $12 per unit. Members receive a discounted rate of $10 per unit.",
            category: 'Pricing',
            is_published: true,
            created_at: new Date().toISOString()
        }
    ];

    const dentalArticles: DemoArticle[] = [
        {
            id: 'kb-dent-1',
            title: 'Do you accept insurance?',
            content: "We accept most major dental insurance plans including Delta Dental, MetLife, and Cigna. We can check your benefits prior to your appointment.",
            category: 'Billing',
            is_published: true,
            created_at: new Date().toISOString()
        },
        {
            id: 'kb-dent-2',
            title: 'How long does a cleaning take?',
            content: "A standard hygiene appointment (cleaning) typically takes 45 to 60 minutes.",
            category: 'General',
            is_published: true,
            created_at: new Date().toISOString()
        }
    ];

    let articles = commonArticles;
    let aiName = "Alex";
    let aiTone = "friendly and helpful";

    if (industry === 'auto') {
        articles = [...commonArticles, ...autoArticles];
        aiName = "AutoBot";
        aiTone = "professional and knowledgeable";
    } else if (industry === 'medspa') {
        articles = [...commonArticles, ...medspaArticles];
        aiName = "GlowAI";
        aiTone = "warm, inviting, and discreet";
    } else if (industry === 'dental') {
        articles = [...commonArticles, ...dentalArticles];
        aiName = "ToothFairy";
        aiTone = "gentle and reassuring";
    }

    return {
        articles,
        ai_name: aiName,
        ai_tone: aiTone
    };
}
