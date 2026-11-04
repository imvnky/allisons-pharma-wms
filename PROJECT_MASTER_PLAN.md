# Allisons African Pharma — Warehouse Management System (Angola)
## Complete End-to-End System Blueprint, Architectural Decisions & Implementation Roadmap

> **Document Purpose:** This document serves as the single source of truth for the entire Allisons African Pharma Warehouse Management System. It preserves all architectural discussions, client requirements, formulas, UI/UX screen specifications, database schemas, dynamic RBAC design, and the step-by-step development roadmap.

---

## 1. Project Overview & Tech Stack

### 1.1 Project Identity
* **Client / Brand:** Allisons African Pharma
* **System:** Multi-Warehouse Inventory & Audit Management System
* **Geographical Scope:** Angola
  * **3 Active Warehouses:**
    1. `Mulemba Warehouse` (Luanda North)
    2. `Palanca Warehouse` (Luanda South)
    3. `Lobito Warehouse` (Benguela Province)
  * **1 Central Headquarters (HQ):** National oversight & master stock consolidation
  * **Super Admin Layer:** System owners with dynamic platform control

### 1.2 Technology Stack
* **Backend:** Python 3.11+ | **FastAPI** | **Uvicorn** (High-concurrency ASGI)
* **Frontend:** **React** (v18+) | **Vite** | **Tailwind CSS** | **Lucide Icons**
* **Database:** **PostgreSQL** (ACID relational integrity, asyncpg, SQLAlchemy 2.0)
* **Security & Auth:** OAuth2 Password Bearer with JWT tokens, Argon2/bcrypt password hashing, dynamic backend permission guards, and strict warehouse data isolation.

---

## 2. Roles, Hierarchy & Access Responsibilities

```
                      +---------------------------------------+
                      |         👑 SUPER ADMIN (Us)           |
                      | Master Control, Dynamic RBAC, Users,  |
                      | Password Fix, Lookups & API Logs      |
                      +---------------------------------------+
                                          |
                      +---------------------------------------+
                      |             🏢 HQ ADMIN               |
                      | Whole Angola Overview, Master Stock,  |
                      | Live Warehouse Progress Monitor       |
                      +---------------------------------------+
                                          |
             +----------------------------+----------------------------+
             |                                                         |
+--------------------------+                              +--------------------------+
|  MULEMBA WAREHOUSE       |   (Same structure for        |    LOBITO WAREHOUSE      |
|  • Supervisor (Admin)    |    Palanca & Lobito)         |    • Supervisor (Admin)  |
|  • Carton Staff          |                              |    • Carton Staff        |
|  • Loose Staff           |                              |    • Loose Staff         |
|  • Display Staff         |                              |    • Display Staff       |
+--------------------------+                              +--------------------------+
```

### 2.1 Role Definitions & Boundaries
1. **Super Admin (System Owners):**
   * Can create new roles dynamically and assign functional capabilities via UI.
   * Exclusive power to create new users and assign role + warehouse scope.
   * Exclusive power to fix / reset passwords and unlock accounts.
   * Controls master dropdown dictionaries and dynamic field values.
   * Full access to system logs, API performance, and error tracebacks.

2. **Headquarters (HQ) Admin:**
   * Global nationwide visibility across all 3 warehouses.
   * Monitors daily inventory progress states (`Not Started`, `Under Process`, `Inventory Done`).
   * Can inspect any warehouse’s live reconciliation sheet in audit review mode.
   * Access to Master Angola Inventory with 5 mandatory multi-filters.

3. **Warehouse Supervisor (Admin of own warehouse):**
   * Scoped strictly to their assigned warehouse (Mulemba, Palanca, or Lobito).
   * Manages daily reconciliation: reviews live counts, enters manual **Sales**, adds product **Remarks**, and finalizes the day.
   * Manages **Arrivals & Sea Shipments** (adds new container shipments directly into stock).
   * Manages **Inter-Warehouse Transfers** (creates dispatches; confirms and approves inward transfers from other warehouses).
   * Access to warehouse-level **Product Differences** and **Near Expiry Goods**.

4. **Carton Staff (Floor Counter):**
   * Physically counts cartons on the warehouse floor and submits counts.
   * Scoped strictly to their warehouse.
   * **Isolation Rule:** Can only view and edit the carton quantities that **they themselves submitted**.

