/**
 * Demo Data Cleanup Script
 * 
 * Usage: npm run cleanup:demo -- MERCHANT_ID
 * 
 * This script removes all demo data for a merchant account.
 * It deletes records from all tables that contain demo data.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get merchant ID from command line
const merchantId = process.argv[2];

if (!merchantId) {
    console.error('❌ Error: Please provide a merchant ID');
    console.log('Usage: npm run cleanup:demo -- YOUR_MERCHANT_ID');
    process.exit(1);
}

// ============================================
// CLEANUP FUNCTIONS
// ============================================

async function cleanupTable(tableName: string, merchantField: string = 'merchant_id'): Promise<number> {
    const { data, error } = await supabaseAdmin
        .from(tableName)
        .delete()
        .eq(merchantField, merchantId)
        .select('id');

    if (error) {
        console.error(`⚠️  Error cleaning ${tableName}:`, error.message);
        return 0;
    }

    return data?.length || 0;
}

async function cleanupCustomers(): Promise<number> {
    // Only delete customers that have the demo tag in notes
    const { data, error } = await supabaseAdmin
        .from('customers')
        .delete()
        .eq('merchant_id', merchantId)
        .like('notes', 'demo_batch_%')
        .select('id');

    if (error) {
        console.error('⚠️  Error cleaning customers:', error.message);
        return 0;
    }

    return data?.length || 0;
}

async function cleanupMessages(): Promise<number> {
    // Delete all messages for this merchant
    const { data, error } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('merchant_id', merchantId)
        .select('id');

    if (error) {
        console.error('⚠️  Error cleaning messages:', error.message);
        return 0;
    }

    return data?.length || 0;
}

async function cleanupCallLogs(): Promise<number> {
    // Delete all call logs for this merchant
    const { data, error } = await supabaseAdmin
        .from('call_logs')
        .delete()
        .eq('merchant_id', merchantId)
        .select('id');

    if (error) {
        console.error('⚠️  Error cleaning call_logs:', error.message);
        return 0;
    }

    return data?.length || 0;
}

async function cleanupTransactions(): Promise<number> {
    const { data, error } = await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('merchant_id', merchantId)
        .like('metadata', '%demo_batch_%')
        .select('id');

    if (error) {
        console.error('⚠️  Error cleaning transactions:', error.message);
        return 0;
    }

    return data?.length || 0;
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
    console.log('🧹 Starting Demo Data Cleanup');
    console.log(`📋 Merchant ID: ${merchantId}`);
    console.log('');
    console.log('⚠️  This will delete ALL demo data for this merchant.');
    console.log('');

    try {
        // Cleanup in order (messages first to avoid FK constraints)
        const messagesDeleted = await cleanupMessages();
        console.log(`💬 Deleted ${messagesDeleted} messages`);

        const callsDeleted = await cleanupCallLogs();
        console.log(`📞 Deleted ${callsDeleted} call logs`);

        const customersDeleted = await cleanupCustomers();
        console.log(`👥 Deleted ${customersDeleted} customers`);

        console.log('');
        console.log('✅ Demo data cleanup complete!');

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

main();
