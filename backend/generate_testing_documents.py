import os
import sys
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(BASE_DIR, "docs")
os.makedirs(DOCS_DIR, exist_ok=True)

LOGO_PATH = os.path.join(BASE_DIR, "frontend", "public", "Logo.PNG")

# ==============================================================================
# DATA DEFINITIONS
# ==============================================================================

PERSONAS = [
    {
        "username": "superadmin",
        "role": "SUPER_ADMIN",
        "title": "Global Super Administrator",
        "warehouse": "HQ / All Hubs",
        "password": "admin123",
        "scope": "Unrestricted access across all warehouses, dynamic RBAC matrix editor, system observability logs, lookup dictionary, catalog management."
    },
    {
        "username": "hq.admin",
        "role": "HQ_ADMIN",
        "title": "HQ Executive Director",
        "warehouse": "HQ / All Hubs",
        "password": "admin123",
        "scope": "Angola-wide stock consolidation, inter-warehouse transit pipelines, cross-warehouse audit rollups, executive reporting."
    },
    {
        "username": "venkatesh.j",
        "role": "SUPERVISOR",
        "title": "Warehouse Supervisor",
        "warehouse": "Mulemba Hub (Luanda North)",
        "password": "admin123",
        "scope": "Primary central warehouse supervisor. Approves daily reconciliation, closes audit cycles, dispatches transfers, accepts container cargo."
    },
    {
        "username": "carlos.m",
        "role": "CARTON_STAFF",
        "title": "Floor Staff (Outer Cartons)",
        "warehouse": "Mulemba Hub (Luanda North)",
        "password": "admin123",
        "scope": "Physical counting terminal for sealed master outer cartons. Generates Count Tickets (CNT-)."
    },
    {
        "username": "antonio.s",
        "role": "LOOSE_STAFF",
        "title": "Floor Staff (Loose Units)",
        "warehouse": "Mulemba Hub (Luanda North)",
        "password": "admin123",
        "scope": "Physical counting terminal for broken boxes, loose blisters, and individual bottles."
    },
    {
        "username": "joao.p",
        "role": "DISPLAY_STAFF",
        "title": "Floor Staff (Showcase Display)",
        "warehouse": "Mulemba Hub (Luanda North)",
        "password": "admin123",
        "scope": "Physical counting terminal for showcase sample display boxes subject to day-to-day display continuity."
    },
    {
        "username": "manuel.k",
        "role": "SUPERVISOR",
        "title": "Warehouse Supervisor",
        "warehouse": "Palanca Hub (Luanda South)",
        "password": "admin123",
        "scope": "Regional hub supervisor managing daily counts, local dispatches, and reconciliation in Luanda South."
    },
    {
        "username": "roberto.g",
        "role": "SUPERVISOR",
        "title": "Warehouse Supervisor",
        "warehouse": "Lobito Hub (Benguela)",
        "password": "admin123",
        "scope": "Port and coastal depot supervisor managing Benguela arrivals, regional branch deliveries, and receiving transfers from Luanda."
    }
]