5. **Loose Staff (Floor Counter):**
   * Physically counts loose units/bottles on the floor and submits counts.
   * Scoped strictly to their warehouse.
   * **Isolation Rule:** Can only view and edit the loose quantities that **they themselves submitted**.

6. **Display Staff (Floor Counter):**
   * Physically verifies fixed showroom/floor display quantities.
   * Scoped strictly to their warehouse.
   * **Fixed Display Rule:** Display stock is fixed. Opening count is **auto-calculated strictly from the previous day's closing display count**.
   * Any change/difference in display quantity **requires selecting a valid justification from a mandatory dropdown**.

---

## 3. Core Stock Calculation Engine & Business Rules

### 3.1 Daily Stock Formulas
1. **Required Stock as on [Date] (Book / System Stock):**
   $$\text{Required Stock} = \text{Opening Stock} + \text{Arrivals} - \text{Transfers (Out)} - \text{Sales}$$
   * **Opening Stock:** Auto-populated from previous finalized day’s closing stock.
   * **Arrivals:** Auto-sum of Verified Sea Shipments + Local Deliveries + Approved Inward Transfers.
   * **Transfers:** Auto-sum of Dispatched Outward Transfers to other warehouses.
   * **Sales:** Manually entered by Supervisor on the daily reconciliation grid.

2. **Physical Stock as on [Date]:**
   $$\text{Physical Stock} = (\text{Carton Count} \times \text{Units per Carton}) + \text{Loose Count} + \text{Display Count}$$
   * Converts all master packaging into base units (e.g. 1 Carton = 24 Units).

3. **Difference (Stock Variance / Shrinkage):**
   $$\text{Difference} = \text{Physical Stock} - \text{Required Stock}$$
   * **Difference = 0:** Reconciled / Balanced (Green badge 🟢).
   * **Difference < 0:** Shortage / Shrinkage (Red badge 🔴).
   * **Difference > 0:** Surplus / Over-delivery (Amber badge 🟡).

4. **Display Stock Continuity Rule:**
   $$\text{Opening Display}_{\text{Today}} = \text{Closing Display}_{\text{Previous Finalized Day}}$$

5. **Inter-Warehouse Transfer Lifecycle:**
   * Origin Warehouse creates dispatch $\rightarrow$ Status: `In-Transit`.
   * Sender's *Transfers (Out)* column is debited.
   * Destination Warehouse receives alert $\rightarrow$ Inspects physical cargo $\rightarrow$ Clicks **Confirm & Approve**.
   * Receiver's *Arrivals* column is automatically credited upon approval.

---

## 4. Architectural Rules: Dynamic Configuration vs. Hardcoded Engine

| Component | Architecture Type | Implementation Strategy |
|---|---|---|
| **Roles & Permissions** | **100% Dynamic** | Stored in PostgreSQL (`roles`, `tiles`, `permissions`). Super Admin creates roles and checks/unchecks tile visibility & sub-permissions in UI. |
| **User Accounts & Passwords** | **100% Dynamic** | Stored in PostgreSQL (`users`). Super Admin creates users, binds warehouse scope, and resets passwords directly in UI. |
| **Dropdown & Selectable Values** | **100% Dynamic** | Stored in generic lookup tables (`lookup_types`, `lookup_values`). Super Admin manages entries and can add options on-the-fly via inline dropdown modals. |
| **Warehouse Locations** | **100% Dynamic** | Stored in `warehouses` table. Adding a 4th or 5th warehouse is a DB entry. |
| **Inventory Calculation Engine** | **Hardcoded Backend Engine** | Reconciliation formulas are code-level Python services with atomic transactions to prevent accounting corruption or SQL injection. |
| **Transfer State Machine** | **Hardcoded State Engine** | Strict lifecycle (`Draft` $\rightarrow$ `Dispatched` $\rightarrow$ `Received & Approved`) with rollback safety. |
| **Security & Authentication** | **Backend-Enforced** | Zero frontend-only trust. Every API route verifies JWT, dynamic permissions, and warehouse scoping. |

---

## 5. UI/UX Screen Specifications (9 Core Screens)

