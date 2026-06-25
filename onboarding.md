# Abhinandan App — Onboarding & Setup Guide

This document lists every configuration step needed to go from the current placeholder state to a fully live production app.

---

## 1. Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- A Razorpay account (test mode for development)
- An Android phone at the shop for SMS forwarding
- A UPI-enabled bank account for the shop

---

## 2. Environment Variables (`.env.local`)

Open `/Users/admin/Documents/Abhinandan/abhinandan-app/.env.local` and fill in every placeholder:

### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```
Where to find these:
- Go to Supabase Dashboard → Your Project → Settings → API
- `Project URL` → NEXT_PUBLIC_SUPABASE_URL
- `anon public` key → NEXT_PUBLIC_SUPABASE_ANON_KEY
- `service_role secret` key → SUPABASE_SERVICE_ROLE_KEY

### Razorpay
```
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```
Where to find these:
- Razorpay Dashboard → Settings → API Keys
- For webhook secret: Razorpay Dashboard → Webhooks → Create webhook → copy secret

### UPI / Payments
```
MERCHANT_UPI_VPA=yourshopname@upi
MERCHANT_NAME=Abhinandan Tea & Snacks
TEA_PRICE_PER_CUP=12
```
- `MERCHANT_UPI_VPA`: Your shop's UPI ID (e.g., abhinandan@ybl or abhinandan@paytm)
- `TEA_PRICE_PER_CUP`: Price of one cup of tea in rupees (default: 12). The SMS auto-detection uses this — any UPI payment divisible by this number = tea order.

### SMS Forwarder
```
SMS_FORWARDER_SECRET=CHOOSE_A_RANDOM_STRONG_SECRET
```
- Generate any strong random string (e.g., 32 random characters)
- You will enter the same secret in the Android SMS Forwarder app

### Fast2SMS (for token ready notifications)
```
FAST2SMS_API_KEY=YOUR_FAST2SMS_KEY
```
- Sign up at fast2sms.com → API → copy your API key
- Used to send SMS to customers when their order is ready

### Database
```
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```
- Supabase Dashboard → Settings → Database → Connection string (Transaction mode)

---

## 3. Supabase Database Setup

### Step 1: Run the Prisma migration
```bash
cd /Users/admin/Documents/Abhinandan/abhinandan-app
npx prisma db push
```
This creates all tables from `prisma/schema.prisma`.

### Step 2: Set up Supabase Auth
In Supabase Dashboard → Authentication:
1. Go to Settings → Auth → Enable Email/Password sign-in
2. Create users for each staff member:
   - Email: suresh@abhinandan.com, role: owner
   - Email: ramesh@abhinandan.com, role: snacks_staff
   - Email: sunita@abhinandan.com, role: tea_staff
   - Email: anita@abhinandan.com, role: section_manager

### Step 3: Set up Row Level Security (RLS)
Run these policies in Supabase SQL Editor:

```sql
-- Allow staff to read all orders
CREATE POLICY "staff_read_orders" ON "Order"
  FOR SELECT TO authenticated USING (true);

-- Allow staff to create orders
CREATE POLICY "staff_create_orders" ON "Order"
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow owner/manager to read all data
CREATE POLICY "owner_all" ON "Order"
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'owner');
```

### Step 4: Set up Realtime
In Supabase Dashboard → Database → Replication:
- Enable Realtime for: `Order`, `TeaQuickEntry`, `Token` tables

---

## 4. Razorpay Setup

### Step 1: Create a webhook
In Razorpay Dashboard → Webhooks:
1. Click "Add New Webhook"
2. Webhook URL: `https://YOUR_DOMAIN.com/api/payments/webhook`
3. Secret: use the same value as `RAZORPAY_WEBHOOK_SECRET` in .env.local
4. Events to subscribe: `payment.captured`

### Step 2: Test mode vs Live mode
- Use `rzp_test_*` keys for development (test card: 4111 1111 1111 1111)
- Switch to `rzp_live_*` keys in production

---

## 5. UPI QR Setup

### Option A: Use existing UPI ID
If the shop already has a UPI ID (Google Pay / PhonePe business / Paytm):
1. Set `MERCHANT_UPI_VPA=yourshopname@upi` in .env.local
2. The `/order` page QR code will automatically use this

