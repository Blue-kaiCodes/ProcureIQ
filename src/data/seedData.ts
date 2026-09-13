import { 
  Supplier, 
  InventoryItem, 
  PurchaseRequest, 
  AuditLog, 
  Notification, 
  RequestStatus, 
  RiskLevel, 
  SupplierStatus 
} from "../types";

export const initialSuppliers: Supplier[] = [
  {
    id: "SUP-001",
    name: "Tata Steel Ltd.",
    avgPricePerUnit: 350,
    deliveryPerformance: 98,
    avgLeadTimeDays: 3,
    qualityRating: 4.8,
    status: SupplierStatus.PREFERRED
  },
  {
    id: "SUP-002",
    name: "Jindal Steel & Power Ltd.",
    avgPricePerUnit: 315,
    deliveryPerformance: 91,
    avgLeadTimeDays: 6,
    qualityRating: 4.2,
    status: SupplierStatus.APPROVED
  }
];

export const initialInventory: InventoryItem[] = [
  {
    id: "INV-001",
    itemName: "Raw Material Steel Sheet (12mm)",
    quantityInStock: 482,
    warehouse: "Jaipur (North) Warehouse",
    monthlyConsumption: 380,
    unit: "sheets",
    reorderPoint: 200
  },
  {
    id: "INV-002",
    itemName: "Microprocessor Chip X1",
    quantityInStock: 35,
    warehouse: "Pune (West) Warehouse",
    monthlyConsumption: 120,
    unit: "units",
    reorderPoint: 100
  }
];

export const initialRequests: PurchaseRequest[] = [
  {
    id: "PR-2026-001",
    itemName: "Raw Material Steel Sheet (12mm)",
    quantity: 520,
    unitPrice: 315,
    currency: "₹",
    totalAmount: 163800,
    department: "Manufacturing",
    supplierId: "SUP-002",
    status: RequestStatus.UNDER_REVIEW,
    riskLevel: RiskLevel.LOW,
    healthScore: 92,
    createdAt: "2026-07-12T10:00:00Z",
    requestedBy: "Anil Sharma",
    description: "Standard industrial steel sheet procurement for bracket assembly",
    priority: "medium",
    expectedDeliveryDate: "2026-07-20",
    aiRecommendation: {
      reason: "Alternative vendor assessment complete",
      estimatedSavings: 18200,
      confidence: 95,
      businessImpact: "Optimizes supply run and utilizes existing volume discounts under Master Agreement.",
      suggestedAction: "Source from approved vendor Jindal Steel & Power.",
      explanation: "Jindal Steel & Power offers compliant grade steel matching standard quality checks with shorter lead time buffer."
    },
    financialImpact: {
      annualSavings: 72800,
      cashFlowImpact: "Retains high liquidity, utilizing current departmental budget allocations.",
      storageCostChange: 5200,
      deliveryRiskMetric: "91% verified delivery performance record."
    },
    timeline: [
      {
        id: "TM-001",
        date: "2026-07-12T10:00:00Z",
        user: "Anil Sharma",
        action: "Purchase request created",
        status: "draft",
        details: "Requisition drafted for manufacturing queue."
      },
      {
        id: "TM-002",
        date: "2026-07-12T10:15:00Z",
        user: "Anil Sharma",
        action: "Purchase request submitted",
        status: "submitted",
        details: "Forwarded for executive validation."
      }
    ],
    comments: [],
    changeHistory: [],
    attachments: []
  },
  {
    id: "PR-2026-002",
    itemName: "Microprocessor Chip X1",
    quantity: 120,
    unitPrice: 350,
    currency: "₹",
    totalAmount: 42000,
    department: "Maintenance",
    supplierId: "SUP-001",
    status: RequestStatus.SUBMITTED,
    riskLevel: RiskLevel.LOW,
    healthScore: 98,
    createdAt: "2026-07-13T08:15:00Z",
    requestedBy: "Sarah Jenkins",
    description: "Factory logistics controller upgrade chips",
    priority: "high",
    expectedDeliveryDate: "2026-07-18",
    aiRecommendation: {
      reason: "Preferred supplier replenishment validation",
      estimatedSavings: 0,
      confidence: 99,
      businessImpact: "Ensures no factory robotic queue blockages with premium hardware uptime.",
      suggestedAction: "Approve order immediately. Supplier holds exceptional rating.",
      explanation: "Current inventory (35 chips) is below critical reorder threshold (100 chips)."
    },
    financialImpact: {
      annualSavings: 0,
      cashFlowImpact: "Standard maintenance budget utilization.",
      storageCostChange: 0,
      deliveryRiskMetric: "Negligible risk. Tata Steel has a 98% delivery performance."
    },
    timeline: [
      {
        id: "TM-003",
        date: "2026-07-13T08:15:00Z",
        user: "Sarah Jenkins",
        action: "Purchase request created",
        status: "draft",
        details: "Requisition generated for robotics batch."
      }
    ],
    comments: [],
    changeHistory: [],
    attachments: []
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: "AUD-001",
    timestamp: "2026-07-12T10:15:00Z",
    user: "Anil Sharma",
    role: "Buyer",
    action: "Raise Requisition",
    details: "Created and submitted PR-2026-001 for manufacturing raw materials.",
    ip: "127.0.0.1"
  },
  {
    id: "AUD-002",
    timestamp: "2026-07-13T08:15:00Z",
    user: "Sarah Jenkins",
    role: "Procurement Officer",
    action: "Raise Requisition",
    details: "Created and submitted PR-2026-002 for critical controller chips.",
    ip: "127.0.0.1"
  }
];

export const initialNotifications: Notification[] = [
  {
    id: "NT-001",
    title: "Requisition Awaiting Review",
    message: "PR-2026-001 submitted by Anil Sharma is awaiting department head approval.",
    timestamp: "2026-07-12T10:15:00Z",
    read: false,
    type: "info",
    relatedRequestId: "PR-2026-001"
  },
  {
    id: "NT-002",
    title: "Inventory Level Notice",
    message: "Microprocessor Chip X1 has dropped below safety stock line (35 available, limit 100).",
    timestamp: "2026-07-13T04:15:00Z",
    read: false,
    type: "warning"
  }
];

export const initialMonthlySpendData = [
  { month: "May", "Total Spend": 220000 },
  { month: "Jun", "Total Spend": 260000 },
  { month: "Jul", "Total Spend": 205800 }
];