All reference design mockups are stored in: `D:\AlliSons-Inventory\UI\`

### Screen 1: Home / Operations Dashboard
* **Design File:** `Allisons African Pharma Warehouse Dashboard.png`
* **Layout Structure:**
  * **Header:** Brand Logo, Active Warehouse Selector (`📍 Mulemba Warehouse ▾`), Role Badge (`👑 Super Admin`), Date, Notifications, Profile avatar.
  * **Hero Greeting:** Welcome banner + Active Daily Inventory Cycle ID + Audit Status (`🟢 Audit Open`).
  * **Top 4 KPI Cards:**
    1. *Today's Status:* `Inventory: Under Process (72%)`
    2. *Physical Count Progress:* Cartons (85%), Loose (60%), Display (100%)
    3. *Pending Transfers:* `2 Inward Transfers Awaiting Confirmation`
    4. *Discrepancies:* `4 Products with Variance Flagged`
  * **Today's Priority Actions (Max 3 targeted action cards):**
    1. *Daily Reconciliation Sheet:* `[ Open Reconciliation Sheet → ]`
    2. *Approve Inward Transfers (2):* `[ Inspect & Confirm Stock → ]`
    3. *Resolve Discrepancies (4):* `[ Review Variances → ]`
  * **Bottom Two-Column Section:**
    * *Left (60%):* Live Physical Counting Stream (Real-time feed of staff submissions).
    * *Right (40%):* Warehouse Stock Health & Expiry Alerts.

### Screen 2: Stock Counting Interface (Floor Counting Terminal)
* **Design File:** `Purple Warehouse Stock Counting Dashboard.png`
* **Target Users:** Carton Staff, Loose Staff, Display Staff (Tablet/Mobile friendly).
* **Components:**
  * Mode Selector Tabs: `[ 📦 Carton Count ]` | `[ 🧴 Loose Count ]` | `[ 🖼️ Display Count ]` (Auto-locked to user role; toggleable for Supervisor).
  * Quick Shift Metrics: My Counted SKUs, Total Progress, Last Entry Timestamp.
  * Barcode Scanner & Search Bar (AutoFocus for handheld hardware scanners).
  * Active Item Count Entry Card: Product name, SKU, pack size, large numeric input with `+1 / +10 / -1 / -10` steppers.
  * Special Display Mode: Shows Read-only Opening Display Stock + mandatory "Reason for Change" dropdown.
  * "My Submissions Today" Grid: Strictly isolated to what the logged-in staff member has submitted today, with inline edit capability.

### Screen 3: Supervisor Daily Reconciliation Sheet
* **Design File:** `Purple Daily Reconciliation Dashboard.png`
* **Target Users:** Warehouse Supervisors & HQ Auditors.
* **Layout Structure:**
  * Top Ribbon: Reconciled SKUs counter, Total Book vs Physical Stock, Net Variance, Total Sales.
  * Historical Date Picker: View and audit any past date's inventory sheet.
  * Filter Toolbar: Search SKU/Name, Category filter, `[ 🔘 Show Discrepancies Only ]` toggle.
  * **The 13 Core Columns (Master Data Grid):**
    1. `Product Code / SKU`
    2. `Product Description & Pack Specification`
    3. `Opening Stock` (Auto-calculated from previous closing)
    4. `Arrivals` (Auto-sum: Sea + Local + Transfers-In)
    5. `Transfers` (Auto-sum: Outward transfers to other branches)
    6. `Sales` (✍️ **Editable input for Supervisor**)
    7. `Carton Qty` (Auto-pulled from Carton Staff count submissions)
    8. `Loose Qty` (Auto-pulled from Loose Staff count submissions)
    9. `Display Qty` (Auto-pulled from Display Staff count submissions)
    10. `Required Stock as on [Date]` ($\text{Opening} + \text{Arrivals} - \text{Transfers} - \text{Sales}$)
    11. `Physical Stock as on [Date]` ($(\text{Cartons} \times \text{Pack}) + \text{Loose} + \text{Display}$)
    12. `Difference` ($\text{Physical} - \text{Required}$; Color-coded Green/Red/Amber badge)
    13. `Remarks` (✍️ **Editable text box for Supervisor notes**)
  * Actions: `[ Export to Excel ]` | `[ Save Draft ]` | `[ Finalize & Submit to HQ ]`.

### Screen 4: Arrivals & Transfers Hub
* **Design File:** `Allisons Pharma Warehouse Dashboard.png`
* **Tab 1: Inward Arrivals (Sea & Local Shipments):**
  * `[ 🚢 + Add Shipment Arrival ]` Action Button.
  * Modal: Sea / Local mode, Vessel Name, Container No., BL No., Supplier, multi-product batch/expiry entry.
  * Ledger Table: Verified shipments automatically credit the warehouse’s *Arrivals* column.
* **Tab 2: Inter-Warehouse Transfers:**
  * `[ 🔄 + Create Transfer ]` Action Button (Dispatches stock to another branch; debits sender's *Transfers* column).
  * Inward Pending Section: Incoming dispatches from other branches with **`[ ✅ Inspect & Approve ]`** action button (credits receiver's *Arrivals* column upon approval).

### Screen 5: Quality & Alerts (Differences & Near Expiry)
* **Design File:** `Allison's Pharma Alerts Dashboard.png`
* **Tab 1: Product Differences (Variance Monitor):**
  * Pre-filtered table showing strictly rows where $\text{Difference} \neq 0$ for this warehouse.
  * Columns: Required vs Physical, Variance %, Financial Impact (AOA/USD), Supervisor Remarks, Investigation Status.
