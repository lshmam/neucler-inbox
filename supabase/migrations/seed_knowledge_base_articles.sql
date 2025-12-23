-- Seed knowledge base articles for auto body shops
-- These are general articles that can be used as a starting point

-- This will insert articles for the first merchant found in your database
-- If you have multiple merchants, replace the SELECT with your specific platform_merchant_id

DO $$
DECLARE
    target_merchant_id text;
BEGIN
    -- Get the first merchant's platform_merchant_id (or specify yours directly)
    SELECT platform_merchant_id INTO target_merchant_id FROM public.merchants LIMIT 1;
    
    IF target_merchant_id IS NULL THEN
        RAISE EXCEPTION 'No merchants found in database. Please create a merchant first.';
    END IF;
    
    RAISE NOTICE 'Inserting articles for merchant: %', target_merchant_id;

-- ============ SERVICES CATEGORY ============
INSERT INTO public.knowledge_base_articles (merchant_id, title, content, category, is_published) VALUES
(target_merchant_id, 'What services do you offer?', 
'We offer a full range of auto body services including:

• Collision repair and body work
• Dent removal (PDR - Paintless Dent Repair)
• Auto painting and refinishing  
• Frame straightening
• Bumper repair and replacement
• Scratch and scuff repair
• Windshield and glass replacement
• Insurance claim assistance
• Free estimates

We work on all makes and models. Call us for a free quote!', 'Services', true),

(target_merchant_id, 'Do you do paintless dent repair (PDR)?', 
'Yes! We specialize in Paintless Dent Repair (PDR) for minor dents and dings. This technique:

• Preserves your original factory paint
• Is faster than traditional repair (often same-day)
• Costs less than conventional body work
• Works great for hail damage and door dings

PDR works best on dents that haven''t cracked the paint. We''ll assess your damage and recommend the best approach.', 'Services', true),

(target_merchant_id, 'Can you match my car''s paint color?', 
'Absolutely! We use computerized paint matching technology to perfectly match your vehicle''s original color. Our process includes:

• Scanning your vehicle''s paint code
• Computer color matching for exact shade
• Test sprays to verify the match
• Blending techniques for seamless results

Even if your car has faded over time, we can adjust the formula to match. Your repair will be invisible!', 'Services', true);

-- ============ PRICING CATEGORY ============
INSERT INTO public.knowledge_base_articles (merchant_id, title, content, category, is_published) VALUES
(target_merchant_id, 'How much does a typical repair cost?', 
'Repair costs vary based on the extent of damage. Here are some typical ranges:

• Minor scratches/scuffs: $150-$400
• Small dents (PDR): $75-$200 per panel
• Bumper repair: $300-$700
• Bumper replacement: $600-$1,500
• Fender repair: $400-$800
• Full paint job: $3,000-$8,000

We offer FREE estimates! Bring your vehicle in or send us photos for a quick quote.', 'Pricing', true),

(target_merchant_id, 'Do you offer payment plans?', 
'Yes, we understand major repairs can be unexpected expenses. We offer:

• Interest-free financing on repairs over $500
• Multiple payment options (credit cards, debit, cash)
• Insurance direct billing (we work with all major insurers)
• Deductible payment plans in some cases

Ask about our current financing promotions when you come in for your estimate.', 'Pricing', true),

(target_merchant_id, 'Are your estimates free?', 
'Yes! We provide completely free, no-obligation estimates. You can:

• Come by during business hours for an in-person estimate
• Send us photos via text or email for a quick quote
• Schedule a specific appointment time

Our estimates are detailed and transparent—no hidden fees. We''ll explain exactly what needs to be done and why.', 'Pricing', true);

-- ============ SCHEDULING CATEGORY ============
INSERT INTO public.knowledge_base_articles (merchant_id, title, content, category, is_published) VALUES
(target_merchant_id, 'What are your hours?', 
'We are open:

Monday - Friday: 8:00 AM - 6:00 PM
Saturday: 9:00 AM - 3:00 PM  
Sunday: Closed

We accept drop-offs outside of regular hours by appointment. Need an evening drop-off? Just let us know!', 'Scheduling', true),

(target_merchant_id, 'How long will my repair take?', 
'Repair times depend on the type of work:

• Minor scratches: Same day to 1 day
• Small dent repair (PDR): Same day
• Bumper repair: 1-2 days
• Medium collision repair: 3-5 days
• Major collision repair: 1-3 weeks
• Full paint job: 5-7 days

We''ll give you an accurate timeline during your estimate. We can also arrange a rental car if needed!', 'Scheduling', true),

(target_merchant_id, 'Do you offer loaner cars or rental assistance?', 
'We partner with local rental agencies to help you stay on the road! We offer:

• Rental car coordination through your insurance
• Discounted rates with our partner agencies
• Pick-up and drop-off assistance
• Shuttle service to nearby locations

If you have rental coverage on your insurance, we''ll handle the paperwork for you.', 'Scheduling', true);

-- ============ BILLING / INSURANCE CATEGORY ============  
INSERT INTO public.knowledge_base_articles (merchant_id, title, content, category, is_published) VALUES
(target_merchant_id, 'Do you work with insurance companies?', 
'Yes! We work with ALL major insurance companies including:

• State Farm, Allstate, Progressive
• GEICO, Liberty Mutual, Farmers
• USAA, Nationwide, AAA
• And many more...

We handle the entire claims process for you—from estimate submission to final payment. You have the right to choose YOUR repair shop, not who the insurance company recommends.', 'Billing', true),

(target_merchant_id, 'How does the insurance claim process work?', 
'We make the claims process easy:

1. File a claim with your insurance (or we can help)
2. Get your claim number
3. Bring your vehicle to us for an estimate
4. We submit the estimate to your insurance
5. Once approved, we schedule your repair
6. You pay only your deductible (if applicable)

We communicate directly with your adjuster so you don''t have to. Most claims are processed within 2-3 business days.', 'Billing', true),

(target_merchant_id, 'I don''t want to go through insurance. Is that okay?', 
'Absolutely! Many customers prefer to pay out-of-pocket, especially for:

• Minor damage that might increase premiums
• Cosmetic work not covered by insurance
• Customers with high deductibles

We offer competitive cash pricing and payment plans. Sometimes paying out-of-pocket is more economical than filing a claim.', 'Billing', true);

-- ============ TECHNICAL CATEGORY ============
INSERT INTO public.knowledge_base_articles (merchant_id, title, content, category, is_published) VALUES
(target_merchant_id, 'Is my car safe to drive after an accident?', 
'It depends on the damage. Your car may NOT be safe if:

• Airbags deployed
• Significant frame damage
• Leaking fluids (coolant, oil, brake fluid)
• Damaged steering or suspension
• Broken lights (especially brake lights)
• Cracked windshield blocking vision

When in doubt, have it towed rather than risk further damage or injury. We offer towing assistance and can assess safety when you arrive.', 'Technical', true),

(target_merchant_id, 'Do you repair frame damage?', 
'Yes, we have state-of-the-art frame straightening equipment. Our process:

• Computerized measuring for precision alignment
• Factory specifications for your exact vehicle
• Certified technicians with frame repair expertise
• Post-repair documentation for your records

A proper frame repair restores your vehicle''s structural integrity and safety. We stand behind our frame work with a lifetime warranty.', 'Technical', true),

(target_merchant_id, 'What type of paint do you use?', 
'We use only premium automotive paints:

• OEM-quality basecoat/clearcoat systems
• UV-resistant finishes that won''t fade
• Environmentally-friendly waterborne paints
• Exact color matching technology

All our paint work includes our warranty. We take pride in finishes that look factory-fresh!', 'Technical', true);

-- ============ FAQ CATEGORY ============
INSERT INTO public.knowledge_base_articles (merchant_id, title, content, category, is_published) VALUES
(target_merchant_id, 'What should I do after a car accident?', 
'Follow these steps after an accident:

1. Check for injuries and call 911 if needed
2. Move to a safe location if possible
3. Exchange information with other driver(s)
4. Take photos of all damage and the scene
5. File a police report
6. Contact your insurance company
7. Call us for your free repair estimate!

Don''t admit fault at the scene. Document everything with photos before vehicles are moved.', 'FAQ', true),

(target_merchant_id, 'Do you offer a warranty on repairs?', 
'Yes! We stand behind our work with comprehensive warranties:

• Lifetime warranty on body work and paint
• Warranty valid as long as you own the vehicle
• Covers materials AND labor
• Transferable to new owner if you sell

If there''s ever an issue with our repair, bring it back and we''ll make it right—no questions asked.', 'FAQ', true),

(target_merchant_id, 'Where are you located?', 
'We are conveniently located at [YOUR ADDRESS HERE]. 

Easy to find with plenty of parking! Look for our sign on the main road.

Can''t drive your car? We offer towing assistance. Just give us a call!', 'FAQ', true);

-- ============ GENERAL CATEGORY ============
INSERT INTO public.knowledge_base_articles (merchant_id, title, content, category, is_published) VALUES
(target_merchant_id, 'Why should I choose your shop?', 
'Here''s what sets us apart:

✓ Certified technicians with years of experience
✓ State-of-the-art equipment and technology
✓ Lifetime warranty on all repairs
✓ We work with ALL insurance companies
✓ Free estimates and transparent pricing
✓ Rental car assistance available
✓ Family-owned, community trusted

We treat every car like it''s our own. Your satisfaction is our priority!', 'General', true),

(target_merchant_id, 'Are your technicians certified?', 
'Yes! Our technicians are fully certified:

• I-CAR Gold Class certified shop
• ASE certified technicians
• OEM training for specific manufacturers
• Ongoing education and training

We invest in our team because quality repairs require skilled professionals.', 'General', true);

END $$;