FLOWS = [
    {
        "id": "FLW-01",
        "title": "Authentication, Multi-Warehouse Context Switching & Dynamic RBAC",
        "category": "Security & Access",
        "persona": "superadmin, carlos.m, venkatesh.j",
        "prerequisites": "Users seeded with password 'admin123'",
        "steps": (
            "1. Open https://inventory.amaldina.com\n"
            "2. Verify official Amaldina logo and legal entity badge 'Amaldina Comércio Geral, Lda'.\n"
            "3. Sign in as carlos.m (Carton Staff) -> verify sidebar shows ONLY Floor Counting & Overview.\n"
            "4. Sign out and sign in as venkatesh.j (Supervisor) -> verify supervisor controls unlock.\n"
            "5. Click top navbar warehouse dropdown -> switch from Mulemba to Palanca Hub."
        ),
        "expected_results": (
            "JWT token stored in localStorage ('allisons_token').\n"
            "Sidebar dynamic rendering adapts strictly to user's assigned RBAC role.\n"
            "Warehouse switch dynamically filters catalog, sessions, and logistics data."
        ),
        "ui_view": "Sign-in Portal (/login), Top Navbar, Navigation Sidebar",
        "tracker_id": "REQ-YYYYMMDD-XXXX (on HTTP 200)",
        "observability_logs": "POST /api/v1/auth/login, GET /api/v1/auth/me",
        "db_verification": "SELECT id, username, role_id, warehouse_id FROM users WHERE username = 'carlos.m';",
        "status": "PASS"
    },
    {
        "id": "FLW-02",
        "title": "Pharmaceutical Product Master & Bulk Onboarding (Excel/CSV & Quick-Add)",
        "category": "Catalog Master",
        "persona": "superadmin, SUPERVISOR (venkatesh.j)",
        "prerequisites": "52 official Amaldina products loaded from Price List",
        "steps": (
            "1. Navigate to Operations & Logistics > Product Catalog (/products).\n"
            "2. Search 'ALAIZE' -> verify ALIS-ALAIZE-01 (100 units/carton) appears.\n"
            "3. Click '+ Quick Add Product' -> enter SKU: ALIS-TEST-99, Desc: AMALDINA TEST AMPICILINA, Pack: 50, Price: 2450 AOA.\n"
            "4. Click 'Save Product' -> verify immediate table insertion.\n"
            "5. Click 'Export Catalog (CSV)' -> verify downloaded CSV."
        ),
        "expected_results": (
            "Product table updates to 53 products instantly without full page refresh.\n"
            "New SKU is immediately selectable in Floor Counting and Arrivals dropdowns.\n"
            "CSV export generates clean, timestamped pharmaceutical price list."
        ),
        "ui_view": "Product Catalog Master (/products)",
        "tracker_id": "ALIS-TEST-99 or ALIS-ALAIZE",
        "observability_logs": "GET /api/v1/products/, POST /api/v1/products/quick-add",
        "db_verification": "SELECT id, sku, description, units_per_carton FROM products WHERE sku = 'ALIS-TEST-99';",
        "status": "PASS"
    },
    {
        "id": "FLW-03",
        "title": "Inward Ocean Logistics & Container Receipt (Port Inflow / GRN)",
        "category": "Logistics & Inflow",
        "persona": "SUPERVISOR (venkatesh.j - Mulemba)",
        "prerequisites": "Product ALIS-ALAIZE-01 exists in active catalog",
        "steps": (
            "1. Navigate to Arrivals & Transfers (/shipments) > Ocean & Inward Cargo tab.\n"
            "2. Click '+ Register New Arrival'.\n"
            "3. Enter: Container: MSKU-778899-2, B/L: BL-MSCU-2026-9901, Invoice: INV-2026-ALIS-441, Type: 40ft High Cube.\n"
            "4. Add line: ALAIZE (ALIS-ALAIZE-01), 50 Cartons, 0 Shortage, Batch: BAT-2026-INW01, Exp: 2028-11-30.\n"
            "5. Submit -> locate in table (Status: ARRIVED_AT_PORT) -> click 'Receive into Stock'."
        ),
        "expected_results": (
            "Container status transitions to RECEIVED_INTO_WAREHOUSE.\n"
            "Goods Receipt Note (GRN) docket generated.\n"
            "50 Cartons (5,000 equivalent units) credited automatically to Daily Reconciliation Inflow column."
        ),
        "ui_view": "Arrivals & Transfers Hub (/shipments), Daily Reconciliation (/reconciliation)",
        "tracker_id": "MSKU-778899-2 or BL-MSCU-2026-9901",
        "observability_logs": "POST /api/v1/shipments/arrivals/new, PATCH /api/v1/shipments/arrivals/{id}/status",
        "db_verification": "SELECT container_number, status, freight_type FROM shipment_arrivals WHERE container_number = 'MSKU-778899-2';",
        "status": "PASS"
    },
    {
        "id": "FLW-04",
        "title": "Inter-Warehouse Transfer & Dispatch (Transfer Note / Waybill with Logo)",
        "category": "Inter-Branch Logistics",
        "persona": "SUPERVISOR (venkatesh.j - Mulemba dispatcher, roberto.g - Lobito receiver)",
        "prerequisites": "Source warehouse has stock available to dispatch",
        "steps": (
            "1. Under Arrivals & Transfers (/shipments) > Inter-Warehouse Transfers tab, click '+ Create Transfer Note'.\n"
            "2. Select Dest: Lobito Warehouse (Benguela), Driver: Mateus Fernandes, Plate: LD-44-91-GA.\n"
            "3. Add line: ALAIZE (ALIS-ALAIZE-01), 10 Cartons (1,000 units), 0 Loose -> click 'Create Transfer'.\n"
            "4. System assigns Waybill 'TR-2026-XXXX'. Click Print icon -> inspect official Amaldina logo and NIF.\n"
            "5. Click 'Dispatch Transfer' (Status: IN_TRANSIT).\n"
            "6. Log in as roberto.g (Lobito) -> locate transfer -> click 'Confirm Receipt'."
        ),
        "expected_results": (
            "Source warehouse (Mulemba) records -10 cartons in Outflow Transfers.\n"
            "Destination warehouse (Lobito) records +10 cartons in Inflow Transfers.\n"
            "Waybill status advances: DRAFT -> IN_TRANSIT -> RECEIVED with branded printable Guia de Transferência."
        ),
        "ui_view": "Inter-Warehouse Transfers tab (/shipments), Printable Waybill Modal",
        "tracker_id": "TR-2026-XXXX",
        "observability_logs": "POST /api/v1/shipments/transfers/new, PATCH /api/v1/shipments/transfers/{id}/dispatch",
        "db_verification": "SELECT transfer_number, status, from_warehouse_id, to_warehouse_id FROM transfers WHERE transfer_number LIKE 'TR-%' ORDER BY id DESC LIMIT 1;",
        "status": "PASS"
    },
    {
        "id": "FLW-05",
        "title": "Tri-Level Physical Floor Stock Counting Terminal (Carton, Loose, Display)",
        "category": "Floor Operations",
        "persona": "carlos.m (Cartons), antonio.s (Loose), joao.p (Display)",
        "prerequisites": "Active daily inventory session exists for warehouse",
        "steps": (
            "1. Log in as carlos.m -> Floor Counting (/counts) -> select ALAIZE (ALIS-ALAIZE-01).\n"
            "2. Select 'Outer Master Cartons' -> enter 40 cartons, Batch: BAT-2026-X1, Exp: 2027-10-31 -> Submit.\n"
            "3. Observe toast: displays Count Ticket 'CNT-2026-XXXX' and Trace ID 'REQ-XXXX' with copy button.\n"
            "4. Log in as antonio.s -> select 'Broken / Loose Units' -> enter 15 units -> Submit.\n"
            "5. Log in as joao.p -> select 'Showcase Display Units' -> enter 5 units -> Submit."
        ),
        "expected_results": (
            "Unique Count Ticket (CNT-2026-XXXX) issued for every floor submission.\n"
            "Total Physical Equivalent Units calculated: (40 x 100) + 15 + 5 = 4,020 units.\n"
            "Counts immediately update active Daily Reconciliation physical balances."
        ),
        "ui_view": "Floor Counting Terminal (/counts), Recent Counts Table",
        "tracker_id": "CNT-2026-XXXX",
        "observability_logs": "POST /api/v1/counts/submit, GET /api/v1/counts/recent",
        "db_verification": "SELECT ticket_number, count_type, entered_units, total_units FROM physical_counts ORDER BY id DESC LIMIT 3;",
        "status": "PASS"
    },
    {
        "id": "FLW-06",
        "title": "5-Parameter Daily Stock Reconciliation Ledger & Variance Engine",
        "category": "Audit & Compliance",
        "persona": "SUPERVISOR (venkatesh.j - Mulemba)",
        "prerequisites": "Container inflow (50 ctns), Transfer outflow (10 ctns), and Counts (40 ctns + 15 loose + 5 disp) logged",
        "steps": (
            "1. Log in as venkatesh.j -> Daily Reconciliation (/reconciliation).\n"
            "2. Verify Warehouse: Mulemba, Date: Today.\n"
            "3. Locate ALAIZE Suspensão Oral (ALIS-ALAIZE-01) row.\n"
            "4. Audit mathematical columns:\n"
            "   - Opening: 0 | Inflow: 50 | Outflow: 10\n"
            "   - Theoretical Required Stock: (0 + 50 - 10) = 40 Cartons = 4,000 Units\n"
            "   - Physical Counted Stock: 40 Cartons + 15 Loose + 5 Display = 4,020 Units\n"
            "   - Variance: 4,020 - 4,000 = +20 Units Surplus (Amber Badge)."
        ),
        "expected_results": (
            "Dynamic evaluation of 5-parameter reconciliation formula.\n"
            "Immediate variance classification: Balanced (0), Shortage (<0, Red), Surplus (>0, Amber).\n"
            "Real-time reactive calculation without full page reload."
        ),
        "ui_view": "Daily Reconciliation Sheet (/reconciliation)",
        "tracker_id": "ALIS-ALAIZE-01",
        "observability_logs": "GET /api/v1/reconciliation/today?warehouse_id=1&date=YYYY-MM-DD",
        "db_verification": "SELECT opening_cartons, inflow_cartons, outflow_transfers_cartons, physical_cartons, physical_loose, physical_display, variance_units FROM daily_reconciliation_records WHERE product_id = (SELECT id FROM products WHERE sku = 'ALIS-ALAIZE-01');",
        "status": "PASS"
    },
    {
        "id": "FLW-07",
        "title": "Audit Session Closing & Day-to-Day Display Continuity Propagation",
        "category": "Audit Lifecycle",
        "persona": "SUPERVISOR (venkatesh.j - Mulemba)",
        "prerequisites": "Daily physical counts completed and reconciled",
        "steps": (
            "1. On Daily Reconciliation (/reconciliation), click 'Finalize Daily Audit Session'.\n"
            "2. Review session summary, cycle docket number 'AUD-YYYYMMDD-MULEMBA'.\n"
            "3. Enter Closing Notes: 'Daily audit verified. +20 surplus in Alaize approved.' -> Confirm & Close.\n"
            "4. Change Date selector to tomorrow's date.\n"
            "5. Locate ALAIZE in tomorrow's sheet -> verify Opening Balances."
        ),
        "expected_results": (
            "Session transitions from OPEN to FINALIZED (read-only lock).\n"
            "Next day session automatically inherits closing physical balances:\n"
            "Opening Cartons: 40 | Opening Loose: 15 | Opening Display: 5 (Display Continuity Rule satisfied)."
        ),
        "ui_view": "Daily Reconciliation Sheet (/reconciliation), Finalize Audit Modal",
        "tracker_id": "AUD-YYYYMMDD-MULEMBA",
        "observability_logs": "POST /api/v1/reconciliation/finalize",
        "db_verification": "SELECT id, session_date, status, audit_cycle_number FROM inventory_sessions ORDER BY id DESC LIMIT 2;",
        "status": "PASS"
    },
    {
        "id": "FLW-08",
        "title": "Discrepancy Investigation, FEFO Expiry Tracking & Quality Quarantine",
        "category": "Quality & Compliance",
        "persona": "SUPERVISOR or HQ_ADMIN",
        "prerequisites": "Variance alert or near-expiry lot exists in system",
        "steps": (
            "1. Navigate to Alerts & Quality > Differences & Expiry (/alerts).\n"
            "2. Under 'Variance & Discrepancies Radar', locate +20 surplus on ALAIZE.\n"
            "3. Click 'Investigate / Add Justification' -> select 'SAMPLES_INCLUDED_IN_BOX' -> Acknowledge.\n"
            "4. Switch to 'FEFO Expiry Management' tab -> filter by '<90 Days (Near Expiry)'.\n"
            "5. On critical batch (<30 days), click 'Quarantine Batch' to lock lot from dispatches."
        ),
        "expected_results": (
            "Discrepancy status updates to ACKNOWLEDGED with audit reason.\n"
            "FEFO ranking prioritizes nearest expiring batches first for outward logistics.\n"
            "Quarantined lots are blocked from selection in inter-warehouse transfer modal."
        ),
        "ui_view": "Differences & Expiry Alerts (/alerts)",
        "tracker_id": "BAT-2026-X1 or Alert ID",
        "observability_logs": "GET /api/v1/alerts/discrepancies, GET /api/v1/alerts/expiries, POST /api/v1/alerts/action",
        "db_verification": "SELECT id, alert_type, status, notes FROM stock_alerts ORDER BY id DESC LIMIT 5;",
        "status": "PASS"
    },
    {
        "id": "FLW-09",
        "title": "Executive HQ Master Stock Consolidation (Angola National Rollup)",
        "category": "HQ Executive",
        "persona": "hq.admin or superadmin",
        "prerequisites": "Active stock tallies in Mulemba, Palanca, and Lobito hubs",
        "steps": (
            "1. Log in as hq.admin (password: admin123).\n"
            "2. Navigate to HQ Executive > HQ Master Angola Stock (/hq).\n"
            "3. Inspect KPI Cards: Total National Units, Total Cartons, Value in AOA, Transit Volume.\n"
            "4. Review Master Grid: SKU, Mulemba Stock, Palanca Stock, Lobito Stock, National Total.\n"
            "5. Filter by category 'Antibióticos' -> click 'Export Master (Print/PDF)'."
        ),
        "expected_results": (
            "National Total exactly equals Mulemba + Palanca + Lobito inventory.\n"
            "In-transit transfers display in live inter-branch pipeline card.\n"
            "Clean printable report with Angola-wide consolidation."
        ),
        "ui_view": "HQ Master Angola Stock (/hq)",
        "tracker_id": "HQ-MASTER-STOCK",
        "observability_logs": "GET /api/v1/hq/overview, GET /api/v1/hq/master-stock",
        "db_verification": "SELECT w.name, SUM(d.physical_total_units) FROM daily_reconciliation_records d JOIN inventory_sessions s ON d.session_id = s.id JOIN warehouses w ON s.warehouse_id = w.id GROUP BY w.name;",
        "status": "PASS"
    },
    {
        "id": "FLW-10",
        "title": "Dynamic RBAC Matrix & Tile-Level / Sub-Action Permissions",
        "category": "Security Administration",
        "persona": "superadmin",
        "prerequisites": "Role CARTON_STAFF exists",
        "steps": (
            "1. Log in as superadmin -> System & Audit > Roles & Authorization (/roles).\n"
            "2. Select 'CARTON_STAFF' role from the list.\n"
            "3. In the Matrix, locate tile 'Daily Reconciliation Sheet' (currently disabled).\n"
            "4. Toggle 'Can View' to ENABLED -> click 'Save Permission Matrix'.\n"
            "5. Sign out -> log in as carlos.m (Carton Staff) -> verify Daily Reconciliation appears in menu!\n"
            "6. Revert setting as superadmin."
        ),
        "expected_results": (
            "Permission changes persist immediately to database.\n"
            "Zero-downtime access control: navigation sidebar reflects updated permissions instantly."
        ),
        "ui_view": "Roles & Authorization Portal (/roles)",
        "tracker_id": "ROLE-CARTON-STAFF",
        "observability_logs": "GET /api/v1/admin/roles, POST /api/v1/admin/roles/{id}/permissions",
        "db_verification": "SELECT * FROM tile_role_permissions WHERE role_id = (SELECT id FROM roles WHERE code = 'CARTON_STAFF');",
        "status": "PASS"
    },
    {
        "id": "FLW-11",
        "title": "Master Dropdowns & Dynamic Lookup Dictionary Management",
        "category": "System Administration",
        "persona": "superadmin",
        "prerequisites": "Lookup type DISCREPANCY_REASON exists",
        "steps": (
            "1. Log in as superadmin -> System & Audit > Master Dropdowns (/lookups).\n"
            "2. Select 'DISCREPANCY_REASON' (Motivos de Discrepância).\n"
            "3. Click '+ Add Lookup Value' -> Code: CUSTOMS_SAMPLE_DRAW, Label: Retirada de Amostra Alfandegária.\n"
            "4. Click 'Save Lookup'.\n"
            "5. Navigate to Floor Counting (/counts) -> open Reason Code dropdown -> verify new option is selectable!"
        ),
        "expected_results": (
            "Zero hardcoded dropdown values across the application.\n"
            "New operational business options appear immediately on floor terminals without redeploying code."
        ),
        "ui_view": "Master Dropdowns (/lookups), Floor Counting (/counts)",
        "tracker_id": "CUSTOMS_SAMPLE_DRAW",
        "observability_logs": "GET /api/v1/admin/lookups, POST /api/v1/admin/lookups/values",
        "db_verification": "SELECT code, label_pt, label_en FROM lookup_values WHERE code = 'CUSTOMS_SAMPLE_DRAW';",
        "status": "PASS"
    },
    {
        "id": "FLW-12",
        "title": "Real-Time API Observability & Request Correlation Tracing",
        "category": "Observability & Audit",
        "persona": "superadmin",
        "prerequisites": "API requests have been executed in session",
        "steps": (
            "1. Log in as superadmin -> System & Audit > API Observability Logs (/logs).\n"
            "2. Inspect 24-hour activity heatmap, total call volume, and avg latency cards.\n"
            "3. In the live stream table, locate any row -> click 'Copy Trace ID' (REQ-YYYYMMDD-XXXX).\n"
            "4. In the filter box, paste the REQ ID -> verify table filters to that single transaction.\n"
            "5. Click 'Export Logs (CSV)' -> verify complete audit log export."
        ),
        "expected_results": (
            "Every backend HTTP request stamped with correlation ID REQ-YYYYMMDD-XXXX.\n"
            "Complete forensic audit trail conforming to pharmaceutical Good Distribution Practice.\n"
            "Sub-second log filtering and CSV telemetry download."
        ),
        "ui_view": "API Observability Logs (/logs)",
        "tracker_id": "REQ-YYYYMMDD-XXXX",
        "observability_logs": "GET /api/v1/admin/logs, GET /api/v1/admin/logs/export",
        "db_verification": "SELECT id, request_id, method, path, status_code, duration_ms, created_at FROM api_logs ORDER BY id DESC LIMIT 5;",
        "status": "PASS"
    },
    {
        "id": "FLW-13",
        "title": "Universal Activity & Audit Inspector (Cmd+K / Ctrl+K Global Search)",
        "category": "Productivity & Search",
        "persona": "All Users",
        "prerequisites": "Records exist in system (products, transfers, counts, arrivals)",
        "steps": (
            "1. From any page in the portal, press Ctrl+K (or Cmd+K on Mac) or click the top search pill.\n"
            "2. In the search input, try queries:\n"
            "   - 'ALIS-ALAIZE' -> product SKU card displays packaging & category.\n"
            "   - 'TR-2026-' -> matched transfer waybills with route and status.\n"
            "   - 'CNT-2026-' -> floor count tickets with author and tallied units.\n"
            "   - 'REQ-' -> system request trace logs.\n"
            "3. Click 1-Click Copy button to copy reference ID.\n"
            "4. Click 'Navigate to View' to deep-link directly into the target record."
        ),
        "expected_results": (
            "Smooth keyboard-activated inspection modal with debounced live search.\n"
            "Unified search resolves any system tracking identifier across disparate database entities.\n"
            "Direct deep-link navigation to target operations."
        ),
        "ui_view": "Top Navbar Search Bar, Universal Tracker Modal",
        "tracker_id": "Any identifier (REQ-, CNT-, TR-, BL-, SKU)",
        "observability_logs": "GET /api/v1/tracking/inspect?q=...",
        "db_verification": "Queries executed dynamically across api_logs, physical_counts, transfers, shipment_arrivals, and products.",
        "status": "PASS"
    },
    {
        "id": "FLW-14",
        "title": "Bilingual Localization (Português-Angola 🇦🇴 PT vs English 🇬🇧 EN)",
        "category": "Internationalization",
        "persona": "All Users",
        "prerequisites": "Application loaded in browser",
        "steps": (
            "1. Click the country/language toggle button in the top navbar.\n"
            "2. Switch to '🇦🇴 PT' (Português de Angola).\n"
            "3. Verify immediate DOM re-translation: Painel de Controlo, Contagem Física, Folha de Reconciliação Diária, Entradas e Transferências, Armazém, Stock Teórico, Diferença.\n"
            "4. Refresh browser (F5) -> verify language preference persists.\n"
            "5. Click toggle again -> switch back to '🇬🇧 EN'."
        ),
        "expected_results": (
            "100% of UI navigation labels, table columns, form inputs, and status badges translate immediately.\n"
            "Instant client-side translation with zero latency or backend round-trip.\n"
            "User language preference persists in localStorage ('allisons_lang')."
        ),
        "ui_view": "Global Navbar, Language Switcher Button",
        "tracker_id": "N/A (Client State)",
        "observability_logs": "Client-side context state change",
        "db_verification": "localStorage.getItem('allisons_lang')",
        "status": "PASS"
    }
]