* **Tab 2: Near Expiry Goods (Batch Shelf-Life Monitor):**
  * Calculated strictly from this warehouse's stock.
  * Urgency Filters: `< 30 Days` (Critical Red), `< 60 Days` (Orange), `< 90 Days` (Yellow), `Expired` (Black).
  * Batch/Lot number, Expiry Date, Days Remaining countdown, Bin/Rack location, Quarantine Action button.

### Screen 6: Head Quarters (HQ) Master Dashboard
* **Design File:** `HQ Master Stock Audit Dashboard.png`
* **Tab 1: Real-Time Warehouse Audit Process Monitor:**
  * Visual live status cards for **Mulemba**, **Palanca**, and **Lobito**.
  * Status Lifecycle: `Not Started` ⚪ $\rightarrow$ `Under Process` 🟡 $\rightarrow$ `Inventory Done` 🟢.
  * `[ 👁️ Open & Inspect Data ]` action to drill down into any warehouse's live reconciliation sheet in read-only audit mode.
* **Tab 2: Master Angola Inventory Table (Consolidated National Stock):**
  * 5 Mandatory Filters: **Date Filter**, **Warehouse Filter**, **Expiry Filter**, **Products Filter**, **Sales Filter**.
  * Consolidated table showing stock per warehouse + **Total Angola Physical Stock** + National Daily Sales.

### Screen 7: Role & Tile Authorization Manager (Admin RBAC)
* **Design File:** `Warehouse Roles and Access Dashboard.png`
* **Inspiration:** J&J UiP Platform (Authorization Based on Roles).
* **Master Grid:** Tile Name, Category, Assigned Roles (Pill badges), Sub-Permissions icon, Change Logs icon, Edit Pencil.
* **Slide-Out Configuration Drawer:**
  * Section 1: Multi-select role checkboxes to grant/revoke tile access.
  * Section 2: Sub-permissions matrix (View, Create, Edit Own, Edit All, Approve, Export).
* **User Management & Password Reset Modal:**
  * Super Admin creates users, binds role + warehouse scope (`Mulemba` / `Palanca` / `Lobito` / `Global HQ`).
  * Direct password override / reset modal.

### Screen 8: Master Dropdowns & Lookups Manager (Super Admin)
* **Design File:** `Master Dropdowns Warehouse Dashboard.png`
* **Layout:** Split two-panel layout:
  * Left Panel: Categories (Warehouses, Arrival Modes, Ports of Entry, Display Change Reasons, Discrepancy Causes, Product Categories, Packaging Units, Carriers).
  * Right Panel: Active values grid with Drag-to-Reorder, Active/Inactive toggle, and Edit action.
* **Inline Dynamic Dropdown Addition:** Across all forms in the app, Super Admin sees a `[ ➕ + Add New Option ]` button at the bottom of dropdowns to create choices on the fly.

