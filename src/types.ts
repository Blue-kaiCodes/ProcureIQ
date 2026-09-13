export enum RequestStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  NEEDS_REVISION = "needs_revision",
  APPROVED = "approved",
  REJECTED = "rejected",
  PO_CREATED = "po_created",
  COMPLETED = "completed",
  PENDING = "pending", // fallback
  FLAGGED = "flagged"  // fallback
}

export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

export enum SupplierStatus {
  PREFERRED = "preferred",
  APPROVED = "approved",
  RESTRICTED = "restricted"
}

export interface Supplier {
  id: string;
  name: string;
  avgPricePerUnit: number;
  deliveryPerformance: number; // percentage (0-100)
  avgLeadTimeDays: number;
  qualityRating: number; // 0-5
  status: SupplierStatus;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  quantityInStock: number;
  warehouse: string;
  monthlyConsumption: number;
  unit: string;
  reorderPoint: number;
}

export interface AIRecommendation {
  reason: string;
  estimatedSavings: number;
  confidence: number; // percentage
  businessImpact: string;
  suggestedAction: string;
  explanation: string;
}

export interface FinancialImpact {
  annualSavings: number;
  cashFlowImpact: string;
  storageCostChange: number;
  deliveryRiskMetric: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  user: string;
  action: string;
  status: string;
  details: string;
}

export interface Comment {
  id: string;
  author: string;
  role: string;
  text: string;
  timestamp: string;
  parentId?: string;
}

export interface ChangeHistoryEntry {
  id: string;
  timestamp: string;
  user: string;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: "quotation" | "invoice" | "specification" | "contract" | "other";
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "warning" | "success" | "alert";
  relatedRequestId?: string;
}

export interface PurchaseRequest {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  totalAmount: number;
  department: string;
  supplierId: string;
  status: RequestStatus;
  riskLevel: RiskLevel;
  healthScore: number;
  createdAt: string;
  requestedBy: string;
  description: string;
  aiRecommendation?: AIRecommendation;
  financialImpact?: FinancialImpact;
  timeline?: TimelineEvent[];
  comments?: Comment[];
  changeHistory?: ChangeHistoryEntry[];
  attachments?: Attachment[];
  priority?: "low" | "medium" | "high" | "urgent";
  expectedDeliveryDate?: string;
  purchasingInstructions?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
  ip: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}