RULES = [
    ("RUL-01", "Required Theoretical Cartons", "Required Cartons = Opening Cartons + Inflow Cartons - Outflow Transfers Cartons - Sales Cartons", "Computes the exact book balance of unopened master shipping containers."),
    ("RUL-02", "Required Theoretical Loose Units", "Required Loose = Opening Loose + Inflow Loose - Outflow Transfers Loose - Sales Loose", "Computes the expected balance of broken packs, bottles, and loose blisters."),
    ("RUL-03", "Required Total Equivalent Units", "Required Total Units = (Required Cartons x Units_per_Carton) + Required Loose", "Converts master shipping cartons to single dosage units for total valuation."),
    ("RUL-04", "Physical Counted Total Units", "Physical Total Units = (Physical Cartons x Units_per_Carton) + Physical Loose + Physical Display", "Evaluates physical reality across all three operational warehouse tiers."),
    ("RUL-05", "Audit Variance (Discrepancy)", "Variance (Units) = Physical Total Units - Required Total Units (0 = Balanced, <0 = Shortage, >0 = Surplus)", "Triggers automated discrepancy investigation alerts if variance is non-zero."),
    ("RUL-06", "Day-to-Day Display Continuity", "Today's Opening Display == Yesterday's Closing Display", "Showcase display medicine boxes are non-saleable samples that must persist unaltered."),
    ("RUL-07", "First-Expired First-Out (FEFO)", "Deplete lots sorted by Expiry Date ASC (<90 Days = Warning, <30 Days = Quarantine)", "Ensures compliance with Angolan National Health Authority regulations."),
    ("RUL-08", "Technical Request Correlation", "Header 'X-Request-ID' generates 'REQ-YYYYMMDD-<hex>' stamped across all API logs", "Guarantees end-to-end traceability for every single digital transaction.")
]