### Screen 9: API & System Audit Logs (Super Admin Observability)
* **Design File:** `API Logs Dashboard Overview.png`
* **Inspiration:** J&J UiP API Logs Module.
* **Top Controls:** Date range picker (`Start Date` to `End Date`), Reset button, `[ Download Logs ]` (CSV/JSON), Column selector, Filter drawer, Search bar.
* **High-Density Data Grid:**
  * ID, Timestamp, Message (with hover tooltip for long strings), Activity By (User), Level (`INFO`, `WARN`, `ERROR`), Error Stack `(i)` trigger, Payload `{ }` trigger, Module, File Name, Method Name, Activity Title.
* **Modals:** Monospace Dark Traceback Modal + Formatted JSON Request/Response Inspector Modal.

---

## 6. PostgreSQL Database Architecture

```sql
-- 1. Locations
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL, -- 'MULEMBA', 'PALANCA', 'LOBITO'
    name VARCHAR(100) NOT NULL,
    city VARCHAR(50) DEFAULT 'Luanda',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Dynamic Roles & Users
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- 'SUPER_ADMIN', 'HQ_ADMIN', 'SUPERVISOR', 'CARTON_STAFF', etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id),
    warehouse_id INT REFERENCES warehouses(id), -- NULL for HQ/SuperAdmin, specific for branch staff
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Dynamic Tiles & Sub-Permissions (J&J Pattern)
CREATE TABLE dashboard_tiles (
    id SERIAL PRIMARY KEY,
    tile_key VARCHAR(50) UNIQUE NOT NULL, -- 'RECONCILIATION', 'CARTON_COUNTING', etc.
    title VARCHAR(100) NOT NULL,
    route_path VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    sort_order INT DEFAULT 0
);

CREATE TABLE tile_role_permissions (
    id SERIAL PRIMARY KEY,
    tile_id INT REFERENCES dashboard_tiles(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE(tile_id, role_id)
);

CREATE TABLE tile_sub_permissions (
    id SERIAL PRIMARY KEY,
    tile_id INT REFERENCES dashboard_tiles(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- 'EDIT_SALES', 'APPROVE_TRANSFER', etc.
    label VARCHAR(100) NOT NULL,
    UNIQUE(tile_id, code)
);

CREATE TABLE role_sub_permissions (
    id SERIAL PRIMARY KEY,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    sub_permission_id INT REFERENCES tile_sub_permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, sub_permission_id)
);

-- 4. Dynamic Lookup Dictionaries (No Hardcoded Dropdowns)
CREATE TABLE lookup_types (
    code VARCHAR(50) PRIMARY KEY, -- 'DISPLAY_REASON', 'DISCREPANCY_CAUSE', 'ARRIVAL_MODE'
    name VARCHAR(100) NOT NULL
);

CREATE TABLE lookup_values (
    id SERIAL PRIMARY KEY,
    lookup_type_code VARCHAR(50) REFERENCES lookup_types(code),
    key VARCHAR(50) NOT NULL,
    label VARCHAR(150) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Product Catalog & Packaging Units
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    units_per_carton INT NOT NULL DEFAULT 1, -- e.g. 24 units per carton
    unit_of_measure VARCHAR(20) DEFAULT 'Units',
    unit_price NUMERIC(12, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE
);

-- 6. Daily Inventory Sessions & Reconciliation Ledger
CREATE TABLE inventory_sessions (
    id SERIAL PRIMARY KEY,
    warehouse_id INT REFERENCES warehouses(id) NOT NULL,
    audit_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'UNDER_PROCESS', -- 'NOT_STARTED', 'UNDER_PROCESS', 'INVENTORY_DONE'
    finalized_by INT REFERENCES users(id),
    finalized_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(warehouse_id, audit_date)
);

CREATE TABLE daily_reconciliation_records (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES inventory_sessions(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) NOT NULL,
    opening_stock INT NOT NULL DEFAULT 0,
    arrivals_qty INT NOT NULL DEFAULT 0,
    transfers_qty INT NOT NULL DEFAULT 0,
    sales_qty INT NOT NULL DEFAULT 0, -- Supervisor manual entry
    carton_count INT NOT NULL DEFAULT 0,
    loose_count INT NOT NULL DEFAULT 0,
    display_count INT NOT NULL DEFAULT 0,
    required_stock INT GENERATED ALWAYS AS (opening_stock + arrivals_qty - transfers_qty - sales_qty) STORED,
    physical_stock INT NOT NULL DEFAULT 0,
    difference INT NOT NULL DEFAULT 0,
    remarks TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, product_id)
);

-- 7. Floor Physical Counts (Individual Staff Submissions)
CREATE TABLE physical_counts (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES inventory_sessions(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) NOT NULL,
    submitted_by INT REFERENCES users(id) NOT NULL,
    count_type VARCHAR(20) NOT NULL, -- 'CARTON', 'LOOSE', 'DISPLAY'
    quantity INT NOT NULL,
    change_reason_key VARCHAR(50), -- Mandatory for display changes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Arrivals & Shipments
CREATE TABLE shipment_arrivals (
    id SERIAL PRIMARY KEY,
    warehouse_id INT REFERENCES warehouses(id) NOT NULL,
    arrival_type VARCHAR(50) NOT NULL, -- 'SEA_SHIPMENT', 'LOCAL_SUPPLIER'
    vessel_name VARCHAR(100),
    tracking_bl_number VARCHAR(100),
    container_number VARCHAR(100),
    supplier_name VARCHAR(150),
    received_by INT REFERENCES users(id) NOT NULL,
    received_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'VERIFIED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE shipment_arrival_items (
    id SERIAL PRIMARY KEY,
    arrival_id INT REFERENCES shipment_arrivals(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) NOT NULL,
    batch_number VARCHAR(50) NOT NULL,
    expiry_date DATE NOT NULL,
    cartons_received INT NOT NULL DEFAULT 0,
    units_received INT NOT NULL DEFAULT 0
);

-- 9. Inter-Warehouse Transfers
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    from_warehouse_id INT REFERENCES warehouses(id) NOT NULL,
    to_warehouse_id INT REFERENCES warehouses(id) NOT NULL,
    dispatched_by INT REFERENCES users(id) NOT NULL,
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    driver_name VARCHAR(100),
    vehicle_plate VARCHAR(50),
    status VARCHAR(30) DEFAULT 'IN_TRANSIT', -- 'DRAFT', 'IN_TRANSIT', 'APPROVED', 'DISCREPANCY'
    approved_by INT REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE TABLE transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INT REFERENCES transfers(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) NOT NULL,
    batch_number VARCHAR(50),
    dispatched_qty INT NOT NULL,
    received_qty INT
);

-- 10. API & System Observability Logs (J&J Pattern)
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message VARCHAR(255) NOT NULL,
    user_id INT REFERENCES users(id),
    username VARCHAR(50),
    warehouse_id INT REFERENCES warehouses(id),
    level VARCHAR(20) DEFAULT 'INFO', -- 'INFO', 'WARN', 'ERROR'
    error_stack TEXT,
    payload JSONB,
    module_name VARCHAR(100),
    file_name VARCHAR(100),
    method_name VARCHAR(100),
    activity_title VARCHAR(150),
    status_code INT,
    latency_ms NUMERIC(8, 2)
);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX idx_api_logs_level ON api_logs(level);
```

