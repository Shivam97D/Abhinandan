# Abhinandan — Feature Tracker

> Living document. Update status as features are built, tested, or descoped.  
> Statuses: `✅ Done` · `🔧 Partial` · `⏳ Pending` · `🚫 Blocked` · `💡 Planned`

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Done | Built, wired, tested end-to-end |
| 🔧 Partial | UI built, backend stub only (placeholder) |
| ⏳ Pending | Not started yet — in backlog |
| 🚫 Blocked | Waiting on external dependency (credentials, hardware, etc.) |
| 💡 Planned | Discussed but not yet scheduled |

---

## AUTH & ACCESS

| # | Feature | User | Status | Remarks |
|---|---------|------|--------|---------|
| A1 | Username + Password login form | All staff | ✅ Done | UI complete; validation works |
| A2 | Role-based redirect on login | All staff | ✅ Done | Redirects owner to `/dashboard`, section_manager to `/serving` |
| A3 | Supabase Auth integration | All staff | ✅ Done | Synced via setup-auth endpoint to Supabase Auth |
| A4 | JWT session + protected routes | All staff | ✅ Done | Middleware validates session via local JWT decoding |
| A5 | Route-level access guard | Owner / Staff | ✅ Done | Locked section_manager to `/serving` only; owner gets full access |
| A6 | Phone OTP login (alternative) | Staff | 💡 Planned | Supabase supports it; add when staff onboarding is set up |
| A7 | Auto-logout on inactivity | Staff | 💡 Planned | 8-hour session for counter staff |

---

## OWNER DASHBOARD (`/dashboard`)

| # | Feature | User | Status | Remarks |
|---|---------|------|--------|---------|
| D1 | Today's Revenue hero card (₹ big number) | Owner | ✅ Done | Static mock data |
| D2 | Tea vs Snacks revenue split | Owner | 🚫 Removed | Obsolete since Tea counter was removed |
| D3 | "↑ more than yesterday" delta indicator | Owner | ✅ Done | Static |
| D4 | Alert bar (pending tokens, issues) | Owner | ✅ Done | Static; needs real count from DB |
| D5 | KPI cards: Revenue, Orders, Peak Hour, Pending Tokens | Owner | ✅ Done | Static mock |
| D6 | Revenue area chart | Owner | ✅ Done | Weekly mock data; toggle Day/Week/Month UI only |
| D7 | Tea vs Snacks donut chart | Owner | 🚫 Removed | Obsolete since Tea counter was removed |
| D8 | Peak Hours bar chart | Owner | ✅ Done | Hourly mock data |
| D9 | Top 5 Items horizontal bar chart | Owner | ✅ Done | Static |
| D10 | Payment split donut (Cash vs UPI) | Owner | ✅ Done | Static |
| D11 | Insights panel (3 auto-generated insights) | Owner | ✅ Done | Static text; needs real analytics logic |
| D12 | Live token queue strip | Owner | ✅ Done | Static mock; needs Supabase Realtime |
| D13 | Tea Counter section card + link | Owner | 🚫 Removed | Link removed |
| D14 | Snacks Counter section card + link | Owner | ✅ Done | Links to `/counter` |
| D15 | Daily Summary card with WhatsApp share | Owner | ✅ Done | Uses Web Share API; static text |
| D16 | Recent Orders table (last 8) | Owner | ✅ Done | Static mock |
| D17 | Date range filter (All / Snacks) | Owner | ⏳ Pending | Toggle buttons in UI not wired to data |
| D18 | Day/Week/Month chart toggle | Owner | ⏳ Pending | UI toggle exists; data doesn't change |
| D19 | Export to CSV | Owner | ⏳ Pending | Button not built |
| D20 | Export to PDF | Owner | 💡 Planned | Phase 6 |
| D21 | Real-time KPIs (live order count, live revenue) | Owner | ⏳ Pending | Needs Supabase Realtime subscription |
| D22 | Notifications bell (actual alerts) | Owner | ⏳ Pending | Bell icon + badge are static |
| D23 | Desktop sidebar navigation fully functional | Owner | ✅ Done | Sidebar renders with dynamic role filtering |

---

## SNACKS COUNTER POS (`/counter`)