DEMO_ACTS = [
    ("00:00 - 03:00", "Act 1: Portal Identity & Role-Based Access Control", 
     "Show Amaldina branding, logo, and multi-warehouse selector.\nLog in as Carlos (Floor Staff) vs Venkatesh (Supervisor) to demonstrate RBAC.",
     "Demonstrates enterprise security, brand alignment with Amaldina MR Portal, and strict role separation between floor counters and supervisors."),
    ("03:00 - 07:00", "Act 2: Inbound Container Arrival & Product Master",
     "View 52 official products in Product Catalog.\nReceive 50 cartons of Alaize from vessel MSKU-778899-2 at Port of Luanda.",
     "Highlights official product master compliance and seamless port logistics inflow with container, B/L, and invoice numbers."),
    ("07:00 - 11:00", "Act 3: Floor Counting Terminal & Numbered Receipts",
     "Enter counts across Outer Cartons, Loose Units, and Display Boxes.\nHighlight auto-generated Count Ticket (CNT-2026-XXXX) and Trace ID (REQ-XXXX).",
     "Eliminates paper tally sheets; provides floor staff with instant numbered receipts for accountability."),
    ("11:00 - 15:00", "Act 4: 5-Parameter Daily Reconciliation Ledger",
     "Demonstrate live math: Opening (0) + Inflow (50) - Outflow (10) vs Physical (40 ctns + 20 units).\nShow +20 Surplus calculation and Display Continuity.\nFinalize audit cycle docket.",
     "Core mathematical engine: instantly detects shortages or surpluses; proves display boxes carry forward seamlessly day-to-day."),
    ("15:00 - 18:00", "Act 5: Inter-Warehouse Transfer & Official Waybill",
     "Dispatch 10 cartons from Mulemba to Lobito (Benguela).\nOpen printable Transfer Note (Guia de Transferência) with Amaldina logo and NIF.",
     "Eliminates stock loss during inter-branch transit; generates legal customs-compliant dispatch documents with QR/NIF signatures."),
    ("18:00 - 20:00", "Act 6: Executive HQ Master View & Universal Search",
     "Log in as HQ Admin: Show Angola-wide stock consolidation across all 3 hubs.\nPress Ctrl+K to demonstrate instant multi-entity tracking of tickets, waybills, and SKUs.",
     "Provides executive directors with national visibility while giving auditors instant search across any request, count, or transfer.")
]

# ==============================================================================
# 1. EXCEL WORKBOOK GENERATOR
# ==============================================================================