---

## 7. Step-by-Step Implementation Roadmap

### Phase 1: Database Setup & Seed Data
* [ ] Initialize PostgreSQL database instance.
* [ ] Execute database migration/schema scripts (all 10 tables defined above).
* [ ] Execute seed script:
  * 3 Warehouses (`Mulemba`, `Palanca`, `Lobito`).
  * 6 Default Roles (`Super Admin`, `HQ Admin`, `Supervisor`, `Carton Staff`, `Loose Staff`, `Display Staff`).
  * 13 Dashboard Tiles + Sub-permission mappings.
  * Master Lookup Dictionaries (Display change reasons, discrepancy causes, packaging units, arrival modes).
  * Sample pharmaceutical product catalog with unit-per-carton specifications.
  * Initial **Super Admin** master account.

### Phase 2: FastAPI Backend Engine & Middleware
* [ ] Scaffold `backend/` directory with FastAPI, Pydantic v2, and SQLAlchemy (Async).
* [ ] Implement **Central API Logging Middleware** (records every request, payload, latency, and Python traceback into `api_logs`).
* [ ] Implement JWT Authentication & Password Hashing.
* [ ] Implement Dynamic Permission Guard (`@require_permission("TILE_KEY", "ACTION")`) and automatic warehouse data isolation.
* [ ] Build API Routers:
  * `/api/v1/auth`: Login, profile, permissions matrix.
  * `/api/v1/counts`: Staff count submissions (Carton, Loose, Display).
  * `/api/v1/reconciliation`: 13-column daily sheet, manual sales entry, supervisor remarks, daily finalization.
  * `/api/v1/shipments`: Sea & local arrival recording, auto-crediting of arrivals.
  * `/api/v1/transfers`: Inter-warehouse dispatch, receiving approval, waybill generation.
  * `/api/v1/hq`: 3-warehouse live status tracker, master consolidated inventory.
  * `/api/v1/admin/roles`: Dynamic role creator, tile permission manager.
  * `/api/v1/admin/users`: User provisioning, warehouse assignment, password reset.
  * `/api/v1/admin/lookups`: Dropdown dictionary CRUD and inline addition endpoint.
  * `/api/v1/admin/logs`: API logs search, filtering, download, and JSON traceback inspector.