### Option B: Generate a static shop QR
1. Go to your UPI app (Google Pay / PhonePe)
2. Generate a merchant QR code for the shop
3. Print and stick it at the shop counter
4. Customers scan this for quick payment (SMS auto-detection flow)

---

## 6. SMS Auto-Detection (Android SMS Forwarder)

### Requirements
- An Android phone that receives the shop's UPI payment SMS notifications
- The SMS Forwarder app (search "SMS Forwarder webhook" on Google Play) or any app that supports HTTP webhooks

### Configuration
1. Install SMS Forwarder on the shop's Android phone
2. In the app settings:
   - **Webhook URL**: `https://YOUR_DOMAIN.com/api/sms`
   - **Authorization Header**: `x-sms-signature: YOUR_HMAC_SHA256_SIGNATURE`
     (the app computes this using SMS_FORWARDER_SECRET — or configure the secret directly in the app)
   - **Filter**: Bank names (HDFC, SBI, ICICI, Axis, Kotak, Paytm, PhonePe, UPI credit)
3. Set `SMS_FORWARDER_SECRET` in .env.local to the same secret configured in the app
4. Test by sending a Rs.12, Rs.24, or Rs.36 UPI payment to the shop — it should appear in `/tea-monitor`

### How it works
```
Customer pays Rs.36 → Bank SMS: "Credited Rs.36.00 via UPI" →
SMS Forwarder → POST /api/sms → 36 % 12 === 0 → 3 cups logged as Tea order
```

---

## 7. Deployment

### Deploy to Vercel (recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
cd /Users/admin/Documents/Abhinandan/abhinandan-app
vercel

# Set environment variables in Vercel dashboard
# Project → Settings → Environment Variables
# Add all variables from .env.local
```

### After deployment
1. Update Razorpay webhook URL to your Vercel domain
2. Update SMS Forwarder webhook URL to your Vercel domain
3. Update the SMS Forwarder endpoint shown in the Settings page to use the real domain

---

## 8. Test Checklist (before going live)

| Test | How to verify |
|---|---|
| Login flow | Login with suresh → /dashboard; ramesh → /counter; sunita → /tea-entry |
| Customer order | Open /order, add items, go to review, check UPI links open payment app |
| Token issue | At /counter, add items, click Issue Token — token number increments |
| Tea entry save | At /tea-entry, enter quantities, Save — check Supabase table for new row |
| SMS auto-detect | Send Rs.12 UPI to shop phone — event appears in /tea-monitor |
| Payment webhook | Use Razorpay test mode → create order → complete with test card → order status = paid |
| Sidebar navigation | Click every sidebar link — verify correct page loads |
| Mobile responsive | Open each page on phone screen — check no horizontal overflow |
| Daily token reset | Token counter resets to #001 at configured time |

---

## 9. Placeholder Values to Replace in Code

These are still hardcoded as placeholders — update them once you have real values:

| File | Line | Placeholder | Real value needed |
|---|---|---|---|
| `app/order/page.tsx` | ~16 | `"abhinandan@upi"` | Real merchant UPI VPA |
| `app/settings/page.tsx` | ~77 | `"abhinandan@upi"` | Real merchant UPI VPA |
| `app/settings/page.tsx` | ~116 | `"https://your-domain.com/api/sms"` | Real deployed URL |
| `app/counter/page.tsx` | ~75 | `"Ramesh · Evening Shift"` | Read from auth session |
| `app/tea-entry/page.tsx` | ~57 | `"Sunita ▾"` | Read from auth session |
| `app/dashboard/page.tsx` | ~58 | `"Good evening, Suresh"` | Read from auth session |
| `app/section-dashboard/page.tsx` | ~16 | `DEMO_SECTION: "snacks"` | Read from user.section in DB |

---

## 10. Quick Start (local dev)

```bash
cd /Users/admin/Documents/Abhinandan/abhinandan-app

# 1. Install dependencies
npm install

# 2. Copy .env.local template and fill in values
# (file already exists with placeholders)

# 3. Start dev server
npm run dev

# 4. Open browser
open http://localhost:3000
```

Demo credentials (local/mock — any password works):

| Role | Username | Password |
|---|---|---|
| Owner | suresh | any |
| Section Manager | manager | any |
| Snacks Staff | ramesh | any |
| Tea Staff | sunita | any |
| Customer | — | no login needed, open /order directly |
