# PRD.md — Product Requirements Document

> **Source of truth** for what this product is, who it serves, and what it must do. Every agent reads this on boot. No requirement changes without updating this file and logging the change in WORKFLOW.md.
>
> **Last updated:** 2026-06-29 · **Version:** 1.0 · **Status:** Approved

---

## 1. Project overview

**Product name:** Abhinandan Tea & Snacks Centre POS & Self-Ordering App

**One-liner:** A responsive digital ordering and point-of-sale system for a heritage snacks store, featuring POS counter ordering, customer self-ordering, real-time token management, and role-based console access.

**Background / context:**
Abhinandan Centre serves high-quality local snacks (Vada Pav, Poha, Upma, Shira, Khichadi, Udid Vada). To streamline operation, the shop uses:
1. A counter POS screen where the operator takes cash/UPI orders.
2. A customer self-ordering page where customers scan a QR code, pay via UPI, and receive a token number.
3. A serving monitor console where the manager prepares, sets to ready, and marks orders as served.
4. A token display screen where customers see which tokens are preparing and ready (with looping pick-up chimes when ready).

**Goals:**
- Enable fast POS billing at the counter with thermal receipt printing.
- Restrict Manager login access exclusively to the Serving Console.
- Support dynamic menu category additions on the fly.
- Remove all references to the obsolete Tea counter.

---

## 2. Users & personas

| Persona | Role | Key needs | Access level |
|---------|------|-----------|-------------|
| **Owner** | Store Owner | View revenue reports, manage menu items, issue tokens, print POS bills, adjust configuration. | Full Access (`owner` role) |
| **Manager** | Kitchen Server | View the serving queue, prepare items, mark tokens as ready, mark as served. | Restriced Access (`section_manager` role) |
| **Customer** | Customer | Scan QR, place self-orders, view token status, hear pickup alerts. | Public Access (No Login) |

---

## 3. Entities & data model

### MenuItem
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (CUID) | Primary key |
| `name` | String | Item name (e.g. Vada Pav) |
| `price` | Float | Item price |
| `category` | String | Item category (dynamic snacks category) |
| `section` | Section (Enum) | Hardcoded to `snacks` |
| `available` | Boolean | Visibility toggle |
| `imageUrl` | String (nullable) | Optional product image URL |

### Order
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (CUID) | Primary key |
| `source` | OrderSource (Enum) | `counter` or `customer` |
| `status` | OrderStatus (Enum) | `pending`, `confirmed`, `cancelled` |
| `total` | Float | Order total price |
| `paymentMethod` | String | `cash`, `upi`, `counter_pending` |
| `mobile` | String (nullable) | Optional phone number |
| `tokenNumber` | Int (nullable) | Assigned token sequence number |

---

## 4. Business rules

- **BR1 (Snacks Only):** All active items and POS orders are limited to the Snacks section. The Tea counter section is fully deactivated/removed.
- **BR2 (Dynamic Categories):** Menu categories are dynamically computed from active database items. The owner can input new custom categories which save and persist in the selection list.
- **BR3 (Manager Lock):** Users with the `section_manager` role (Manager) are strictly restricted to the `/serving` page. Any attempt to navigate elsewhere is intercepted and redirected back to `/serving`.
- **BR4 (Realtime Muting):** When an order is marked as `served` from the counter or serving console, any loop chiming on the customer's `/order/token` page must stop immediately in real time.
- **BR5 (Clean reset):** All database transactions must resets tokens daily to start clean from token #1.

---

## 5. Functional requirements

### 5.1 Authentication & access
- Owner and Manager log in with their respective usernames (`Owner` and `Manager`) at `/login`.
- Role routing redirects `owner` to `/dashboard` and `section_manager` to `/serving`.

### 5.2 Core features
- **Counter POS**: Fast billing, receipt printing toggle, customer phone input. See `FEATURES.md#c1`.
- **Serving Console**: Order list divided by status (Preparing, Ready), direct-serve trigger. See `FEATURES.md#sc1`.
- **Menu Management**: Update pricing, availability, and categories dynamically. See `FEATURES.md#m1`.

---

## 6. Non-functional requirements
- **Design System**: Premium Indian heritage aesthetic using ivory (`#F8F5F0`), deep maroon (`#4A1414`), gold accents (`#D4AF37`), and sand card borders.
- **Mobile responsiveness**: Serving console cards and list adapt to mobile horizontal/portrait viewports.
- **Autoplay Audio**: Ringing sound triggers in browser on customer pickup screen after initial user page interaction.