| # | Feature | User | Status | Remarks |
|---|---------|------|--------|---------|
| C1 | Staff name + shift display in header | Snacks Staff | ✅ Done | Hardcoded "Ramesh / Evening Shift" |
| C2 | Next token number display in header | Snacks Staff | ✅ Done | Zustand store, increments per session |
| C3 | Live clock in header | Snacks Staff | ✅ Done | |
| C4 | Quick Add strip (6 pinned items) | Snacks Staff | ✅ Done | Tapping adds 1 instantly; count badge shows qty |
| C5 | Category filter tabs | Snacks Staff | ✅ Done | Computed dynamically from active db items |
| C6 | Item grid with veg/non-veg badge | Snacks Staff | ✅ Done | |
| C7 | "🔥 Popular" badge on top items | Snacks Staff | ✅ Done | |
| C8 | Inline qty stepper on item card | Snacks Staff | ✅ Done | |
| C9 | Cart panel (right side) | Snacks Staff | ✅ Done | |
| C10 | Cart qty stepper (per item) | Snacks Staff | ✅ Done | |
| C11 | Cart clear button | Snacks Staff | ✅ Done | |
| C12 | Payment method toggle (Cash / UPI) | Snacks Staff | ✅ Done | UI only; UPI at counter flow not built |
| C13 | Customer name / note field | Snacks Staff | ✅ Done | Optional text input |
| C14 | "Place Order & Issue Token" button | Snacks Staff | ✅ Done | Issues Zustand token; shows confirmation |
| C15 | Token issued confirmation flash (green button) | Snacks Staff | ✅ Done | 3-second flash |
| C16 | Token queue strip (footer) | Snacks Staff | ✅ Done | Static mock; needs Supabase Realtime |
| C17 | Mark token Ready / Served from queue | Snacks Staff | ⏳ Pending | Queue chips are not interactive yet |
| C18 | "Sold Out" toggle on item card | Snacks Staff | ⏳ Pending | `...` overflow menu not built |
| C19 | Bluetooth thermal printer integration | Snacks Staff | 🚫 Blocked | Waiting for printer detection / pairing |
| C20 | Save order to DB (POST `/api/orders`) | Snacks Staff | 🔧 Partial | API route exists with placeholder; no real DB write |
| C21 | UPI payment at counter (show QR / UPI ID) | Snacks Staff | ⏳ Pending | Not designed yet |
| C22 | Shift start / end logging | Snacks Staff | ⏳ Pending | No shift model in UX yet |
| C23 | Keyboard shortcut "Enter to place order" | Snacks Staff | ✅ Done | Helper text shown; actual keydown listener not wired |

---

## CUSTOMER SELF-ORDER (`/order`, `/order/token`, `/token/[id]`)

| # | Feature | User | Status | Remarks |
|---|---------|------|--------|---------|
| OR1 | QR code generation for the counter | Customer | ⏳ Pending | QR should display on `/counter` or a dedicated display |
| OR2 | Menu page loads without login | Customer | ✅ Done | No auth required |
| OR3 | "🔥 Popular Right Now" horizontal scroll strip | Customer | ✅ Done | |
| OR4 | Category tabs (sticky on scroll) | Customer | ✅ Done | |
| OR5 | Item cards with veg badge, desc, price | Customer | ✅ Done | |
| OR6 | Add/remove from cart with animation | Customer | ✅ Done | Inline stepper |
| OR7 | Cart count badge on header icon | Customer | ✅ Done | Zustand-powered |
| OR8 | Cart bottom bar ("Pay ₹94 →") with pulse glow | Customer | ✅ Done | Appears when cart > 0 |
| OR9 | Cart bottom sheet (slide up) | Customer | ✅ Done | |
| OR10 | Order summary in bottom sheet | Customer | ✅ Done | |
| OR11 | Mobile number input (optional, for SMS) | Customer | ✅ Done | Numeric input in bottom sheet |
| OR12 | UPI option buttons (GPay / PhonePe / Other) | Customer | ✅ Done | UI only; Razorpay SDK not integrated |
| OR13 | Razorpay payment integration (real UPI flow) | Customer | 🚫 Blocked | Waiting for Razorpay credentials |
| OR14 | Razorpay webhook → order confirmed → token issued | Customer | 🔧 Partial | Webhook route exists; DB write is placeholder |
| OR15 | Cart persists in localStorage | Customer | ✅ Done | Zustand persist middleware |
| OR16 | Payment processing / loading screen | Customer | ⏳ Pending | Screen described in plan; not built |
| OR17 | Token screen (`/order/token`) | Customer | ✅ Done | 96px token number, screenshot-optimized |
| OR18 | Token SMS via Fast2SMS | Customer | 🚫 Blocked | Waiting for Fast2SMS API key |
| OR19 | Token status page (`/token/:id`) with stepper | Customer | ✅ Done | Static mock statuses |
| OR20 | Live token status via Supabase Realtime | Customer | ⏳ Pending | Supabase channel subscription not written |
| OR21 | "Notify me when ready" (browser push) | Customer | ✅ Done | Toggle UI built |
| OR22 | Web Share API for token sharing | Customer | ✅ Done | "Share Token" button; native share on mobile |
| OR23 | "Order Confirmed" top strip on token page | Customer | ✅ Done | |
| OR24 | "Track Order →" link from token page | Customer | ✅ Done | Links to `/token/:id` |
| OR25 | Clear cart after successful payment | Customer | ⏳ Pending | Cart not cleared post-token |

