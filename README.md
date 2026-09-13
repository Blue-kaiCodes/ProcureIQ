# ProcureIQ 🛡️

**Autonomous Pre-Approval Procurement Review & AI Spend Guardian**

ProcureIQ is an AI-powered enterprise procurement module designed to stop unnecessary corporate spending *before* purchase orders are approved. It evaluates purchase requisitions against active warehouse stock, vendor performance, price benchmarks, and financial metrics—integrating seamlessly into modern ERP workflows like **Odoo**.

![License](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Web-blue)
![Built With](https://img.shields.io/badge/Built%20With-React%2019%20%7C%20TypeScript%20%7C%20PostgreSQL%20%7C%20Gemini%20AI-orange)
![Database](https://img.shields.io/badge/Database-Drizzle%20ORM%20%7C%20PostgreSQL-336791)

---

## 🌟 Key Capabilities

### 🔍 Pre-Approval Audit Workbench
- **Automated AI Requisition Audit**: Every purchase request is scored for risk, health, and compliance using **Google Gemini 3.5 Flash**.
- **Cross-Warehouse Stock Overlap Checks**: Detects if requested items already exist in other company warehouses before placing redundant orders.
- **Price Benchmarking & 1-Click Vendor Alignment**: Compares requested quotes against preferred supplier catalogs. Switch to approved lower-cost vendors with a single click to capture immediate savings.
- **Financial Impact Forecasting**: Analyzes working capital, cash flow impact, annual cost savings, and supplier delivery risk metrics.

### 🤖 AI Procurement Copilot
- Conversational procurement assistant running on **Gemini 3.5 Flash**.
- Ingests live ERP state (suppliers, inventory buffers, and active requisitions) to answer natural language queries (e.g., *"Why is PR-2026-001 flagged as high risk?"* or *"Forecast next month's steel demand"*).
- Built-in heuristic fallback engine ensuring uninterrupted operation even when offline or unconfigured.

### 🏢 Multi-Tenant Workspace & Role-Based Access Control (RBAC)
- Support for multi-company isolation (`DEMO-COMP` workspace included).
- 6 granular enterprise roles:
  - **Superuser (Admin)**: System configuration, team member invites, and data sync.
  - **Procurement Officer**: High-value requisition review and vendor alignment.
  - **Department Head**: Departmental request approvals and budget sign-offs.
  - **Finance Manager**: Cash flow analysis and payment validations.
  - **Warehouse Manager**: Real-time stock level adjustments and receiving confirmation.
  - **Buyer**: Request drafting, quotation submission, and tracking.

### 📋 Full Requisition Lifecycle & Collaboration
- **8 Workflow Stages**: `Draft` ➔ `Submitted` ➔ `Under Review` ➔ `Needs Revision` ➔ `Approved` ➔ `Rejected` ➔ `PO Created` ➔ `Completed`.
- **Chronological Audit Timelines**: Complete tracking of every approval, modification, and status change.
- **Threaded Collaboration**: Team discussions and contextual review comments per requisition.
- **Document Manager**: Upload and preview quotations, invoices, technical specs, and contracts.
- **Spotlight Search**: Global command palette (`Ctrl+K` / `Cmd+K`) across requisitions, inventory, and suppliers.

---

## 🛠️ Tech Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React, Recharts, Framer Motion |
| **Backend** | Node.js, Express, TypeScript (`tsx`), REST API |
| **Database & ORM** | PostgreSQL, Drizzle ORM, Drizzle Kit |
| **Local Zero-Config DB** | `pg-mem` in-memory PostgreSQL engine (automatic fallback for local development without Cloud SQL setup) |
| **Artificial Intelligence** | Google Gemini API (`@google/genai`, `gemini-3.5-flash`) with structured JSON schema outputs & rule-based heuristic fallbacks |

---

## 📁 Project Structure

```text
ProcureIQ/
├── drizzle/                    # PostgreSQL DDL migrations & snapshots
│   └── 0000_dapper_master_chief.sql
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── ActivityTimeline.tsx       # Audit history & lifecycle timeline
│   │   ├── CollaborationComments.tsx  # Threaded discussions & review notes
│   │   ├── DocumentAttachments.tsx    # Upload & view quotes, specs, contracts
│   │   ├── GlobalSearchOverlay.tsx    # Command palette search (Ctrl+K)
│   │   └── WorkflowStatusBadge.tsx    # Requisition state badges
│   ├── data/
│   │   └── seedData.ts         # Realistic ERP demo data (suppliers, items, PRs)
│   ├── db/
│   │   ├── schema.ts           # 12 Drizzle tables & relational definitions
│   │   ├── index.ts            # Dual connection pool (PostgreSQL / pg-mem fallback)
│   │   ├── seed.ts             # Workspace & user database seeder
│   │   └── drizzle.config.ts   # Drizzle migration config
│   ├── lib/
│   │   └── api.ts              # API fetch client & demo RBAC headers
│   ├── types.ts                # TypeScript interfaces, enums, & models
│   ├── App.tsx                 # Main application (Dashboard, Workbench, Registry, etc.)
│   ├── index.css               # Tailwind CSS v4 styles & custom utilities
│   └── main.tsx                # Client entry point
├── server.ts                   # Express server, Gemini AI integration, Vite dev middleware
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite bundle & plugin configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm**

### 1. Clone Repository
```bash
git clone https://github.com/Blue-kaiCodes/ProcureIQ.git
cd ProcureIQ
```

### 2. Install Dependencies
```bash
npm install
```
*(On Windows PowerShell, if scripts are restricted, run `npm.cmd install`)*

### 3. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your **Gemini API key** to enable real-time generative audits:
```env
GEMINI_API_KEY="your_api_key_here"
```
> **Note**: If `GEMINI_API_KEY` is not provided, ProcureIQ automatically switches to its built-in heuristic evaluation rules so you can test all features offline.
> 
> **Database**: For local runs, an automatic in-memory PostgreSQL engine is built-in (`pg-mem`). To connect a live PostgreSQL database instead, configure `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, and `SQL_DB_NAME` in `.env`.

### 4. Run Development Server
```bash
npm run dev
```
*(On Windows: `npm.cmd run dev`)*

The server and frontend will launch together at:
👉 **`http://localhost:3000`**

---

## 📦 Production Build

To compile both client and server bundles:
```bash
npm run build
```
To run the production build:
```bash
npm start
```

---

## 🗺️ Roadmap

- [x] Core Procurement KPI Dashboard
- [x] Purchase Requisition Registry & Filter System
- [x] AI Pre-Approval Audit Workbench
- [x] 1-Click Alternate Vendor Alignment & Price Savings
- [x] Multi-Warehouse Inventory Status & Reorder Thresholds
- [x] Supplier Scorecards (Lead Time, Delivery %, Quality Rating)
- [x] Conversational AI Copilot (`gemini-3.5-flash`)
- [x] Multi-Tenant Company Workspace Architecture
- [x] Role-Based Access Control (Admin, Officer, Head, Manager, Warehouse, Buyer)
- [x] In-memory PostgreSQL fallback for instant zero-config onboarding
- [x] Activity Audit Timelines, Threaded Comments & Document Attachments
- [x] Live Bi-directional Odoo ERP XML-RPC Connector
- [x] Automated Purchase Order PDF Generation & Email Dispatch
- [ ] Multimodal OCR Invoice & Receipt Line-Item Extraction
- [ ] Supplier Self-Service RFQ & Quotation Portal

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open a pull request or submit an issue.

---

## 👤 Author

**Aditya Bhaskar**
- GitHub: [@Blue-kaiCodes](https://github.com/Blue-kaiCodes)

---

## 📄 License

This project is licensed under the MIT License — open for educational, learning, and commercial evaluation purposes.
