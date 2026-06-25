# Abhinandan Tea & Snacks Centre — Feature Tracker

> Last updated: 2026-06-25
> Status legend: ✅ Done · 🔧 Partial (wired, needs real data/credential) · 🔲 Pending

---

## Roles & Access

| Role | Login Route | Home Page | Notes |
|---|---|---|---|
| Owner (admin) | /login → username: suresh | /dashboard | Full access to all pages |
| Section Manager | /login → username: *manager | /section-dashboard | Sees own section only |
| Snacks Staff | /login → username: ramesh | /counter | POS + orders view |
| Tea Staff | /login → username: sunita | /tea-entry | Tea entry + monitor |
| Customer | No login | /order | Order flow only |

---

## Flow 1: Customer Order (no login required)

| Step | Page | Status | Notes |
|---|---|---|---|
| 1. Scan QR / open menu | `/order` | ✅ Done | Menu with categories, popular strip |
| 2. Add items to cart | `/order` | ✅ Done | Cart state via Zustand, persisted |
| 3. Review order | `/order` (step=review) | ✅ Done | Edit qty, optional mobile number |
| 4. UPI payment options | `/order` (step=paying) | 🔧 Partial | Deep links built; needs real merchant VPA in .env.local |
| 5. QR code for scan-to-pay | `/order` (step=paying) | 🔧 Partial | QR generated; needs real UPI ID |
| 6. Payment confirmed | `/order` (step=confirmed) | 🔧 Partial | Razorpay webhook → DB → poll; needs Razorpay credentials |
| 7. Token issued | `/order/token` | ✅ Done | Token number, order summary, share button |
| 8. Track order live | `/token/[id]` | 🔧 Partial | Status stepper; needs Supabase Realtime for live updates |
| 9. Login nudge (optional) | `/order/token` | ✅ Done | Dismissible, slides up after 2s |

---

## Flow 2: Snacks Counter (Staff POS)

| Step | Page | Status | Notes |
|---|---|---|---|
| Login as snacks_staff | `/login` | ✅ Done | Redirects to /counter |
| View menu with categories | `/counter` | ✅ Done | 7 categories, filter tabs |
| Quick-add strip (popular) | `/counter` | ✅ Done | Horizontal scroll strip |
| Tap item → add to bill | `/counter` | ✅ Done | Click item = +1 |
| Tap bill row → remove one | `/counter` | ✅ Done | Click row = -1 |
| Mobile tab: Menu / Bill | `/counter` | ✅ Done | Tab switcher on mobile |
| Payment method toggle | `/counter` | ✅ Done | Cash / UPI pill toggle |
| Customer name / note | `/counter` | ✅ Done | Optional text input |
| Issue token | `/counter` | ✅ Done | Token from Zustand store, daily-reset counter |
| Token queue footer | `/counter` | ✅ Done | Live badge strip at bottom |
| Navigate to dashboard | `/counter` header | ✅ Done | ← Dashboard link (desktop) |

---

## Flow 3: Tea Counter (Staff Entry)

| Step | Page | Status | Notes |
|---|---|---|---|
| Login as tea_staff | `/login` | ✅ Done | Redirects to /tea-entry |
| Select shift | `/tea-entry` | ✅ Done | Morning / Evening toggle |
| Enter cup quantities per item | `/tea-entry` | ✅ Done | Number input + ±1/±10 buttons |
| View running total | `/tea-entry` | ✅ Done | Sum of all items |
| Compare with yesterday | `/tea-entry` | ✅ Done | Expandable compare panel |
| Save shift entry | `/tea-entry` | 🔧 Partial | UI saves locally; POST to /api/tea-entry needs Supabase |
| View history table | `/tea-entry` | 🔧 Partial | Hardcoded history; needs DB |
| Shift comparison chart | `/tea-entry` | 🔧 Partial | Random demo data; needs DB |
| Navigate to dashboard | sidebar / header | ✅ Done | Sidebar nav + header link |