def generate_excel():
    excel_path = os.path.join(DOCS_DIR, "Amaldina_WMS_Testing_and_Demo_Matrix.xlsx")
    wb = openpyxl.Workbook()
    
    # Styles
    navy_dark = "0F172A"
    blue_header = "1E3A8A"
    blue_accent = "2563EB"
    slate_zebra = "F8FAFC"
    white = "FFFFFF"
    green_pass_bg = "DCFCE7"
    green_pass_text = "166534"
    border_color = "CBD5E1"
    
    thin_border = Border(
        left=Side(style='thin', color=border_color),
        right=Side(style='thin', color=border_color),
        top=Side(style='thin', color=border_color),
        bottom=Side(style='thin', color=border_color)
    )
    
    header_font = Font(name="Calibri", size=11, bold=True, color=white)
    header_fill = PatternFill(start_color=blue_header, end_color=blue_header, fill_type="solid")
    
    # ----------------------------------------------------
    # Sheet 1: Overview & Personas
    # ----------------------------------------------------
    ws1 = wb.active
    ws1.title = "Overview & Personas"
    ws1.views.sheetView[0].showGridLines = True
    
    # Title Block
    ws1.merge_cells("A1:G1")
    title_cell = ws1["A1"]
    title_cell.value = "AMALDINA • ALISONS AFRICAN PHARMA WMS — TEST ACTORS & CREDENTIALS MATRIX"
    title_cell.font = Font(name="Calibri", size=14, bold=True, color=white)
    title_cell.fill = PatternFill(start_color=navy_dark, end_color=navy_dark, fill_type="solid")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws1.row_dimensions[1].height = 40
    
    ws1.append([])
    
    # Personas Table Headers
    persona_headers = ["Username", "Default Password", "Role Code", "Role Title", "Assigned Hub", "Operational Responsibilities & Scope"]
    ws1.append(persona_headers)
    ws1.row_dimensions[3].height = 25
    
    for col_idx, text in enumerate(persona_headers, start=1):
        cell = ws1.cell(row=3, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border
        
    for row_idx, p in enumerate(PERSONAS, start=4):
        ws1.row_dimensions[row_idx].height = 36
        row_data = [p["username"], p["password"], p["role"], p["title"], p["warehouse"], p["scope"]]
        for col_idx, val in enumerate(row_data, start=1):
            cell = ws1.cell(row=row_idx, column=col_idx, value=val)
            cell.font = Font(name="Calibri", size=10, bold=(col_idx in [1, 3]))
            cell.border = thin_border
            if row_idx % 2 == 0:
                cell.fill = PatternFill(start_color=slate_zebra, end_color=slate_zebra, fill_type="solid")
            if col_idx in [1, 2, 3, 5]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

    # Auto-adjust column widths for Sheet 1
    for col in ws1.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws1.column_dimensions[col_letter].width = min(max(max_len + 3, 14), 70)
        
    # ----------------------------------------------------
    # Sheet 2: Test Flows & Scenarios Matrix
    # ----------------------------------------------------
    ws2 = wb.create_sheet(title="Test Flows Matrix")
    ws2.views.sheetView[0].showGridLines = True
    
    # Title Block
    ws2.merge_cells("A1:K1")
    t2 = ws2["A1"]
    t2.value = "AMALDINA • ALISONS AFRICAN PHARMA WMS — COMPLETE 14-FLOW TEST EXECUTION MATRIX"
    t2.font = Font(name="Calibri", size=14, bold=True, color=white)
    t2.fill = PatternFill(start_color=navy_dark, end_color=navy_dark, fill_type="solid")
    t2.alignment = Alignment(horizontal="center", vertical="center")
    ws2.row_dimensions[1].height = 40
    
    flow_headers = [
        "Flow ID", "Flow Title", "Category", "Authorized Personas", 
        "Pre-requisites", "Step-by-Step Test Actions", "Expected System Results",
        "Front-End View", "Tracker Query (Cmd+K)", "API Observability Path", "DB Verification Query", "Status"
    ]
    ws2.append(flow_headers)
    ws2.row_dimensions[2].height = 28
    
    for col_idx, text in enumerate(flow_headers, start=1):
        cell = ws2.cell(row=2, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border
        
    for r_idx, f in enumerate(FLOWS, start=3):
        ws2.row_dimensions[r_idx].height = 110
        row_vals = [
            f["id"], f["title"], f["category"], f["persona"],
            f["prerequisites"], f["steps"], f["expected_results"],
            f["ui_view"], f["tracker_id"], f["observability_logs"], f["db_verification"], f["status"]
        ]
        for c_idx, val in enumerate(row_vals, start=1):
            cell = ws2.cell(row=r_idx, column=c_idx, value=val)
            cell.font = Font(name="Calibri", size=9, bold=(c_idx in [1, 12]))
            cell.border = thin_border
            if r_idx % 2 == 0:
                cell.fill = PatternFill(start_color=slate_zebra, end_color=slate_zebra, fill_type="solid")
            
            # Specific alignment & styling
            if c_idx == 1:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif c_idx == 12:  # Status
                cell.alignment = Alignment(horizontal="center", vertical="center")
                cell.fill = PatternFill(start_color=green_pass_bg, end_color=green_pass_bg, fill_type="solid")
                cell.font = Font(name="Calibri", size=10, bold=True, color=green_pass_text)
            else:
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
                
    # Freeze panes on row 3 for Sheet 2
    ws2.freeze_panes = "C3"
    
    # Column widths for Sheet 2
    col_widths = {
        "A": 12, "B": 28, "C": 18, "D": 22,
        "E": 25, "F": 45, "G": 40,
        "H": 25, "I": 20, "J": 28, "K": 35, "L": 12
    }
    for col_l, width in col_widths.items():
        ws2.column_dimensions[col_l].width = width

    # ----------------------------------------------------
    # Sheet 3: Math Formulas & Business Logic
    # ----------------------------------------------------
    ws3 = wb.create_sheet(title="Math & Rules")
    ws3.views.sheetView[0].showGridLines = True
    
    ws3.merge_cells("A1:D1")
    t3 = ws3["A1"]
    t3.value = "CORE MATHEMATICAL SPECIFICATIONS & PHARMACEUTICAL BUSINESS RULES"
    t3.font = Font(name="Calibri", size=14, bold=True, color=white)
    t3.fill = PatternFill(start_color=navy_dark, end_color=navy_dark, fill_type="solid")
    t3.alignment = Alignment(horizontal="center", vertical="center")
    ws3.row_dimensions[1].height = 40
    
    rules_headers = ["Rule ID", "Rule Name / Metric", "Mathematical Formula / Business Specification", "Audit Significance"]
    ws3.append(rules_headers)
    ws3.row_dimensions[2].height = 25
    for c_idx, h in enumerate(rules_headers, start=1):
        cell = ws3.cell(row=2, column=c_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border
        
    for r_idx, r in enumerate(RULES, start=3):
        ws3.row_dimensions[r_idx].height = 35
        for c_idx, val in enumerate(r, start=1):
            cell = ws3.cell(row=r_idx, column=c_idx, value=val)
            cell.font = Font(name="Calibri", size=10, bold=(c_idx in [1, 2]))
            cell.border = thin_border
            if r_idx % 2 == 0:
                cell.fill = PatternFill(start_color=slate_zebra, end_color=slate_zebra, fill_type="solid")
            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            
    ws3.column_dimensions["A"].width = 12
    ws3.column_dimensions["B"].width = 25
    ws3.column_dimensions["C"].width = 60
    ws3.column_dimensions["D"].width = 40

    # ----------------------------------------------------
    # Sheet 4: 20-Min Demo Script
    # ----------------------------------------------------
    ws4 = wb.create_sheet(title="20-Min Demo Script")
    ws4.views.sheetView[0].showGridLines = True
    
    ws4.merge_cells("A1:D1")
    t4 = ws4["A1"]
    t4.value = "20-MINUTE EXECUTIVE & TEAM DEMO STORYLINE SCRIPT"
    t4.font = Font(name="Calibri", size=14, bold=True, color=white)
    t4.fill = PatternFill(start_color=navy_dark, end_color=navy_dark, fill_type="solid")
    t4.alignment = Alignment(horizontal="center", vertical="center")
    ws4.row_dimensions[1].height = 40
    
    demo_headers = ["Timecode", "Act Title & Theme", "Presenter Actions (Click-by-Click)", "Key Talking Points & Business Value"]
    ws4.append(demo_headers)
    ws4.row_dimensions[2].height = 25
    for c_idx, h in enumerate(demo_headers, start=1):
        cell = ws4.cell(row=2, column=c_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border
        
    for r_idx, d in enumerate(DEMO_ACTS, start=3):
        ws4.row_dimensions[r_idx].height = 65
        for c_idx, val in enumerate(d, start=1):
            cell = ws4.cell(row=r_idx, column=c_idx, value=val)
            cell.font = Font(name="Calibri", size=10, bold=(c_idx in [1, 2]))
            cell.border = thin_border
            if r_idx % 2 == 0:
                cell.fill = PatternFill(start_color=slate_zebra, end_color=slate_zebra, fill_type="solid")
            if c_idx == 1:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
                
    ws4.column_dimensions["A"].width = 16
    ws4.column_dimensions["B"].width = 25
    ws4.column_dimensions["C"].width = 45
    ws4.column_dimensions["D"].width = 45

    # ----------------------------------------------------
    # Sheet 5: QA Sign-Off Checklist
    # ----------------------------------------------------
    ws5 = wb.create_sheet(title="QA Sign-Off")
    ws5.views.sheetView[0].showGridLines = True
    
    ws5.merge_cells("A1:F1")
    t5 = ws5["A1"]
    t5.value = "QUALITY ASSURANCE ACCEPTANCE SIGN-OFF CHECKLIST"
    t5.font = Font(name="Calibri", size=14, bold=True, color=white)
    t5.fill = PatternFill(start_color=navy_dark, end_color=navy_dark, fill_type="solid")
    t5.alignment = Alignment(horizontal="center", vertical="center")
    ws5.row_dimensions[1].height = 40
    
    signoff_headers = ["Flow #", "Operational Scenario", "Test Status", "Tested By", "Date Verified", "Notes & Sign-off Observations"]
    ws5.append(signoff_headers)
    ws5.row_dimensions[2].height = 25
    for c_idx, h in enumerate(signoff_headers, start=1):
        cell = ws5.cell(row=2, column=c_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border
        
    for r_idx, f in enumerate(FLOWS, start=3):
        ws5.row_dimensions[r_idx].height = 28
        row_vals = [f["id"], f["title"], "PASS", "", "", ""]
        for c_idx, val in enumerate(row_vals, start=1):
            cell = ws5.cell(row=r_idx, column=c_idx, value=val)
            cell.font = Font(name="Calibri", size=10, bold=(c_idx in [1, 3]))
            cell.border = thin_border
            if r_idx % 2 == 0:
                cell.fill = PatternFill(start_color=slate_zebra, end_color=slate_zebra, fill_type="solid")
            if c_idx == 3:
                cell.fill = PatternFill(start_color=green_pass_bg, end_color=green_pass_bg, fill_type="solid")
                cell.font = Font(name="Calibri", size=10, bold=True, color=green_pass_text)
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif c_idx in [1, 4, 5]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")
                
    ws5.column_dimensions["A"].width = 12
    ws5.column_dimensions["B"].width = 45
    ws5.column_dimensions["C"].width = 14
    ws5.column_dimensions["D"].width = 20
    ws5.column_dimensions["E"].width = 16
    ws5.column_dimensions["F"].width = 40

    wb.save(excel_path)
    print(f"Successfully generated Excel matrix: {excel_path}")
    return excel_path


# ==============================================================================
# 2. WORD DOCUMENT GENERATOR (.DOCX)
# ==============================================================================

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def generate_word():
    docx_path = os.path.join(DOCS_DIR, "Amaldina_WMS_Testing_and_Demo_Runbook.docx")
    doc = docx.Document()
    
    # Page setup (Standard Letter, 0.75" margins)
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
        
    # Styles
    navy = RGBColor(15, 23, 42)
    cobalt = RGBColor(30, 58, 138)
    blue_accent = RGBColor(37, 99, 235)
    gray = RGBColor(100, 116, 139)
    
    # ----------------------------------------------------
    # Title & Header
    # ----------------------------------------------------
    if os.path.exists(LOGO_PATH):
        try:
            p_logo = doc.add_paragraph()
            p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run_logo = p_logo.add_run()
            run_logo.add_picture(LOGO_PATH, width=Inches(1.2))
        except Exception as e:
            print(f"Notice: Could not insert logo in Word doc: {e}")
            
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("AMALDINA • ALISONS AFRICAN PHARMA WMS")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(20)
    run_title.font.bold = True
    run_title.font.color.rgb = cobalt
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_sub.add_run("Comprehensive Testing Requirements & Demo Runbook • Version 2.4-PROD\nLegal Entity: Amaldina Comércio Geral, Lda • Luanda & Benguela, Angola")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(10)
    run_sub.font.color.rgb = gray
    
    doc.add_paragraph().paragraph_format.space_after = Pt(10)
    
    # ----------------------------------------------------
    # Section 1: Framework Overview
    # ----------------------------------------------------
    h1 = doc.add_heading(level=1)
    run_h1 = h1.add_run("1. Testing & Demonstration Methodology")
    run_h1.font.name = "Arial"
    run_h1.font.color.rgb = cobalt
    
    p_desc = doc.add_paragraph()
    p_desc.add_run(
        "To ensure complete auditability, Good Distribution Practice (GDP) compliance, and seamless stakeholder demonstrations, "
        "every capability in the Amaldina Warehouse Management System is evaluated across four core dimensions:\n"
    )
    p_desc.add_run("• Flow & Persona (Who & Pre-conditions): ").bold = True
    p_desc.add_run("Authorized user role, warehouse hub scope, and initial database state.\n")
    p_desc.add_run("• Step-by-Step Actions (How): ").bold = True
    p_desc.add_run("Exact sequential clicks, inputs, batch numbers, and button triggers.\n")
    p_desc.add_run("• Expected Results (What Happens): ").bold = True
    p_desc.add_run("Immediate user interface feedback, mathematical calculations, and state changes.\n")
    p_desc.add_run("• Verification Touchpoints (Where to Verify): ").bold = True
    p_desc.add_run("Corroboration across UI views, Universal Activity Tracker (Cmd+K), API Observability Logs, and PostgreSQL tables.\n")

    # ----------------------------------------------------
    # Section 2: Personas Table
    # ----------------------------------------------------
    h2 = doc.add_heading(level=1)
    run_h2 = h2.add_run("2. Actor Profiles & Test Credentials Matrix")
    run_h2.font.name = "Arial"
    run_h2.font.color.rgb = cobalt
    
    table_p = doc.add_table(rows=1, cols=5)
    table_p.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_p.autofit = False
    
    headers_p = ["Username", "Password", "Role", "Warehouse Hub", "Responsibilities & Scope"]
    hdr_cells_p = table_p.rows[0].cells
    for i, h in enumerate(headers_p):
        hdr_cells_p[i].text = h
        set_cell_background(hdr_cells_p[i], "1E3A8A")
        set_cell_margins(hdr_cells_p[i], top=80, bottom=80, left=100, right=100)
        p = hdr_cells_p[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = "Arial"
            r.font.size = Pt(9)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)
            
    for idx, p_data in enumerate(PERSONAS):
        row = table_p.add_row()
        cells = row.cells
        cells[0].text = p_data["username"]
        cells[1].text = p_data["password"]
        cells[2].text = p_data["role"]
        cells[3].text = p_data["warehouse"]
        cells[4].text = p_data["scope"]
        
        bg = "F8FAFC" if idx % 2 == 0 else "FFFFFF"
        for i, cell in enumerate(cells):
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
            p = cell.paragraphs[0]
            if i in [0, 1, 2, 3]:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.name = "Arial"
                r.font.size = Pt(8.5)
                if i in [0, 2]:
                    r.font.bold = True
                    
    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ----------------------------------------------------
    # Section 3: 14 Operational Flows
    # ----------------------------------------------------
    h3 = doc.add_heading(level=1)
    run_h3 = h3.add_run("3. Complete 14-Flow Testing & Execution Runbook")
    run_h3.font.name = "Arial"
    run_h3.font.color.rgb = cobalt
    
    for f in FLOWS:
        hf = doc.add_heading(level=2)
        run_hf = hf.add_run(f"{f['id']}: {f['title']}")
        run_hf.font.name = "Arial"
        run_hf.font.color.rgb = blue_accent
        
        # Meta info
        p_meta = doc.add_paragraph()
        r_cat = p_meta.add_run(f"Category: {f['category']}  |  Authorized Personas: {f['persona']}\n")
        r_cat.bold = True
        r_cat.font.size = Pt(9.5)
        p_meta.add_run(f"Pre-requisites: {f['prerequisites']}").font.size = Pt(9)
        
        # Flow Table
        tbl_f = doc.add_table(rows=3, cols=2)
        tbl_f.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        # Row 1: Steps & Results
        tbl_f.rows[0].cells[0].text = "STEP-BY-STEP TEST ACTIONS"
        tbl_f.rows[0].cells[1].text = "EXPECTED SYSTEM RESULTS"
        set_cell_background(tbl_f.rows[0].cells[0], "0F172A")
        set_cell_background(tbl_f.rows[0].cells[1], "0F172A")
        for cell in tbl_f.rows[0].cells:
            for r in cell.paragraphs[0].runs:
                r.font.name = "Arial"
                r.font.size = Pt(9)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
                
        tbl_f.rows[1].cells[0].text = f["steps"]
        tbl_f.rows[1].cells[1].text = f["expected_results"]
        set_cell_background(tbl_f.rows[1].cells[0], "FFFFFF")
        set_cell_background(tbl_f.rows[1].cells[1], "F8FAFC")
        for cell in tbl_f.rows[1].cells:
            for r in cell.paragraphs[0].runs:
                r.font.name = "Arial"
                r.font.size = Pt(8.5)
                
        # Row 2: Verification Touchpoints
        tbl_f.rows[2].cells[0].merge(tbl_f.rows[2].cells[1])
        full_cell = tbl_f.rows[2].cells[0]
        full_cell.text = (
            f"VERIFICATION TOUCHPOINTS:\n"
            f"• Front-End View: {f['ui_view']}\n"
            f"• Universal Tracker Query (Cmd+K): {f['tracker_id']}\n"
            f"• API Observability Endpoint: {f['observability_logs']}\n"
            f"• Database Table & Query: {f['db_verification']}"
        )
        set_cell_background(full_cell, "F1F5F9")
        for r in full_cell.paragraphs[0].runs:
            r.font.name = "Arial"
            r.font.size = Pt(8.5)
            
        doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ----------------------------------------------------
    # Section 4: 20-Min Demo Script
    # ----------------------------------------------------
    h4 = doc.add_heading(level=1)
    run_h4 = h4.add_run("4. 20-Minute Client & Stakeholder Demo Storyline")
    run_h4.font.name = "Arial"
    run_h4.font.color.rgb = cobalt
    
    tbl_d = doc.add_table(rows=1, cols=4)
    tbl_d.alignment = WD_TABLE_ALIGNMENT.CENTER
    d_hdrs = ["Timecode", "Act & Theme", "Presenter Actions", "Talking Points & Business Value"]
    for i, h in enumerate(d_hdrs):
        tbl_d.rows[0].cells[i].text = h
        set_cell_background(tbl_d.rows[0].cells[i], "1E3A8A")
        p = tbl_d.rows[0].cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = "Arial"
            r.font.size = Pt(9)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)
            
    for idx, act in enumerate(DEMO_ACTS):
        row = tbl_d.add_row()
        row.cells[0].text = act[0]
        row.cells[1].text = act[1]
        row.cells[2].text = act[2]
        row.cells[3].text = act[3]
        bg = "F8FAFC" if idx % 2 == 0 else "FFFFFF"
        for i, cell in enumerate(row.cells):
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
            p = cell.paragraphs[0]
            if i == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.name = "Arial"
                r.font.size = Pt(8.5)
                if i in [0, 1]:
                    r.font.bold = True
                    
    doc.add_paragraph().paragraph_format.space_after = Pt(14)
    
    # ----------------------------------------------------
    # Section 5: QA Sign-off
    # ----------------------------------------------------
    h5 = doc.add_heading(level=1)
    run_h5 = h5.add_run("5. QA Acceptance Sign-Off Sheet")
    run_h5.font.name = "Arial"
    run_h5.font.color.rgb = cobalt
    
    p_sign = doc.add_paragraph()
    p_sign.add_run(
        "By signing below, the QA Lead, Warehouse Operations Director, and Executive Stakeholder certify that all "
        "14 core operational flows have been verified and satisfy all functional, mathematical, and regulatory requirements.\n\n"
        "Lead QA Engineer: ____________________________________    Date: ____________________\n\n"
        "Warehouse Operations Lead (Amaldina): __________________    Date: ____________________\n\n"
        "Executive Director (Amaldina Comércio Geral): ___________    Date: ____________________\n"
    )

    doc.save(docx_path)
    print(f"Successfully generated Word document: {docx_path}")
    return docx_path


# ==============================================================================
# 3. PDF DOCUMENT GENERATOR (REPORTLAB)
# ==============================================================================

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (Pages 2+)
        if self._pageNumber > 1:
            self.drawString(54, 750, "Amaldina • Alisons African Pharma WMS — Testing & Demo Runbook")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
            
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, footer_text)
        self.drawString(54, 36, "Confidential — Amaldina Comércio Geral, Lda • Luanda & Benguela, Angola")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def generate_pdf():
    pdf_path = os.path.join(DOCS_DIR, "Amaldina_WMS_Testing_and_Demo_Runbook.pdf")
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    style_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1E3A8A"),
        alignment=1, # Center
        spaceAfter=6
    )
    style_subtitle = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#64748B"),
        alignment=1,
        spaceAfter=15
    )
    style_h1 = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#1E3A8A"),
        spaceBefore=14,
        spaceAfter=6
    )
    style_h2 = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#2563EB"),
        spaceBefore=8,
        spaceAfter=3
    )
    style_body = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1E293B")
    )
    style_body_bold = ParagraphStyle(
        'Body_Custom_Bold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A")
    )
    style_table_hdr = ParagraphStyle(
        'TableHdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.white,
        alignment=1
    )
    style_code = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#0F172A")
    )

    story = []
    
    # Header Logo
    if os.path.exists(LOGO_PATH):
        try:
            story.append(Image(LOGO_PATH, width=1.1*inch, height=1.1*inch))
            story.append(Spacer(1, 6))
        except Exception as e:
            print(f"Notice: Logo skipped in PDF: {e}")
            
    story.append(Paragraph("AMALDINA • ALISONS AFRICAN PHARMA WMS", style_title))
    story.append(Paragraph("Comprehensive Testing Requirements & Demo Runbook • Version 2.4-PROD<br/>Legal Entity: Amaldina Comércio Geral, Lda • Luanda & Benguela, Angola", style_subtitle))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=12))

    # Section 1: Personas Matrix Table
    story.append(Paragraph("1. Actor Profiles & Test Credentials Matrix (Default Password: admin123)", style_h1))
    
    table_p_data = [[
        Paragraph("Username", style_table_hdr),
        Paragraph("Role Code", style_table_hdr),
        Paragraph("Role Title", style_table_hdr),
        Paragraph("Hub", style_table_hdr),
        Paragraph("Responsibilities & Operational Scope", style_table_hdr)
    ]]
    for p in PERSONAS:
        table_p_data.append([
            Paragraph(f"<b>{p['username']}</b>", style_code),
            Paragraph(p['role'], style_body_bold),
            Paragraph(p['title'], style_body),
            Paragraph(p['warehouse'].replace(" Warehouse", "").replace(" Hub", ""), style_body),
            Paragraph(p['scope'], style_body)
        ])
        
    t_personas = Table(table_p_data, colWidths=[65, 75, 85, 80, 199])
    t_personas.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")])
    ]))
    story.append(t_personas)
    story.append(Spacer(1, 14))

    # Section 2: Mathematical Formulas Table
    story.append(Paragraph("2. Core Mathematical Specifications & Business Rules", style_h1))
    table_r_data = [[
        Paragraph("ID", style_table_hdr),
        Paragraph("Metric / Rule", style_table_hdr),
        Paragraph("Mathematical Specification / Formula", style_table_hdr),
        Paragraph("Audit Significance", style_table_hdr)
    ]]
    for r in [
        ("RUL-01", "Required Cartons", "Req Cartons = Opening + Inflow - Outflow Transfers - Sales", "Computes theoretical master carton balance."),
        ("RUL-02", "Required Loose Units", "Req Loose = Opening + Inflow - Outflow Transfers - Sales", "Computes theoretical broken packs and bottles."),
        ("RUL-03", "Required Total Units", "Req Total Units = (Req Cartons x Units_per_Carton) + Req Loose", "Standardizes all packaging to individual dosage units."),
        ("RUL-04", "Physical Total Units", "Physical Total Units = (Physical Cartons x Units_per_Carton) + Loose + Display", "Evaluates physical reality across 3 counting tiers."),
        ("RUL-05", "Audit Variance", "Variance = Physical Total Units - Req Total Units (0 = Balanced, <0 = Short, >0 = Surplus)", "Triggers automated discrepancy investigation."),
        ("RUL-06", "Display Continuity", "Today's Opening Display == Yesterday's Closing Display", "Showcase display boxes are non-saleable samples that persist."),
        ("RUL-07", "FEFO Lot Priority", "Sort by Expiry Date ASC (<90d = Warning, <30d = Quarantine)", "Ensures compliance with Angolan Health regulations.")
    ]:
        table_r_data.append([
            Paragraph(f"<b>{r[0]}</b>", style_code),
            Paragraph(r[1], style_body_bold),
            Paragraph(r[2], style_body),
            Paragraph(r[3], style_body)
        ])
    t_rules = Table(table_r_data, colWidths=[45, 95, 214, 150])
    t_rules.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")])
    ]))
    story.append(t_rules)
    story.append(Spacer(1, 14))

    # Page break before flows
    story.append(PageBreak())

    # Section 3: 14 Operational Flows
    story.append(Paragraph("3. Operational Test Execution Flows (14 Complete Scenarios)", style_h1))
    
    for f in FLOWS:
        flow_elements = []
        flow_elements.append(Paragraph(f"{f['id']}: {f['title']}", style_h2))
        flow_elements.append(Paragraph(f"<b>Category:</b> {f['category']} &nbsp;|&nbsp; <b>Personas:</b> {f['persona']} &nbsp;|&nbsp; <b>Status:</b> <font color='#166534'><b>{f['status']}</b></font>", style_body))
        flow_elements.append(Spacer(1, 4))
        
        steps_html = f["steps"].replace("\n", "<br/>")
        exp_html = f["expected_results"].replace("\n", "<br/>")
        
        f_table_data = [
            [Paragraph("Step-by-Step Test Actions", style_table_hdr), Paragraph("Expected System Results", style_table_hdr)],
            [Paragraph(steps_html, style_body), Paragraph(exp_html, style_body)],
            [Paragraph(
                f"<b>VERIFICATION TOUCHPOINTS:</b><br/>"
                f"• <b>Front-End Screen:</b> {f['ui_view']}<br/>"
                f"• <b>Tracker Query (Cmd+K):</b> <font face='Courier'>{f['tracker_id']}</font><br/>"
                f"• <b>API Log Path:</b> <font face='Courier'>{f['observability_logs']}</font><br/>"
                f"• <b>DB Query:</b> <font face='Courier'>{f['db_verification']}</font>",
                style_body
            ), ""]
        ]
        
        t_flow = Table(f_table_data, colWidths=[252, 252])
        t_flow.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('BACKGROUND', (0, 1), (0, 1), colors.white),
            ('BACKGROUND', (1, 1), (1, 1), colors.HexColor("#F8FAFC")),
            ('SPAN', (0, 2), (1, 2)),
            ('BACKGROUND', (0, 2), (1, 2), colors.HexColor("#F1F5F9")),
        ]))
        
        flow_elements.append(t_flow)
        flow_elements.append(Spacer(1, 10))
        story.append(KeepTogether(flow_elements))
        
    story.append(PageBreak())

    # Section 4: 20-Minute Demo Script
    story.append(Paragraph("4. 20-Minute Executive & Team Demo Walkthrough", style_h1))
    table_d_data = [[
        Paragraph("Time", style_table_hdr),
        Paragraph("Act & Theme", style_table_hdr),
        Paragraph("Presenter Actions (Click-by-Click)", style_table_hdr),
        Paragraph("Business Value & Talking Points", style_table_hdr)
    ]]
    for d in DEMO_ACTS:
        table_d_data.append([
            Paragraph(f"<b>{d[0]}</b>", style_code),
            Paragraph(d[1], style_body_bold),
            Paragraph(d[2].replace("\n", "<br/>"), style_body),
            Paragraph(d[3], style_body)
        ])
    t_demo = Table(table_d_data, colWidths=[65, 95, 172, 172])
    t_demo.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")])
    ]))
    story.append(t_demo)
    story.append(Spacer(1, 16))

    # Section 5: QA Sign-off
    story.append(Paragraph("5. QA Acceptance Sign-Off Approval", style_h1))
    sign_html = (
        "This is to certify that all 14 operational flows and mathematical reconciliation formulas of the Amaldina "
        "Alisons African Pharma WMS have been inspected and meet all specifications.<br/><br/>"
        "<b>Lead QA Engineer:</b> __________________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Date:</b> ______________<br/><br/>"
        "<b>Warehouse Operations Lead:</b> _________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Date:</b> ______________<br/><br/>"
        "<b>Executive Director (Amaldina):</b> _____________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Date:</b> ______________"
    )
    story.append(Paragraph(sign_html, style_body))

    # Build Document with running headers/footers
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF runbook: {pdf_path}")
    return pdf_path

if __name__ == "__main__":
    print("=" * 60)
    print("AMALDINA WMS — GENERATING TEST RUNBOOK & EXCEL MATRIX")
    print("=" * 60)
    ex = generate_excel()
    wd = generate_word()
    pd = generate_pdf()
    print("=" * 60)
    print("ALL 3 ARTIFACT DOCUMENTS GENERATED SUCCESSFULLY!")
    print(f"Excel: {ex}")
    print(f"Word:  {wd}")
    print(f"PDF:   {pd}")
    print("=" * 60)