### Phase 3: React + Vite Frontend Scaffolding
* [ ] Initialize React + Vite project in `frontend/`.
* [ ] Configure Tailwind CSS with the purple pharma design palette matching the mockups.
* [ ] Build App Shell:
  * Top Header Bar: Warehouse selector, Role badge, Date, Notifications, Profile avatar.
  * Collapsible Left Sidebar: Category navigation dynamically filtered by user permissions.
* [ ] Setup Auth & Scope State Context (stores user token, permissions, active warehouse scope).

### Phase 4: Screen-by-Screen Implementation
* [ ] **Screen 1:** Home / Operations Dashboard (4 KPI cards, 3 Priority Action cards, Live Stream feed, Stock Health widget).
* [ ] **Screen 2:** Stock Counting Terminal (Carton, Loose, and Display counting forms, touch steppers, "My Submissions Today" isolated table).
* [ ] **Screen 3:** Daily Reconciliation Sheet (13-column spreadsheet-style table, manual sales inputs, difference pills, remarks editor).
* [ ] **Screen 4:** Arrivals & Transfers Hub (Inward sea/local shipments ledger + inter-warehouse transfer dispatch & receiver approval).
* [ ] **Screen 5:** Quality & Alerts Dashboard (Product Differences variance table + Near Expiry batch schedule).
* [ ] **Screen 6:** HQ Master Dashboard (3-Warehouse live progress monitor + Master Angola inventory table with 5 filters).
* [ ] **Screen 7:** Role & Tile Authorization Manager (Dynamic roles, tile access drawer, sub-permissions, user creation & password reset).
* [ ] **Screen 8:** Master Dropdowns & Lookups Manager (Split two-panel dictionary manager + inline dropdown modal).
* [ ] **Screen 9:** API & System Audit Logs (High-density grid, date range filters, hover tooltips, traceback modal, payload JSON viewer).

### Phase 5: Verification & End-to-End Testing
* [ ] Multi-Role Testing: Login as Super Admin $\rightarrow$ Supervisor $\rightarrow$ Carton Staff $\rightarrow$ Loose Staff $\rightarrow$ Display Staff $\rightarrow$ HQ Admin to verify strict UI and API isolation.
* [ ] Formula Verification: Test that $\text{Required} = \text{Opening} + \text{Arrivals} - \text{Transfers} - \text{Sales}$ reconciles correctly across multiple days.
* [ ] Transfer Lifecycle: Dispatch from Mulemba to Palanca $\rightarrow$ Verify Palanca receiver approval $\rightarrow$ Confirm automatic arrivals credit.
* [ ] Display Continuity: Finalize day $\rightarrow$ Verify next day opening display matches previous closing.
* [ ] Logging & Traceability: Trigger simulated errors and verify stack traces appear in Screen 9.

---

*Document generated and saved in project directory:* `D:\AlliSons-Inventory\PROJECT_MASTER_PLAN.md`