---

## Flow 4: Tea Auto-Detection (UPI SMS)

| Step | Page | Status | Notes |
|---|---|---|---|
| Customer pays via UPI | physical QR | 🔧 Partial | QR shown in /order; needs real merchant VPA |
| Bank sends SMS to shop phone | Android SMS Forwarder app | 🔧 Partial | App must be installed on shop Android phone |
| SMS Forwarder POSTs to /api/sms | `/api/sms` | ✅ Done | HMAC-SHA256 auth, 5 bank regex patterns |
| Amount parsed & validated | `/api/sms` | ✅ Done | isTeaPayment(): amount % 12 === 0 |
| Tea order created in DB | `/api/sms` | 🔧 Partial | Needs Supabase connection |
| Tea Monitor shows live event | `/tea-monitor` | 🔧 Partial | Demo data shown; needs Supabase Realtime |
| Tea staff notified | — | 🔲 Pending | Fast2SMS integration not started |

---

## Flow 5: Owner Dashboard

| Feature | Page | Status | Notes |
|---|---|---|---|
| Daily revenue KPIs | `/dashboard` | ✅ Done | Tea + Snacks + Total |
| Revenue trend chart | `/dashboard` | ✅ Done | AreaChart (Tea vs Snacks per day) |
| Tea vs Snacks pie | `/dashboard` | ✅ Done | PieChart with donut |
| Peak hours bar chart | `/dashboard` | ✅ Done | BarChart hourly |
| Top items today | `/dashboard` | ✅ Done | Bar chart + revenue |
| Payment split pie | `/dashboard` | ✅ Done | Cash vs UPI |
| Live token queue | `/dashboard` | ✅ Done | Scrollable badges |
| Section summary cards | `/dashboard` | ✅ Done | Tea + Snacks mini cards with links |
| Today's insights | `/dashboard` | ✅ Done | 3 insight cards |
| Daily summary + Share | `/dashboard` | ✅ Done | Web Share API / clipboard |
| Recent orders table | `/dashboard` | ✅ Done | Links to /orders |
| All KPIs wired to real DB | — | 🔲 Pending | Needs Supabase |

---

## Flow 6: Section Manager Dashboard

| Feature | Page | Status | Notes |
|---|---|---|---|
| Filtered view for own section | `/section-dashboard` | ✅ Done | Tea / Snacks toggle via DEMO_SECTION |
| Revenue chart for section | `/section-dashboard` | ✅ Done | AreaChart |
| Peak hours | `/section-dashboard` | ✅ Done | BarChart |
| Top items | `/section-dashboard` | ✅ Done | Progress bars |
| Staff performance table | `/section-dashboard` | ✅ Done | Orders + revenue per staff |
| Open counter shortcut | `/section-dashboard` | ✅ Done | Links to /counter or /tea-entry |
| Read section from logged-in user | — | 🔲 Pending | Needs Supabase Auth user.section field |

---

## Flow 7: Orders Management

| Feature | Page | Status | Notes |
|---|---|---|---|
| Order list with stats | `/orders` | ✅ Done | Total / Pending / Ready / Served counts |
| Search by token or item | `/orders` | ✅ Done | Text filter |
| Filter by section | `/orders` | ✅ Done | All / Tea / Snacks |
| Filter by status | `/orders` | ✅ Done | All / Pending / Ready / Served / Cancelled |
| Status badge styles | `/orders` | ✅ Done | Color-coded pills |
| Real-time data from DB | — | 🔲 Pending | Currently mock data |

---

## Flow 8: Menu Management

| Feature | Page | Status | Notes |
|---|---|---|---|
| View all menu items | `/menu` | ✅ Done | Grid layout, Snacks + Tea tabs |
| Toggle availability | `/menu` | ✅ Done | Green/grey toggle switch per item |
| Search items | `/menu` | ✅ Done | Text filter |
| Add new item | `/menu` (Add Item button) | 🔲 Pending | Button exists, modal not implemented |
| Persist changes to DB | — | 🔲 Pending | Needs Supabase |