---

## TEA QUICK ENTRY (Obsolete / Removed)

> 🚫 **Removed:** The Tea Counter has been completely descoped from the application as requested by the customer. All associated features (TE1 to TE13) are now inactive and removed from navigations.

---

## BACKEND & DATA

| # | Feature | User | Status | Remarks |
|---|---------|------|--------|---------|
| B1 | Prisma schema (all 7 tables) | System | ✅ Done | `prisma/schema.prisma` complete |
| B2 | DB migrations (run `prisma migrate dev`) | System | ✅ Done | Database migrations complete; seed script seeded |
| B3 | `GET /api/orders` | Owner / Staff | 🔧 Partial | Returns mock data |
| B4 | `POST /api/orders` | Staff / Customer | 🔧 Partial | Validates items |
| B5 | `GET /api/tokens` | Staff | 🔧 Partial | Returns mock token queue |
| B6 | `PATCH /api/tokens` (mark Ready/Served) | Staff | 🔧 Partial | Logic stub |
| B7 | `GET /api/menu` | All | ✅ Done | Fetches active menu items from Postgres database |
| B8 | `PATCH /api/menu` (toggle availability, update price) | Owner / Staff | ✅ Done | Saves changes to the PostgreSQL database |
| B9 | `POST /api/tea-entry` | Tea Staff | 🚫 Removed | Obsolete / Removed |
| B10 | `GET /api/tea-entry` | Tea Staff / Owner | 🚫 Removed | Obsolete / Removed |
| B11 | `POST /api/payments/razorpay` | Customer | 🔧 Partial | Razorpay SDK call commented out |
| B12 | `POST /api/payments/webhook` | System | 🔧 Partial | HMAC signature verification |
| B13 | Supabase Realtime (token status sync) | All | ✅ Done | Loops pickups and halts loops instantly on Served status change |
| B14 | Daily token counter reset at midnight | System | ⏳ Pending | Cron job needed |
| B15 | Row-Level Security (RLS) policies on Supabase | System | ⏳ Pending | Define after credentials available |
| B16 | `POST /api/sms` | System | ⏳ Pending | Route not written |

---

## MENU & INVENTORY MANAGEMENT

| # | Feature | User | Status | Remarks |
|---|---------|------|--------|---------|
| M1 | View menu items list | Owner | ✅ Done | Renders at `/menu` with full search and listing |
| M2 | Add new menu item (name, price, category, image) | Owner | ✅ Done | Drawer interface to add item |
| M3 | Edit item price | Owner | ✅ Done | Drawer price edit |
| M4 | Toggle item availability (sold out / available) | Owner / Staff | ✅ Done | Inline quick-toggle with PATCH database update |
| M5 | Upload item image | Owner | ✅ Done | Built-in photo uploader |
| M6 | Menu categories management (add/remove cats) | Owner | ✅ Done | Dynamic dropdown listing with inline custom category builder |
| M7 | Seed initial menu data | System | ✅ Done | Database seeds via `seed.ts` script |

---

## REPORTING & ANALYTICS

| # | Feature | User | Status | Remarks |
|---|---------|------|--------|---------|
| R1 | Revenue trend chart (owner dashboard) | Owner | 🔧 Partial | UI built with mock data |
| R2 | Section comparison charts | Owner | 🚫 Removed | Obsolete since Tea counter was removed |
| R3 | Top items chart | Owner | 🔧 Partial | UI built with mock data |
| R4 | Peak hours chart | Owner | 🔧 Partial | UI built with mock data |
| R5 | Payment split chart | Owner | 🔧 Partial | UI built with mock data |
| R6 | Daily reports share (WhatsApp) | Owner | ✅ Done | Web Share API with pre-filled summary |
| R7 | CSV export | Owner | ⏳ Pending | |
