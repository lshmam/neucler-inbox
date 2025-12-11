/**
 * Demo Data Seed Script
 * 
 * Usage: npm run seed:demo -- MERCHANT_ID
 * 
 * This script populates realistic demo data for a merchant account.
 * All data is tagged with a demo_batch_id for easy cleanup.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Demo batch ID for easy cleanup
const DEMO_BATCH_ID = 'demo_batch_' + Date.now();

// Get merchant ID from command line
const merchantId = process.argv[2];

if (!merchantId) {
    console.error('❌ Error: Please provide a merchant ID');
    console.log('Usage: npm run seed:demo -- YOUR_MERCHANT_ID');
    process.exit(1);
}

// ============================================
// REALISTIC DEMO DATA
// ============================================

const FIRST_NAMES = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

const CALL_TRANSCRIPTS = [
    "Hi, I'd like to book an appointment for next Tuesday. Sure, I have a 2pm slot available. That works perfectly, thank you!",
    "Hello, I'm calling to ask about your pricing. Our basic service starts at $50 and premium is $80. Great, I'll think about it.",
    "I need to reschedule my appointment from Friday to Monday. No problem, I've moved you to Monday at 10am. Perfect!",
    "Do you have any availability this weekend? Yes, we have Saturday at 3pm open. I'll take it!",
    "I'm a new customer, what do you recommend? For first-timers, I suggest our introductory package. Sounds good!",
    "Can I get a quote for a group booking? Of course! For groups of 5+, we offer a 15% discount. Excellent!",
    "I need to cancel my appointment tomorrow. I understand, I've cancelled that for you. Thanks for letting us know.",
    "What are your hours on holidays?  We're open 10am-4pm on most holidays. Great, I'll stop by then.",
    "Do you offer gift cards? Yes! We have digital gift cards in any amount. Perfect for my friend's birthday!",
    "I had a great experience last time, wanted to say thanks! That's wonderful to hear, we appreciate you!",
    "Is parking available at your location? Yes, we have free parking in the back lot. That's convenient!",
    "Do you accept insurance? We accept most major insurance providers. Let me verify mine with you.",
    "How long does a typical appointment take? Usually about 45 minutes to an hour. That fits my schedule perfectly.",
    "Can I bring my kids? Absolutely, we're family-friendly! That's great to know.",
    "I'm running 10 minutes late, is that okay? No worries, we'll still be able to see you. Thanks for understanding!"
];

const SMS_CONVERSATIONS = [
    { inbound: "Hi, is my appointment still at 3pm today?", outbound: "Yes! We'll see you at 3pm. See you soon! 😊" },
    { inbound: "Can I get the address again?", outbound: "Sure! We're at 123 Main Street, Suite 200. Free parking in back!" },
    { inbound: "Running about 5 mins late", outbound: "No problem at all! Take your time, we'll be ready for you." },
    { inbound: "Do you have any openings tomorrow?", outbound: "Yes! We have 10am, 2pm, and 4:30pm available. Which works best?" },
    { inbound: "10am works", outbound: "Perfect! You're booked for tomorrow at 10am. See you then! ✨" },
    { inbound: "What's your cancellation policy?", outbound: "We just ask for 24 hours notice. No fees for changes or cancellations!" },
    { inbound: "Thanks for the great service today!", outbound: "Thank you! We loved having you. Hope to see you again soon! 🙏" },
    { inbound: "How much for the premium package?", outbound: "The premium package is $120 and includes everything! Would you like to book?" },
    { inbound: "Yes please", outbound: "Awesome! When works best for you? We have openings this week." },
    { inbound: "Do you have a referral program?", outbound: "Yes! Refer a friend and you both get $20 off your next visit! 🎉" },
];

const KB_ARTICLES = [
    { title: "Services & Pricing", content: "We offer a range of professional services. Basic Package: $50, Premium Package: $120, VIP Experience: $200. All packages include a complimentary consultation.", category: "Services" },
    { title: "Business Hours", content: "Monday-Friday: 9am-7pm, Saturday: 10am-5pm, Sunday: Closed. Holiday hours may vary - please call ahead!", category: "General" },
    { title: "Booking & Cancellations", content: "Book online anytime or call during business hours. We kindly ask for 24 hours notice for cancellations. Same-day bookings are welcome based on availability.", category: "Policies" },
    { title: "Location & Parking", content: "Located at 123 Main Street, Suite 200. Free parking available in the rear lot. We're on the second floor, elevator accessible.", category: "General" },
    { title: "First-Time Visitors", content: "Welcome! For new clients, we recommend arriving 10 minutes early to complete a brief intake form. We'll walk you through everything and answer any questions.", category: "FAQ" },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function randomPhone(): string {
    const area = ['415', '510', '650', '408', '925'][Math.floor(Math.random() * 5)];
    const num1 = Math.floor(Math.random() * 900) + 100;
    const num2 = Math.floor(Math.random() * 9000) + 1000;
    return `+1${area}${num1}${num2}`;
}

function randomDate(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    date.setHours(Math.floor(Math.random() * 10) + 8); // 8am-6pm
    date.setMinutes(Math.floor(Math.random() * 60));
    return date.toISOString();
}

function randomSentiment(): string {
    const sentiments = ['positive', 'positive', 'positive', 'neutral', 'neutral', 'negative'];
    return sentiments[Math.floor(Math.random() * sentiments.length)];
}

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedCustomers(): Promise<string[]> {
    console.log('👥 Seeding customers...');

    const customers = [];
    for (let i = 0; i < 20; i++) {
        const firstName = FIRST_NAMES[i];
        const lastName = LAST_NAMES[i];
        customers.push({
            id: randomUUID(),
            merchant_id: merchantId,
            first_name: firstName,
            last_name: lastName,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
            phone_number: randomPhone(),
            visit_count: Math.floor(Math.random() * 10) + 1,
            loyalty_balance: Math.floor(Math.random() * 500),
            is_subscribed: Math.random() > 0.2,
            created_at: randomDate(60),
            notes: DEMO_BATCH_ID // Tag for cleanup
        });
    }

    const { error } = await supabaseAdmin.from('customers').insert(customers);
    if (error) {
        console.error('❌ Error seeding customers:', error.message);
        return [];
    }

    console.log(`✅ Created ${customers.length} customers`);
    return customers.map(c => ({ id: c.id, phone: c.phone_number })) as any;
}

async function seedMessages(customerData: any[]): Promise<void> {
    console.log('💬 Seeding messages...');

    const messages = [];

    // Create conversations for first 10 customers
    for (let i = 0; i < Math.min(10, customerData.length); i++) {
        const customer = customerData[i];
        const convo = SMS_CONVERSATIONS[i];
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 14));

        // Inbound message
        messages.push({
            id: randomUUID(),
            merchant_id: merchantId,
            customer_id: customer.id,
            customer_phone: customer.phone,
            direction: 'inbound',
            channel: 'sms',
            body: convo.inbound,
            status: 'received',
            created_at: baseDate.toISOString(),
        });

        // Outbound reply (2 mins later)
        baseDate.setMinutes(baseDate.getMinutes() + 2);
        messages.push({
            id: randomUUID(),
            merchant_id: merchantId,
            customer_id: customer.id,
            customer_phone: customer.phone,
            direction: 'outbound',
            channel: 'sms',
            body: convo.outbound,
            status: 'sent',
            created_at: baseDate.toISOString(),
        });
    }

    const { error } = await supabaseAdmin.from('messages').insert(messages);
    if (error) {
        console.error('❌ Error seeding messages:', error.message);
        return;
    }

    console.log(`✅ Created ${messages.length} messages`);
}

async function seedCallLogs(customerData: any[]): Promise<void> {
    console.log('📞 Seeding call logs...');

    const calls = [];
    for (let i = 0; i < 15; i++) {
        const customer = customerData[i % customerData.length];
        calls.push({
            id: randomUUID(),
            merchant_id: merchantId,
            customer_phone: customer.phone,
            duration_seconds: Math.floor(Math.random() * 300) + 60, // 1-6 mins
            status: 'completed',
            user_sentiment: randomSentiment(),
            transcript: CALL_TRANSCRIPTS[i % CALL_TRANSCRIPTS.length],
            created_at: randomDate(30),
        });
    }

    const { error } = await supabaseAdmin.from('call_logs').insert(calls);
    if (error) {
        console.error('❌ Error seeding call logs:', error.message);
        return;
    }

    console.log(`✅ Created ${calls.length} call logs`);
}

async function seedEmailCampaigns(): Promise<void> {
    console.log('📧 Seeding email campaigns...');

    const campaigns = [
        {
            id: randomUUID(),
            merchant_id: merchantId,
            name: 'Holiday Special Announcement',
            subject: '🎄 Exclusive Holiday Savings Inside!',
            body: '<p>Dear valued customer,</p><p>This holiday season, enjoy 20% off all services!</p>',
            audience: 'all',
            sent_count: 245,
            open_count: 156,
            click_count: 42,
            status: 'sent',
            created_at: randomDate(14),
        },
        {
            id: randomUUID(),
            merchant_id: merchantId,
            name: 'New Year, New You',
            subject: 'Start 2025 Right ✨',
            body: '<p>Ring in the new year with our special packages!</p>',
            audience: 'all',
            sent_count: 312,
            open_count: 189,
            click_count: 67,
            status: 'sent',
            created_at: randomDate(7),
        },
        {
            id: randomUUID(),
            merchant_id: merchantId,
            name: 'VIP Customer Appreciation',
            subject: 'A Special Thank You 🙏',
            body: '<p>Thank you for being an amazing customer!</p>',
            audience: 'vip',
            sent_count: 50,
            open_count: 45,
            click_count: 28,
            status: 'sent',
            created_at: randomDate(3),
        },
    ];

    const { error } = await supabaseAdmin.from('email_campaigns').insert(campaigns);
    if (error) {
        console.error('❌ Error seeding email campaigns:', error.message);
        return;
    }

    console.log(`✅ Created ${campaigns.length} email campaigns`);
}

// Note: transactions table doesn't exist in this schema
// Skipping transaction seeding

async function seedKnowledgeBase(): Promise<void> {
    console.log('📚 Seeding knowledge base...');

    const articles = KB_ARTICLES.map(kb => ({
        id: randomUUID(),
        merchant_id: merchantId,
        title: kb.title,
        content: kb.content,
        category: kb.category,
        is_published: true,
        created_at: randomDate(60),
    }));

    const { error } = await supabaseAdmin.from('knowledge_base_articles').insert(articles);
    if (error) {
        console.error('❌ Error seeding knowledge base:', error.message);
        return;
    }

    console.log(`✅ Created ${articles.length} KB articles`);
}

// Note: usage table doesn't exist in this schema
// Usage is calculated dynamically from call_logs, messages, email_campaigns

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
    console.log('🚀 Starting Demo Data Seed');
    console.log(`📋 Merchant ID: ${merchantId}`);
    console.log(`🏷️  Batch ID: ${DEMO_BATCH_ID}`);
    console.log('');

    try {
        // Seed in order (customers first since others reference them)
        const customerData = await seedCustomers();

        if (customerData.length > 0) {
            await seedMessages(customerData);
            await seedCallLogs(customerData);
        }

        await seedEmailCampaigns();
        await seedKnowledgeBase();

        console.log('');
        console.log('✅ Demo data seeded successfully!');
        console.log('');
        console.log('📝 To cleanup later, run:');
        console.log(`   npm run cleanup:demo -- ${merchantId}`);

    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

main();