---

## Flow 9: Staff Management

| Feature | Page | Status | Notes |
|---|---|---|---|
| View all staff cards | `/staff` | ✅ Done | 6 staff members |
| Stats row | `/staff` | ✅ Done | Total / Tea / Snacks / Morning shift counts |
| Add staff button | `/staff` | 🔲 Pending | Button exists, form not implemented |
| Edit staff | — | 🔲 Pending | Not started |
| Deactivate staff | — | 🔲 Pending | Not started |

---

## Flow 10: Reports

| Feature | Page | Status | Notes |
|---|---|---|---|
| Weekly revenue area chart | `/reports` | ✅ Done | Tea + Snacks lines |
| Orders per day bar chart | `/reports` | ✅ Done | Weekly bar |
| Top items ranked | `/reports` | ✅ Done | Progress bars with counts |
| Payment split pie | `/reports` | ✅ Done | Cash vs UPI donut |
| Hourly traffic bar | `/reports` | ✅ Done | Peak bar highlighted |
| Period toggle (Week/Month) | `/reports` | ✅ Done | UI toggle (data static) |
| Share report | `/reports` | ✅ Done | Web Share API / clipboard |
| Real data from DB | — | 🔲 Pending | Needs Supabase |

---

## Flow 11: Settings

| Feature | Page | Status | Notes |
|---|---|---|---|
| Shop info form | `/settings` | ✅ Done | Name, location, phone |
| UPI merchant ID config | `/settings` | ✅ Done | Shows placeholder; edit = update .env.local |
| Tea price per cup | `/settings` | ✅ Done | Used in SMS auto-detection logic |
| Shift timings | `/settings` | ✅ Done | Morning/Evening start+end times |
| Token reset time | `/settings` | ✅ Done | Daily reset configuration |
| SMS Forwarder endpoint | `/settings` | ✅ Done | Displays URL to configure in Android app |
| Notification toggles | `/settings` | ✅ Done | UI only; no actual notification send yet |
| Save to DB | — | 🔲 Pending | Needs Supabase |

---

## Navigation & UX

| Feature | Status | Notes |
|---|---|---|
| Sidebar (desktop, all staff pages) | ✅ Done | Active state, role-unaware (shows all items) |
| BottomNav (mobile, all staff pages) | ✅ Done | 5 tabs: Overview / Snacks / Tea / Monitor / Orders |
| Sidebar on Tea Entry | ✅ Done | Fixed in current session |
| Sidebar on Section Dashboard | ✅ Done | Fixed in current session |
| Counter back nav (desktop) | ✅ Done | ← Dashboard link in header |
| Counter mobile tab switcher | ✅ Done | Menu / Bill tabs on mobile |
| Login page redirect by role | ✅ Done | username → role → route |
| Root redirect / → /login | ✅ Done | app/page.tsx |
| Customer order → no login required | ✅ Done | /order page, no auth gate |
| 404 / error handling | 🔧 Partial | Next.js default; no custom 404 page |

---

## API Routes

| Route | Status | Notes |
|---|---|---|
| POST /api/tea-entry | 🔧 Partial | Route exists; needs Supabase |
| GET/POST /api/orders | 🔧 Partial | Route exists; needs Supabase |
| GET /api/menu | 🔧 Partial | Route exists; needs Supabase |
| POST /api/payments/create-order | 🔧 Partial | Returns mock orderId; needs Razorpay key |
| POST /api/payments/webhook | 🔧 Partial | HMAC verify code exists; needs Razorpay secret |
| GET /api/payments/status/[orderId] | 🔧 Partial | Returns mock "pending"; needs DB check |
| POST /api/sms | 🔧 Partial | Full logic exists; needs SMS_FORWARDER_SECRET + Supabase |
| GET /api/tokens | 🔧 Partial | Route exists; needs Supabase |
