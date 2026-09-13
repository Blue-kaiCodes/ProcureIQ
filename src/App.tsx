import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  History,
  Plus,
  Search,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  Award,
  X,
  FileText,
  User,
  Building,
  Database,
  ChevronRight,
  Moon,
  Sun,
  AlertCircle,
  HelpCircle,
  Check,
  Settings,
  Sliders,
  Calendar,
  Clock,
  ChevronDown,
  FileSpreadsheet,
  ArrowUpDown,
  CheckSquare,
  Bell,
  Scale,
  MessageSquare,
  Paperclip,
  Printer,
  Download,
  Users,
  Edit2,
  Truck,
  Trash2,
  UserPlus,
  Mail,
  Lock
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend
} from "recharts";
import {
  RequestStatus,
  RiskLevel,
  SupplierStatus,
  Supplier,
  InventoryItem,
  PurchaseRequest,
  AuditLog,
  Notification
} from "./types";

// Import custom subcomponents
import WorkflowStatusBadge from "./components/WorkflowStatusBadge";
import ActivityTimeline from "./components/ActivityTimeline";
import CollaborationComments from "./components/CollaborationComments";
import DocumentAttachments from "./components/DocumentAttachments";
import GlobalSearchOverlay from "./components/GlobalSearchOverlay";
import { customFetch as fetch } from "./lib/api";

export default function App() {
  // Local Demo States instead of Firebase Auth
  const [selectedRole, setSelectedRole] = useState<string>(() => {
    return localStorage.getItem("demo_selected_role") || "admin";
  });
  const [dbUser, setDbUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(false);

  // Map roles to their pre-seeded database users
  const getDemoUserForRole = (role: string) => {
    switch (role) {
      case "buyer":
        return {
          id: "buyer-uid",
          email: "buyer@company.com",
          name: "Anil Sharma",
          role: "buyer",
          department: "Purchasing",
          companyId: "DEMO-COMP",
        };
      case "officer":
        return {
          id: "officer-uid",
          email: "officer@company.com",
          name: "Sarah Jenkins",
          role: "officer",
          department: "Procurement",
          companyId: "DEMO-COMP",
        };
      case "head":
        return {
          id: "head-uid",
          email: "head@company.com",
          name: "Ravi Kumar",
          role: "head",
          department: "Manufacturing",
          companyId: "DEMO-COMP",
        };
      case "manager":
        return {
          id: "manager-uid",
          email: "manager@company.com",
          name: "Meera Nair",
          role: "manager",
          department: "Finance",
          companyId: "DEMO-COMP",
        };
      case "warehouse":
        return {
          id: "warehouse-uid",
          email: "warehouse@company.com",
          name: "Vijay Singh",
          role: "warehouse",
          department: "Warehouse Operations",
          companyId: "DEMO-COMP",
        };
      case "admin":
      default:
        return {
          id: "admin-uid",
          email: "admin@company.com",
          name: "Superuser (Admin)",
          role: "admin",
          department: "IT Operations",
          companyId: "DEMO-COMP",
        };
    }
  };

  const getDemoCompany = () => ({
    id: "DEMO-COMP",
    name: "ProcureIQ Enterprise Ltd.",
    email: "enterprise@procureiq.com",
    industry: "Manufacturing & Heavy Industries",
    country: "India",
    timezone: "Asia/Kolkata",
    size: "500-1000",
    businessId: "GST-IN-DEMO-2026",
    logo: "",
  });

  // Sync user and company when role changes
  useEffect(() => {
    localStorage.setItem("demo_selected_role", selectedRole);
    setDbUser(getDemoUserForRole(selectedRole));
    setCompany(getDemoCompany());
  }, [selectedRole]);

  const refreshAuth = async () => {
    // No-op for standalone demo
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState<"dashboard" | "requisitions" | "review" | "suppliers" | "inventory" | "reports" | "settings">("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Dark mode state and persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("darkMode", isDarkMode.toString());
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Core Data State
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "buyer": return "Authorized Buyer";
      case "head": return "Manufacturing Division Head";
      case "manager": return "Finance Director";
      case "warehouse": return "Warehouse Operations Manager";
      case "admin": return "ERP Systems Administrator";
      case "officer":
      default:
        return "Procurement Officer";
    }
  };

  const getActiveUserInfo = () => {
    if (dbUser) {
      return { 
        name: dbUser.name, 
        roleLabel: getRoleLabel(selectedRole), 
        dept: dbUser.department || "Operations" 
      };
    }
    switch (selectedRole) {
      case "buyer":
        return { name: "Anil Sharma", roleLabel: "Authorized Buyer", dept: "Manufacturing" };
      case "head":
        return { name: "Ravi Kumar", roleLabel: "Manufacturing Division Head", dept: "Manufacturing" };
      case "manager":
        return { name: "Meera Nair", roleLabel: "Finance Director", dept: "Finance" };
      case "warehouse":
        return { name: "Vijay Singh", roleLabel: "Warehouse Operations Manager", dept: "Warehouse Operations" };
      case "admin":
        return { name: "Superuser (Admin)", roleLabel: "ERP Systems Administrator", dept: "IT Operations" };
      case "officer":
      default:
        return { name: "Sarah Jenkins", roleLabel: "Procurement Officer", dept: "Global Purchasing" };
    }
  };

  const activeUserInfo = getActiveUserInfo();

  // Enterprise Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  
  // Advanced filters panel toggle and values
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterMinAmount, setFilterMinAmount] = useState<number | "">("");
  const [filterMaxAmount, setFilterMaxAmount] = useState<number | "">("");
  const [filterWarehouse, setFilterWarehouse] = useState("all");

  // Requisitions Sorting State
  const [requisitionSortKey, setRequisitionSortKey] = useState<"id" | "itemName" | "totalAmount" | "createdAt" | "status" | "riskLevel">("id");
  const [requisitionSortOrder, setRequisitionSortOrder] = useState<"asc" | "desc">("desc");

  // Supplier & Inventory Specific Filters/Sort
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("SUP-001");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryWarehouse, setInventoryWarehouse] = useState("all");
  const [inventorySortKey, setInventorySortKey] = useState<"id" | "itemName" | "quantityInStock" | "warehouse">("id");
  const [inventorySortOrder, setInventorySortOrder] = useState<"asc" | "desc">("asc");

  // Odoo Enterprise Enhanced Table Grid States
  const [requisitionViewMode, setRequisitionViewMode] = useState<"split" | "list">("split");
  const [selectedRequisitionIds, setSelectedRequisitionIds] = useState<string[]>([]);
  const [requisitionPage, setRequisitionPage] = useState(1);
  const [requisitionPageSize, setRequisitionPageSize] = useState(10);
  const [hiddenRequisitionColumns, setHiddenRequisitionColumns] = useState<string[]>([]);

  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryPageSize, setInventoryPageSize] = useState(10);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>([]);
  const [hiddenInventoryColumns, setHiddenInventoryColumns] = useState<string[]>([]);
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
  const [adjustQtyInput, setAdjustQtyInput] = useState<number>(0);

  // Requisition Creation Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    itemName: "Raw Material Steel Sheet (12mm)",
    quantity: 600,
    unitPrice: 350,
    department: "Manufacturing",
    supplierId: "SUP-001",
    requestedBy: "Anil Sharma",
    description: "Production stock replenishment based on incoming assembly schedules"
  });

  // Interactive Approval Transition Dialog State
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<"approve" | "reject" | "flag" | "needs_revision" | "po_created" | "completed">("approve");
  const [explanationText, setExplanationText] = useState("");
  const [workflowPriority, setWorkflowPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [workflowDeliveryDate, setWorkflowDeliveryDate] = useState("");
  const [workflowInstructions, setWorkflowInstructions] = useState("");

  // Live Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Module Configuration Settings Mock
  const [settings, setSettings] = useState({
    companyName: "Apex Manufacturing Pvt. Ltd.",
    currency: "INR (₹)",
    safetyStockThreshold: 15,
    autoFlagHighRisk: true,
    requireExplanationAbove: 100000,
    approvalLevels: "Dual Controller"
  });

  // Multi-Tenant Enterprise Team Management State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("officer");
  const [inviteDept, setInviteDept] = useState("Procurement");
  const [invitePermission, setInvitePermission] = useState("Standard");
  const [invitePassword, setInvitePassword] = useState("ProcureIQ2026!");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("buyer");
  const [editDept, setEditDept] = useState("Purchasing");

  const fetchTeamData = async () => {
    try {
      setIsTeamLoading(true);
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
        setPendingInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error("Error loading team members:", err);
    } finally {
      setIsTeamLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "settings" && dbUser) {
      fetchTeamData();
    }
  }, [activeTab, dbUser]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !inviteDept || !inviteRole || !invitePermission || !invitePassword) {
      showNotification("Please fill in all employee invitation fields.", "error");
      return;
    }
    try {
      setIsSendingInvite(true);
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          department: inviteDept,
          role: inviteRole,
          permissionLevel: invitePermission,
          password: invitePassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Employee ${inviteName} invited successfully with a real Firebase Authentication account.`, "success");
        setInviteName("");
        setInviteEmail("");
        setInviteDept("Procurement");
        setInviteRole("officer");
        setInvitePermission("Standard");
        setInvitePassword("ProcureIQ2026!");
        fetchTeamData();
      } else {
        showNotification(data.error || "Failed to dispatch invitation.", "error");
      }
    } catch (err) {
      showNotification("Error sending invitation.", "error");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleToggleMemberStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/team/members/${id}/toggle-status`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || "Account status toggled successfully.", "success");
        fetchTeamData();
      } else {
        showNotification(data.error || "Failed to toggle account status.", "error");
      }
    } catch (err) {
      showNotification("Error updating account status.", "error");
    }
  };

  const handleUpdateMemberRole = async (id: string) => {
    try {
      const res = await fetch(`/api/team/members/${id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          department: editDept
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Member settings updated successfully.", "success");
        setEditingUserId(null);
        fetchTeamData();
      } else {
        showNotification(data.error || "Failed to update member role.", "error");
      }
    } catch (err) {
      showNotification("Error updating member role.", "error");
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to permanently remove this user from the workspace? All seat allocations will be terminated.")) {
      return;
    }
    try {
      const res = await fetch(`/api/team/members/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Member removed successfully from this workspace.", "success");
        fetchTeamData();
      } else {
        showNotification(data.error || "Failed to remove member.", "error");
      }
    } catch (err) {
      showNotification("Error deleting workspace member.", "error");
    }
  };

  // Load baseline Odoo data
  const fetchData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetch("/api/data");
      const data = await res.json();
      setRequests(data.requests || []);
      setSuppliers(data.suppliers || []);
      setInventory(data.inventory || []);
      setAuditLogs(data.auditLogs || []);
      if (data.notifications) {
        setNotifications(data.notifications);
      }
      
      if (data.requests && data.requests.length > 0) {
        setSelectedRequest(prev => {
          if (prev) {
            return data.requests.find((r: PurchaseRequest) => r.id === prev.id) || data.requests[0];
          }
          return data.requests[0];
        });
      }
    } catch (error) {
      if (!silent) showNotification("Failed to connect to ERP datastore.", "error");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Synchronize configuration settings and fetch data once user is authenticated
  useEffect(() => {
    if (dbUser) {
      console.log(`[AUTH-DEBUG] Session restored or updated: ${dbUser.email}. Triggering workspace data load.`);
      if (company) {
        setSettings(prev => ({ ...prev, companyName: company.name }));
      }
      fetchData(false);
    } else {
      setRequests([]);
      setSuppliers([]);
      setInventory([]);
      setAuditLogs([]);
    }
  }, [dbUser, company]);

  // Periodic background updates only when authenticated
  useEffect(() => {
    if (!dbUser) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [dbUser]);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setSelectedRole("admin");
      showNotification("Enterprise session safely reset to Administrator role.", "success");
    } catch (err) {
      showNotification("Failed to reset session.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard navigation through list queues
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearchOverlayOpen(false);
        setIsNotificationsOpen(false);
        setIsFilterPanelOpen(false);
        return;
      }

      if (document.activeElement?.tagName === "INPUT" || 
          document.activeElement?.tagName === "TEXTAREA" || 
          document.activeElement?.tagName === "SELECT") {
        return;
      }
      
      const isReviewable = activeTab === "review" || activeTab === "requisitions";
      if (isReviewable && sortedAndFilteredRequests.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const currentIndex = sortedAndFilteredRequests.findIndex(r => r.id === selectedRequest?.id);
          if (currentIndex < sortedAndFilteredRequests.length - 1) {
            setSelectedRequest(sortedAndFilteredRequests[currentIndex + 1]);
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const currentIndex = sortedAndFilteredRequests.findIndex(r => r.id === selectedRequest?.id);
          if (currentIndex > 0) {
            setSelectedRequest(sortedAndFilteredRequests[currentIndex - 1]);
          }
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, requests, selectedRequest, suppliers, searchTerm, filterStatus, filterDepartment, filterRisk]);

  const showNotification = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Submit new raw purchase request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.itemName || !newRequest.description.trim()) {
      showNotification("Validation Error: Please fill in all fields before submitting.", "error");
      return;
    }
    if (newRequest.quantity <= 0) {
      showNotification("Validation Error: Requisition quantity must be greater than 0.", "error");
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRequest,
          requestedBy: activeUserInfo.name
        })
      });
      const data = await response.json();
      if (data.success) {
        showNotification(`Requisition ${data.request.id} submitted for verification.`);
        setIsFormOpen(false);
        await fetchData();
        setSelectedRequest(data.request);
        setActiveTab("review");
      } else {
        showNotification(data.error || "Failed to process requisition.", "error");
      }
    } catch (error) {
      showNotification("Error writing transaction to ERP database.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger the Workflow transition dialog
  const triggerWorkflowDialog = (type: typeof approvalType) => {
    if (!selectedRequest) return;
    setApprovalType(type);
    
    // Auto-prefill executive justification text based on decision type and metadata
    let defaultExplanation = "";
    const isSteel = selectedRequest.itemName.toLowerCase().includes("steel");
    const isFluid = selectedRequest.itemName.toLowerCase().includes("fluid");

    if (type === "approve") {
      if (selectedRequest.riskLevel === RiskLevel.LOW) {
        defaultExplanation = `Approved. Requisition of ${selectedRequest.itemName} complies with division safety stocks. Cost-savings are within optimized margins.`;
      } else {
        defaultExplanation = `Approved via Controller Override. Critical production schedules require immediate replenishment regardless of vendor restricted flag or stock variance.`;
      }
    } else if (type === "needs_revision") {
      if (isSteel) {
        defaultExplanation = `Needs Revision. Current Jaipur Warehouse steel sheets reserves (482 sheets) are sufficient for 38 production days. Reduce order qty to 300 to prevent capital lockup.`;
      } else if (isFluid) {
        defaultExplanation = `Needs Revision. Warehouse contains 850 liters of active fluid. 2,000 liters exceed production schedules. Recommend reducing to 800 liters.`;
      } else {
        defaultExplanation = `Needs Revision. Re-evaluate unit pricing against existing master vendor contracts. Alternates indicate optimization potential.`;
      }
    } else if (type === "reject") {
      if (isSteel) {
        defaultExplanation = `Rejected. Steel reserves are 482 sheets against safety limit of 200. Restructuring sourcing from restricted SKF Bearings & Metals (74% compliance) is denied.`;
      } else {
        defaultExplanation = `Rejected. Quantity is disproportionate to division monthly usage. Alternate suppliers offer identical parts at preferred rates.`;
      }
    } else if (type === "po_created") {
      defaultExplanation = `Purchase Order Generated. Requisition approved, verified, and transmitted to the primary vendor integration portal.`;
    } else if (type === "completed") {
      defaultExplanation = `Requisition Marked Complete. Items successfully arrived, inspected, and logged in central warehouse.`;
    }

    setExplanationText(defaultExplanation);
    setWorkflowPriority(selectedRequest.priority || "medium");
    setWorkflowDeliveryDate(selectedRequest.expectedDeliveryDate || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setWorkflowInstructions(selectedRequest.purchasingInstructions || "Incorporate Standard Freight terms.");
    setIsApprovalDialogOpen(true);
  };

  // Commit dynamic state transition back to the backend
  const commitWorkflowState = async () => {
    if (!selectedRequest) return;
    try {
      setIsLoading(true);
      
      // Map basic 'flag' actions to 'needs_revision' or other statuses
      let finalStatus = RequestStatus.UNDER_REVIEW;
      if (approvalType === "approve") finalStatus = RequestStatus.APPROVED;
      else if (approvalType === "reject") finalStatus = RequestStatus.REJECTED;
      else if (approvalType === "needs_revision") finalStatus = RequestStatus.NEEDS_REVISION;
      else if (approvalType === "po_created") finalStatus = RequestStatus.PO_CREATED;
      else if (approvalType === "completed") finalStatus = RequestStatus.COMPLETED;

      const response = await fetch(`/api/requests/${selectedRequest.id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: finalStatus,
          username: activeUserInfo.name,
          role: activeUserInfo.roleLabel,
          priority: workflowPriority,
          expectedDeliveryDate: workflowDeliveryDate,
          purchasingInstructions: workflowInstructions,
          notes: explanationText,
          rejectionReason: approvalType === "reject" ? explanationText : undefined,
          revisionComments: approvalType === "needs_revision" ? explanationText : undefined
        })
      });
      const data = await response.json();
      if (data.success) {
        // Log notification
        const newNotif: Notification = {
          id: `NT-${Date.now()}`,
          title: `Requisition ${selectedRequest.id} Updated`,
          message: `State updated to ${finalStatus.toUpperCase()} by ${activeUserInfo.name}.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: "success",
          relatedRequestId: selectedRequest.id
        };
        setNotifications([newNotif, ...notifications]);

        showNotification(`Request ${selectedRequest.id} moved to ${finalStatus.toUpperCase()}.`);
        setIsApprovalDialogOpen(false);
        await fetchData();
      } else {
        showNotification(data.error || "Failed to update workflow state.", "error");
      }
    } catch (error) {
      showNotification("Communication issue updating Odoo database.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Apply ProcureIQ optimized changes immediately to server
  const handleApplyVendorAlignment = async () => {
    if (!selectedRequest) return;
    try {
      setIsLoading(true);
      const response = await fetch(`/api/requests/${selectedRequest.id}/apply-recommendation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: activeUserInfo.name,
          role: activeUserInfo.roleLabel
        })
      });
      const data = await response.json();
      if (data.success) {
        showNotification("Requisition aligned with alternative supplier pricing successfully.");
        await fetchData();
      } else {
        showNotification(data.error || "Failed to apply recommended action.", "error");
      }
    } catch (err) {
      showNotification("Failed to connect to ERP server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Document attachments refresh
  const handleAttachmentRefresh = async () => {
    await fetchData();
    showNotification("Attachments registry updated.");
  };

  // Discussion comments refresh
  const handleCommentsRefresh = async () => {
    await fetchData();
    showNotification("Internal discussion feed updated.");
  };

  // Enterprise Exports functionality
  const handleExport = (format: "csv" | "print") => {
    if (format === "csv") {
      const headers = ["ID", "Item Name", "Quantity", "Unit Price", "Total Amount", "Department", "Status", "Risk Level", "Requested By", "Date"];
      const rows = requests.map(r => [
        r.id,
        `"${r.itemName}"`,
        r.quantity,
        r.unitPrice,
        r.totalAmount,
        r.department,
        r.status,
        r.riskLevel,
        r.requestedBy,
        new Date(r.createdAt).toLocaleDateString()
      ]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Odoo_ProcureIQ_Requisitions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification("Requisition pipeline exported in CSV format.");
    } else {
      window.print();
    }
  };

  // Operational metrics calculations
  const totalSpendPipeline = requests.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalCostReductions = requests.reduce((sum, r) => sum + (r.aiRecommendation?.estimatedSavings || 0), 0);
  const pendingCount = requests.filter(r => r.status === RequestStatus.SUBMITTED || r.status === RequestStatus.PENDING).length;
  const flaggedCount = requests.filter(r => r.status === RequestStatus.UNDER_REVIEW).length;
  const lowStockCount = inventory.filter(i => i.quantityInStock <= i.reorderPoint).length;
  const restrictedSuppliersCount = suppliers.filter(s => s.status === SupplierStatus.RESTRICTED).length;

  // Registry interactive filtering
  const sortedAndFilteredRequests = [...requests]
    .filter(r => {
      // 1. Term matches
      const matchesSearch = r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Dropdown matches
      const matchesDept = filterDepartment === "all" || r.department === filterDepartment;
      const matchesRisk = filterRisk === "all" || r.riskLevel === filterRisk;
      const matchesStatus = filterStatus === "all" || r.status === filterStatus;
      const matchesPriority = filterPriority === "all" || r.priority === filterPriority;
      
      // 3. Price boundaries
      const matchesMinAmt = filterMinAmount === "" || r.totalAmount >= Number(filterMinAmount);
      const matchesMaxAmt = filterMaxAmount === "" || r.totalAmount <= Number(filterMaxAmount);

      return matchesSearch && matchesDept && matchesRisk && matchesStatus && matchesPriority && matchesMinAmt && matchesMaxAmt;
    })
    .sort((a, b) => {
      let valA = a[requisitionSortKey];
      let valB = b[requisitionSortKey];
      
      if (requisitionSortKey === "createdAt") {
        return requisitionSortOrder === "asc"
          ? new Date(valA as string).getTime() - new Date(valB as string).getTime()
          : new Date(valB as string).getTime() - new Date(valA as string).getTime();
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return requisitionSortOrder === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return requisitionSortOrder === "asc" 
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

  // Supplier profile matching
  const getSupplierProducts = (id: string) => {
    switch (id) {
      case "SUP-001": return ["Steel Sheets", "Industrial Plates", "Structural Alloys"];
      case "SUP-002": return ["Structural Steel", "Reinforcement Bars", "Pipes & Tubes"];
      case "SUP-003": return ["Ball Bearings", "Precision Alloys", "Roller Assemblies"];
      case "SUP-004": return ["Hydraulic Actuators", "Electronics", "Sensors", "Power Control"];
      case "SUP-005": return ["Switchgears", "Copper Busbars", "Terminal blocks", "Wiring Accessories"];
      case "SUP-006": return ["Rubber Seals", "Neoprene Rings", "Custom Gaskets", "O-Rings"];
      default: return ["Industrial Supplies", "General Consumables"];
    }
  };

  const currentSupplierRecord = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0] || {
    id: "SUP-001",
    name: "Tata Steel",
    avgPricePerUnit: 350,
    deliveryPerformance: 98,
    avgLeadTimeDays: 3,
    qualityRating: 4.8,
    status: SupplierStatus.PREFERRED
  };

  const getSupplierContractExpiry = (id: string) => {
    switch (id) {
      case "SUP-001": return "2027-12-15";
      case "SUP-002": return "2028-04-30";
      case "SUP-003": return "2026-08-01 (Review Flagged)";
      case "SUP-004": return "2029-01-10";
      case "SUP-005": return "2027-10-22";
      default: return "2027-09-05";
    }
  };

  const getSupplierPurchaseHistory = (id: string) => {
    switch (id) {
      case "SUP-001":
        return [
          { po: "PO-2026-110", date: "2026-05-12", item: "Steel Sheet (12mm)", total: 140000, status: "Delivered" },
          { po: "PO-2026-085", date: "2026-03-04", item: "Steel Sheet (12mm)", total: 105000, status: "Delivered" }
        ];
      case "SUP-002":
        return [
          { po: "PO-2026-092", date: "2026-04-18", item: "Steel Sheet (12mm)", total: 220500, status: "Delivered" }
        ];
      case "SUP-003":
        return [
          { po: "PO-2026-040", date: "2026-01-20", item: "Structural Steel Joint", total: 410000, status: "Delayed (14 days)" }
        ];
      case "SUP-004":
        return [
          { po: "PO-2026-120", date: "2026-06-01", item: "Microprocessor Chip X1", total: 144000, status: "Delivered" }
        ];
      default:
        return [];
    }
  };

  // Inventory Table Operations
  const handleInventorySort = (key: typeof inventorySortKey) => {
    if (inventorySortKey === key) {
      setInventorySortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setInventorySortKey(key);
      setInventorySortOrder("asc");
    }
  };

  const sortedAndFilteredInventory = [...inventory]
    .filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(inventorySearch.toLowerCase()) || 
                            item.id.toLowerCase().includes(inventorySearch.toLowerCase());
      const matchesWarehouse = inventoryWarehouse === "all" || item.warehouse === inventoryWarehouse;
      return matchesSearch && matchesWarehouse;
    })
    .sort((a, b) => {
      let valA = a[inventorySortKey];
      let valB = b[inventorySortKey];
      if (typeof valA === "string" && typeof valB === "string") {
        return inventorySortOrder === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return inventorySortOrder === "asc" 
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

  // Department Spend Analytics
  const deptChartData = Object.entries(
    requests.reduce((acc, r) => {
      acc[r.department] = (acc[r.department] || 0) + r.totalAmount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const monthlySpendData = [
    { month: "Jan", "Total Spend": 1250000, "Cost Reduction": 340000 },
    { month: "Feb", "Total Spend": 1450000, "Cost Reduction": 290000 },
    { month: "Mar", "Total Spend": 1900000, "Cost Reduction": 510000 },
    { month: "Apr", "Total Spend": 1100000, "Cost Reduction": 180000 },
    { month: "May", "Total Spend": 2200000, "Cost Reduction": 620000 },
    { month: "Jun", "Total Spend": 2600000, "Cost Reduction": 750000 },
    { month: "Jul", "Total Spend": totalSpendPipeline > 0 ? totalSpendPipeline : 1372000, "Cost Reduction": totalCostReductions > 0 ? totalCostReductions : 508000 }
  ];

  const vendorPerformanceData = suppliers.map(s => ({
    name: s.name.split(" ")[0],
    "Delivery Reliability (%)": s.deliveryPerformance,
    "Quality Score (x20)": s.qualityRating * 20
  }));

  // Requisitions pagination & highlight helpers
  const totalRequisitionPages = Math.max(1, Math.ceil(sortedAndFilteredRequests.length / requisitionPageSize));
  
  const paginatedRequests = sortedAndFilteredRequests.slice(
    (requisitionPage - 1) * requisitionPageSize,
    requisitionPage * requisitionPageSize
  );

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-100 text-yellow-900 font-bold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const handleBulkApprove = async () => {
    if (selectedRequisitionIds.length === 0) return;
    try {
      setIsLoading(true);
      const promises = selectedRequisitionIds.map(id =>
        fetch(`/api/requests/${id}/workflow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: RequestStatus.APPROVED,
            username: activeUserInfo.name,
            role: activeUserInfo.roleLabel,
            notes: "Approved in bulk via ERP Data Grid."
          })
        })
      );
      await Promise.all(promises);
      showNotification(`Successfully approved ${selectedRequisitionIds.length} requisitions.`);
      setSelectedRequisitionIds([]);
      await fetchData();
    } catch (err) {
      showNotification("Failed bulk approving requisitions.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedRequisitionIds.length === 0) return;
    const selectedReqs = requests.filter(r => selectedRequisitionIds.includes(r.id));
    const headers = ["ID", "Item Name", "Quantity", "Unit Price", "Total Amount", "Department", "Status", "Risk Level", "Requested By", "Date"];
    const rows = selectedReqs.map(r => [
      r.id,
      `"${r.itemName}"`,
      r.quantity,
      r.unitPrice,
      r.totalAmount,
      r.department,
      r.status,
      r.riskLevel,
      r.requestedBy,
      new Date(r.createdAt).toLocaleDateString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Selected_Odoo_Requisitions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`Exported ${selectedRequisitionIds.length} selected requisitions.`);
  };

  return (
    <div className="flex flex-col h-screen min-w-[1200px] bg-[#f8f9fa] text-[#212529] font-sans overflow-hidden antialiased select-none">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded shadow-lg border text-xs flex items-center gap-2 transition-all duration-300 transform translate-y-0 ${
          notification.type === "error" 
            ? "bg-rose-50 border-rose-200 text-rose-800" 
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          <CheckSquare className="w-4 h-4" />
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* ---------------- Odoo Upper Brand Header ---------------- */}
      <header className="h-[46px] bg-[#714B67] flex items-center justify-between px-4 shrink-0 text-white z-40 relative">
        <div className="flex items-center gap-5">
          <button className="p-1 hover:bg-[#5f3f56] rounded transition-colors mr-1 cursor-pointer" title="Applications Menu">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z"/></svg>
          </button>
          
          <div className="flex items-center gap-1.5 font-bold text-sm tracking-wide text-white/95">
            <span>ProcureIQ</span>
            <span className="text-[10px] uppercase tracking-widest font-semibold bg-white/10 px-1.5 py-0.5 rounded text-white/80 font-mono">
              Enterprise Hub
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/20"></div>

          {/* Odoo Native App Tabs Navigation */}
          <nav className="flex items-center h-full text-[13px] font-medium text-white/80 gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1.5 rounded transition-all hover:bg-white/10 hover:text-white cursor-pointer ${activeTab === "dashboard" ? "bg-white/15 text-white font-semibold" : ""}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("requisitions")}
              className={`px-3 py-1.5 rounded transition-all hover:bg-white/10 hover:text-white cursor-pointer ${activeTab === "requisitions" ? "bg-white/15 text-white font-semibold" : ""}`}
            >
              Purchase Requests
            </button>
            <button
              onClick={() => {
                setActiveTab("review");
                const firstPending = requests.find(r => r.status === RequestStatus.SUBMITTED || r.status === RequestStatus.UNDER_REVIEW);
                if (firstPending) {
                  setSelectedRequest(firstPending);
                } else if (requests.length > 0 && !selectedRequest) {
                  setSelectedRequest(requests[0]);
                }
              }}
              className={`px-3 py-1.5 rounded transition-all hover:bg-white/10 hover:text-white cursor-pointer flex items-center gap-1.5 relative ${activeTab === "review" ? "bg-white/15 text-white font-semibold" : ""}`}
            >
              <span>Audit Workbench</span>
              {(pendingCount + flaggedCount) > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-xs text-[9px] font-extrabold font-mono leading-none">
                  {pendingCount + flaggedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("suppliers")}
              className={`px-3 py-1.5 rounded transition-all hover:bg-white/10 hover:text-white cursor-pointer ${activeTab === "suppliers" ? "bg-white/15 text-white font-semibold" : ""}`}
            >
              Suppliers
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-3 py-1.5 rounded transition-all hover:bg-white/10 hover:text-white cursor-pointer ${activeTab === "inventory" ? "bg-white/15 text-white font-semibold" : ""}`}
            >
              Inventory
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-3 py-1.5 rounded transition-all hover:bg-white/10 hover:text-white cursor-pointer ${activeTab === "reports" ? "bg-white/15 text-white font-semibold" : ""}`}
            >
              Reports
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-1.5 rounded transition-all hover:bg-white/10 hover:text-white cursor-pointer ${activeTab === "settings" ? "bg-white/15 text-white font-semibold" : ""}`}
            >
              Settings
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Database connection marker */}
          <div className="flex items-center gap-1.5 text-white/80 font-mono text-[11px] bg-black/10 px-2.5 py-1 rounded border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Corporate SQL Tenant Connected</span>
          </div>

          {/* User Profile & Operational Role Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-2 p-1.5 px-3 bg-[#5f3f56] hover:bg-white/10 rounded-sm transition-colors cursor-pointer text-white"
              title="User Account"
            >
              <div className="w-5 h-5 rounded-full bg-[#00A09D] flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-3xs">
                {getActiveUserInfo().name.charAt(0)}
              </div>
              <span className="font-semibold text-[11px] max-w-[120px] truncate">{getActiveUserInfo().name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/70" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-300 rounded shadow-lg text-xs z-50 text-gray-800 p-4 space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="w-10 h-10 rounded-full bg-[#00A09D] flex items-center justify-center text-sm font-bold text-white uppercase">
                    {getActiveUserInfo().name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 leading-none">{getActiveUserInfo().name}</h4>
                    <p className="text-[11px] text-gray-400 mt-1">{getActiveUserInfo().roleLabel}</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{getActiveUserInfo().dept}</p>
                  </div>
                </div>

                {/* Workspace Details */}
                <div className="bg-slate-50 border border-slate-100 rounded p-2.5 space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>Active Corporate Workspace</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-800 font-bold text-xs">
                    <Building className="w-3.5 h-3.5 text-[#00A09D]" />
                    <span>{company?.name || "ProcureIQ Core"}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono">ID: corp-{company?.id || "default"}</p>
                </div>

                {/* Identity / Role Switcher Inside Profile Menu */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">ERP Role Clearance (Debug)</span>
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value as any);
                      showNotification(`Switched active persona to ${e.target.value.toUpperCase()}: ${getActiveUserInfo().name}`, "success");
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none cursor-pointer text-xs font-semibold text-gray-700"
                  >
                    <option value="buyer">Buyer: Anil Sharma</option>
                    <option value="officer">Procurement Officer: Sarah Jenkins</option>
                    <option value="head">Department Head: Ravi Kumar</option>
                    <option value="manager">Finance Director: Meera Nair</option>
                    <option value="warehouse">Warehouse Manager: Vijay Singh</option>
                    <option value="admin">System Administrator: Superuser (Admin)</option>
                  </select>
                </div>

                {/* Live Dark Theme Switch */}
                <div className="flex items-center justify-between border-t border-b border-gray-100 py-2.5">
                  <div className="flex items-center gap-2">
                    {isDarkMode ? <Moon className="w-4 h-4 text-[#00A09D]" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    <span className="font-semibold text-gray-700 text-xs">Dark Mode Theme</span>
                  </div>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0 bg-gray-200"
                    style={{ backgroundColor: isDarkMode ? "#00A09D" : "" }}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        isDarkMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Logout / Corporate controls */}
                <div className="pt-1 flex justify-between items-center text-[10px] text-gray-400 font-medium">
                  <span>ProcureIQ Enterprise v3.0</span>
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleLogout();
                    }}
                    className="text-rose-600 font-bold hover:underline"
                  >
                    Secure Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notification Center Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-1.5 bg-[#5f3f56] hover:bg-white/10 rounded-full transition-colors relative cursor-pointer"
              title="Alert Notifications"
            >
              <Bell className="w-4 h-4 text-white" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#714B67]"></span>
              )}
            </button>

            {/* Odoo Bell Notifications dropdown overlay */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded shadow-lg text-xs z-50 text-gray-800">
                <div className="p-2.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <span>Audit Alerts & Notifications</span>
                  <button 
                    onClick={async () => {
                      setNotifications(notifications.map(n => ({ ...n, read: true })));
                      showNotification("Marked all alerts as read.");
                      await fetch("/api/notifications/read-all", { method: "POST" });
                    }} 
                    className="text-xs text-[#714B67] hover:underline cursor-pointer lowercase"
                  >
                    Mark read
                  </button>
                </div>
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      onClick={() => {
                        if (notif.relatedRequestId) {
                          const req = requests.find(r => r.id === notif.relatedRequestId);
                          if (req) {
                            setSelectedRequest(req);
                            setActiveTab("review");
                          }
                        }
                        setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                        setIsNotificationsOpen(false);
                        fetch(`/api/notifications/${notif.id}/read`, { method: "POST" });
                      }}
                      className={`p-3 text-left hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? "bg-indigo-50/10 border-l-2 border-[#714B67]" : ""}`}
                    >
                      <p className="font-bold text-gray-800">{notif.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                      <span className="text-[9px] text-gray-400 font-mono mt-1 block">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1.5 bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold px-3 py-1.5 rounded-sm transition-all text-xs cursor-pointer shadow-3xs"
          >
            <Plus className="w-4 h-4" />
            Create Request
          </button>
        </div>
      </header>

      {/* ---------------- Odoo Sub-Control Bar ---------------- */}
      <section className="h-[44px] bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-30 shadow-3xs">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-gray-400 font-medium">Odoo Procurement</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="font-semibold text-gray-700 capitalize">
            {activeTab === "dashboard" ? "Procurement Dashboard" :
             activeTab === "requisitions" ? "Purchase Requisitions Registry" :
             activeTab === "review" ? "Pre-Approval Audit Workbench" :
             activeTab === "suppliers" ? "Vendor Directory" :
             activeTab === "inventory" ? "Warehouse Status" :
             activeTab === "reports" ? "Operational Analytics & Reports" : "Extension Parameters"}
          </span>
          {(activeTab === "requisitions" || activeTab === "review") && selectedRequest && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              <span className="font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[11px] border border-gray-200">{selectedRequest.id}</span>
              <WorkflowStatusBadge status={selectedRequest.status} className="ml-2 scale-90" />
            </>
          )}
        </div>

        {/* Universal Search bar & Action triggers */}
        <div className="flex items-center gap-3.5 relative">
          
          {/* Segmented layout switcher for requisitions */}
          {activeTab === "requisitions" && (
            <div className="flex items-center bg-gray-100 rounded-sm p-0.5 border border-gray-200">
              <button
                onClick={() => setRequisitionViewMode("split")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
                  requisitionViewMode === "split"
                    ? "bg-[#714B67] text-white shadow-3xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Split View (Master-Detail)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Split View</span>
              </button>
              <button
                onClick={() => setRequisitionViewMode("list")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
                  requisitionViewMode === "list"
                    ? "bg-[#714B67] text-white shadow-3xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Grid List View (Data Table)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Data Grid</span>
              </button>
            </div>
          )}

          {/* Global Fuzzy Search Input */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-sm px-2.5 py-1 w-72 text-xs relative">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-1.5 shrink-0" />
            <input
              type="text"
              placeholder="Fuzzy search PRs, suppliers, SKUs..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchOverlayOpen(e.target.value.trim().length >= 2);
              }}
              onFocus={() => {
                if (searchTerm.trim().length >= 2) setIsSearchOverlayOpen(true);
              }}
              className="bg-transparent border-none text-xs text-gray-800 placeholder-gray-400 focus:outline-none w-full"
            />
            {searchTerm && (
              <X 
                className="w-3 h-3 text-gray-400 cursor-pointer hover:text-gray-600" 
                onClick={() => {
                  setSearchTerm("");
                  setIsSearchOverlayOpen(false);
                }} 
              />
            )}
          </div>

          {/* Custom Instant Search Dropdown Overlay */}
          {isSearchOverlayOpen && (
            <GlobalSearchOverlay
              query={searchTerm}
              requests={requests}
              suppliers={suppliers}
              inventory={inventory}
              onSelectRequest={setSelectedRequest}
              onSelectSupplier={setSelectedSupplierId}
              onSelectTab={setActiveTab}
              onClear={() => setIsSearchOverlayOpen(false)}
            />
          )}

          {/* Enterprise Action Dropdowns */}
          {(activeTab === "requisitions" || activeTab === "review") && (
            <div className="flex items-center gap-1 border-l border-gray-200 pl-3.5">
              <button
                onClick={() => handleExport("csv")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-sm hover:bg-gray-50 text-[11px] font-bold text-gray-600 cursor-pointer"
                title="Export list to Excel / CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                onClick={() => handleExport("print")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-sm hover:bg-gray-50 text-[11px] font-bold text-gray-600 cursor-pointer"
                title="Print Report"
              >
                <Printer className="w-3.5 h-3.5" />
                Print List
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ----------------- Core Content Work Area ----------------- */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ----------------- TAB 1: DASHBOARD ----------------- */}
        {activeTab === "dashboard" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Elegant Context Module Header */}
            <div className="p-4 bg-white border border-gray-200 rounded flex justify-between items-center shadow-3xs">
              <div className="space-y-1">
                <h1 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Odoo Purchase Review Analytics</h1>
                <p className="text-gray-500 text-xs leading-relaxed max-w-4xl">
                  ProcureIQ provides secure audit verification for active requisitions, validating them against real-time warehouse inventory, pre-approved vendor contracts, and budgetary limits. Track compliance markers, examine alternative sourcing options, and authorize purchase orders seamlessly.
                </p>
              </div>
            </div>

            {/* Odoo Minimalist Metrics Grid */}
            <div className="grid grid-cols-5 gap-4">
              <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pipeline Awaiting Review</p>
                <p className="text-2xl font-bold text-gray-800 mt-1 font-mono">{requests.filter(r => r.status === RequestStatus.SUBMITTED).length}</p>
                <p className="text-[11px] text-gray-500 mt-1">Pending verification</p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Under Active Audit</p>
                <p className="text-2xl font-bold text-blue-600 mt-1 font-mono">{requests.filter(r => r.status === RequestStatus.UNDER_REVIEW).length}</p>
                <p className="text-[11px] text-gray-500 mt-1">Review sessions active</p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inventory Shortages</p>
                <p className="text-2xl font-bold text-rose-600 mt-1 font-mono">{lowStockCount}</p>
                <p className="text-[11px] text-gray-500 mt-1">Items below reorder safety stock</p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Restricted Suppliers</p>
                <p className="text-2xl font-bold text-amber-600 mt-1 font-mono">{restrictedSuppliersCount}</p>
                <p className="text-[11px] text-gray-500 mt-1">Vendors flagged for compliance</p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Identified Cost Reductions</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1 font-mono">₹{totalCostReductions.toLocaleString()}</p>
                <p className="text-[11px] text-gray-500 mt-1">Unlocked capital optimization</p>
              </div>
            </div>

            {/* Dashboard Insights Grid */}
            <div className="grid grid-cols-3 gap-6">
              
              {/* Left Column: High Risk & Over-allocations List */}
              <div className="col-span-2 space-y-6">
                <div className="bg-white border border-gray-200 rounded shadow-3xs">
                  <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">High Risk Requisitions & Surplus Warnings</span>
                    <button onClick={() => setActiveTab("requisitions")} className="text-xs text-[#714B67] font-semibold hover:underline">View Pipeline</button>
                  </div>
                  
                  <div className="divide-y divide-gray-100">
                    {requests.filter(r => r.riskLevel === RiskLevel.HIGH).slice(0, 4).map(req => (
                      <div 
                        key={req.id} 
                        className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer text-xs"
                        onClick={() => {
                          setSelectedRequest(req);
                          setActiveTab("review");
                        }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#714B67]">{req.id}</span>
                            <span className="font-semibold text-gray-800">{req.itemName}</span>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Requested by {req.requestedBy} | Dept: <span className="font-semibold text-gray-700">{req.department}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-mono font-bold text-gray-900">₹{req.totalAmount.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400">{req.quantity} units</p>
                          </div>
                          
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold font-mono bg-rose-50 border border-rose-100 text-rose-700 uppercase">
                            High Risk
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spend Trend Line chart */}
                <div className="p-5 bg-white border border-gray-200 rounded shadow-3xs">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Proposed Spend vs. Cost Reductions Profile</h3>
                    </div>
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlySpendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickFormatter={(v) => `₹${v / 100000}L`} />
                        <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} contentStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="Total Spend" fill="#714B67" name="Requisition Pipeline" barSize={16} />
                        <Bar dataKey="Cost Reduction" fill="#10b981" name="Optimized Savings" barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Right Column: Warehouse shortages and active audit log trail */}
              <div className="space-y-6">
                
                {/* Warehouse Shortages Card */}
                <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Warehouse Shortages</h3>
                  <div className="space-y-2">
                    {inventory.filter(i => i.quantityInStock <= i.reorderPoint).slice(0, 3).map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2 last:border-none last:pb-0">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-gray-800">{item.itemName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{item.sku} | {item.warehouse}</p>
                        </div>
                        <div className="text-right font-mono">
                          <p className="font-bold text-rose-600">{item.quantityInStock} {item.unit}</p>
                          <p className="text-[9px] text-gray-400">Safety Limit: {item.reorderPoint}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveTab("inventory")} className="w-full mt-2 text-center text-xs text-[#714B67] hover:underline font-semibold block">
                    Manage Inventory
                  </button>
                </div>

                {/* Audit trail */}
                <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Audit Logs Trail</h3>
                  <div className="relative border-l border-gray-200 ml-1.5 space-y-4 text-xs">
                    {auditLogs.slice(0, 4).map(log => (
                      <div key={log.id} className="relative pl-5">
                        <span className="absolute -left-[4px] top-1.5 w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-gray-800">{log.user}</span>
                          <span className="text-[9px] text-gray-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">{log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ----------------- TAB 2: PURCHASE REQUESTS (REGISTRY) ----------------- */}
        {activeTab === "requisitions" && (
          requests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white w-full animate-fade-in">
              <div className="inline-flex items-center justify-center p-4 bg-gray-50 text-gray-400 rounded-full mb-3 border border-gray-100">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">No purchase requests yet</h3>
              <p className="text-xs text-gray-500 max-w-md mt-1 leading-relaxed">
                The procurement pipeline has not received any draft or submitted transactions yet. Create a requisition or import your ERP databases to begin.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold px-4 py-2 rounded text-xs cursor-pointer shadow-3xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Purchase Request
                </button>
                <button
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      const res = await fetch("/api/import/connect-odoo", { method: "POST" });
                      const data = await res.json();
                      if (data.success) {
                        showNotification("Secure connection established. Odoo ERP databases synced.");
                        await fetchData();
                      } else {
                        showNotification(data.error || "Failed to sync Odoo ERP.", "error");
                      }
                    } catch (err) {
                      showNotification("Failed to connect to ERP server.", "error");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-bold px-4 py-2 rounded text-xs cursor-pointer"
                >
                  Connect Odoo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {requisitionViewMode === "split" ? (
              <>
                {/* Left Column: Requisitions List Queue with Quick Search/Sort/Filters */}
                <div className="w-[380px] border-r border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">
              
              {/* Registry Quick Controls */}
              <div className="p-3 border-b border-gray-200 bg-gray-50/50 space-y-2.5 shrink-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Purchase Pipeline ({sortedAndFilteredRequests.length})</span>
                  <button 
                    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)} 
                    className={`text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 border rounded-sm transition-all ${
                      isFilterPanelOpen 
                        ? "bg-[#714B67]/5 text-[#714B67] border-[#714B67]" 
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Sliders className="w-3 h-3" />
                    Filters
                  </button>
                </div>

                {/* Odoo-style sliding filter panel */}
                {isFilterPanelOpen && (
                  <div className="p-3 bg-white border border-gray-200 rounded-sm space-y-2.5 text-[11px] shadow-3xs animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-400 block font-bold mb-1">Department</label>
                        <select 
                          value={filterDepartment} 
                          onChange={(e) => setFilterDepartment(e.target.value)}
                          className="w-full bg-white border rounded p-1 text-[11px]"
                        >
                          <option value="all">All Departments</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Research & Development">R&D</option>
                          <option value="Maintenance Operations">Maintenance</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-400 block font-bold mb-1">Status</label>
                        <select 
                          value={filterStatus} 
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full bg-white border rounded p-1 text-[11px] capitalize"
                        >
                          <option value="all">All Statuses</option>
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="under_review">Under Review</option>
                          <option value="needs_revision">Needs Revision</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="po_created">PO Created</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-400 block font-bold mb-1">Priority</label>
                        <select 
                          value={filterPriority} 
                          onChange={(e) => setFilterPriority(e.target.value)}
                          className="w-full bg-white border rounded p-1 text-[11px] capitalize"
                        >
                          <option value="all">All Priorities</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-400 block font-bold mb-1">Risk Level</label>
                        <select 
                          value={filterRisk} 
                          onChange={(e) => setFilterRisk(e.target.value)}
                          className="w-full bg-white border rounded p-1 text-[11px] capitalize"
                        >
                          <option value="all">All Risks</option>
                          <option value="low">Low Risk</option>
                          <option value="medium">Medium Risk</option>
                          <option value="high">High Risk</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2">
                      <div>
                        <label className="text-gray-400 block font-bold mb-1">Min Value (₹)</label>
                        <input
                          type="number"
                          placeholder="Min amount..."
                          value={filterMinAmount}
                          onChange={(e) => setFilterMinAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full bg-white border rounded p-1 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 block font-bold mb-1">Max Value (₹)</label>
                        <input
                          type="number"
                          placeholder="Max amount..."
                          value={filterMaxAmount}
                          onChange={(e) => setFilterMaxAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full bg-white border rounded p-1 text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-gray-100 pt-2 font-bold">
                      <button 
                        onClick={() => {
                          setFilterDepartment("all");
                          setFilterStatus("all");
                          setFilterPriority("all");
                          setFilterRisk("all");
                          setFilterMinAmount("");
                          setFilterMaxAmount("");
                          showNotification("Filters reset.");
                        }}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        Reset All
                      </button>
                      <button 
                        onClick={() => setIsFilterPanelOpen(false)} 
                        className="bg-[#714B67] text-white px-3 py-1 rounded-sm cursor-pointer"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                )}

                {/* Sort headers selector row */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 font-bold uppercase border-t border-gray-100 pt-2">
                  <span className="shrink-0">Sort:</span>
                  <button 
                    onClick={() => {
                      if (requisitionSortKey === "totalAmount") {
                        setRequisitionSortOrder(prev => prev === "asc" ? "desc" : "asc");
                      } else {
                        setRequisitionSortKey("totalAmount");
                        setRequisitionSortOrder("desc");
                      }
                    }}
                    className={`px-1.5 py-0.5 rounded-xs border flex items-center gap-0.5 cursor-pointer ${
                      requisitionSortKey === "totalAmount" ? "bg-[#714B67]/5 text-[#714B67] border-[#714B67]" : "bg-white border-gray-200"
                    }`}
                  >
                    Value <ArrowUpDown className="w-2.5 h-2.5" />
                  </button>
                  <button 
                    onClick={() => {
                      if (requisitionSortKey === "id") {
                        setRequisitionSortOrder(prev => prev === "asc" ? "desc" : "asc");
                      } else {
                        setRequisitionSortKey("id");
                        setRequisitionSortOrder("desc");
                      }
                    }}
                    className={`px-1.5 py-0.5 rounded-xs border flex items-center gap-0.5 cursor-pointer ${
                      requisitionSortKey === "id" ? "bg-[#714B67]/5 text-[#714B67] border-[#714B67]" : "bg-white border-gray-200"
                    }`}
                  >
                    ID <ArrowUpDown className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {/* Items listing */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {sortedAndFilteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 italic text-xs space-y-1">
                    <FileSpreadsheet className="w-8 h-8 opacity-40 mx-auto mb-1.5" />
                    <p>No requisitions found matching those parameters.</p>
                  </div>
                ) : (
                  sortedAndFilteredRequests.map(req => {
                    const isSelected = selectedRequest?.id === req.id;
                    return (
                      <div 
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={`p-3.5 cursor-pointer transition-all hover:bg-gray-50 flex flex-col gap-1 ${
                          isSelected ? "bg-[#714B67]/5 border-r-[3px] border-[#714B67]" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-bold text-gray-900">{req.id}</span>
                            <p className="text-xs font-semibold text-gray-800">{req.itemName}</p>
                          </div>
                          <span className="font-mono text-xs font-bold text-gray-950">₹{req.totalAmount.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center mt-1.5 text-[10px] text-gray-500">
                          <div className="flex items-center gap-1">
                            <span>{req.department}</span>
                            <span>•</span>
                            <span className="font-bold uppercase tracking-wider text-gray-400">{req.priority || "Medium"}</span>
                          </div>
                          <WorkflowStatusBadge status={req.status} className="scale-90" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Complete Procurement Report & Audit Details */}
            <div className="flex-1 bg-white overflow-y-auto flex flex-col">
              {selectedRequest ? (
                <div className="p-6 space-y-6 flex-1 max-w-4xl">
                  
                  {/* Requisition Header Meta */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-gray-400 font-mono tracking-wider font-bold">ERP PURCHASE REQUISITION FILE</span>
                        <h2 className="text-base font-bold text-gray-900 mt-0.5">{selectedRequest.id} — {selectedRequest.itemName}</h2>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5 flex-wrap">
                          <span>Requisitioner: <span className="font-semibold text-gray-700">{selectedRequest.requestedBy}</span></span>
                          <span>•</span>
                          <span>Department: <span className="font-semibold text-gray-700">{selectedRequest.department}</span></span>
                          <span>•</span>
                          <span>Priority: <span className="font-bold text-gray-700 uppercase">{selectedRequest.priority || "Medium"}</span></span>
                          <span>•</span>
                          <span>Created Date: <span className="font-semibold text-gray-700">{new Date(selectedRequest.createdAt).toLocaleDateString()}</span></span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Estimated Total Value</p>
                        <p className="text-xl font-extrabold text-gray-950 font-mono">₹{selectedRequest.totalAmount.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{selectedRequest.quantity} units @ ₹{selectedRequest.unitPrice}/unit</p>
                      </div>
                    </div>

                    <div className="mt-3.5 p-3 bg-gray-50 border border-gray-200 rounded-sm text-xs text-gray-600 italic leading-relaxed">
                      &ldquo;{selectedRequest.description}&rdquo;
                    </div>
                  </div>

                  {/* Operational indicators details */}
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Inventory details */}
                    <div className="p-4 bg-gray-50/50 border border-gray-200 rounded-sm text-xs space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" /> Warehouse Stocking Indicators
                      </p>
                      <table className="w-full text-left">
                        <tbody>
                          <tr className="border-b border-gray-200/40">
                            <td className="py-1 text-gray-500">Physical Reserve Stock:</td>
                            <td className="py-1 font-mono font-bold text-gray-800">
                              {selectedRequest.id === "PR-2026-001" ? "482 sheets" : selectedRequest.id === "PR-2026-003" ? "850 liters" : "35 units"}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-200/40">
                            <td className="py-1 text-gray-500">Warehouse Safety Point:</td>
                            <td className="py-1 font-mono font-bold text-gray-800">
                              {selectedRequest.id === "PR-2026-001" ? "200 sheets" : selectedRequest.id === "PR-2026-003" ? "400 liters" : "100 units"}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-200/40">
                            <td className="py-1 text-gray-500">Monthly Consumption:</td>
                            <td className="py-1 font-mono font-bold text-gray-800">
                              {selectedRequest.id === "PR-2026-001" ? "380 sheets / mo" : selectedRequest.id === "PR-2026-003" ? "200 liters / mo" : "120 units / mo"}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 text-gray-500">Est. Stock Run-time:</td>
                            <td className={`py-1 font-mono font-bold ${selectedRequest.id === "PR-2026-005" ? "text-rose-600" : "text-emerald-600"}`}>
                              {selectedRequest.id === "PR-2026-001" ? "38 Days (Surplus)" : selectedRequest.id === "PR-2026-003" ? "128 Days (Surplus)" : "9 Days (Shortage)"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Sourcing contracts indicators */}
                    <div className="p-4 bg-gray-50/50 border border-gray-200 rounded-sm text-xs space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> Sourcing Vendor KPIs
                      </p>
                      <table className="w-full text-left">
                        <tbody>
                          <tr className="border-b border-gray-200/40">
                            <td className="py-1 text-gray-500">Assigned Supplier:</td>
                            <td className="py-1 font-bold text-gray-800">
                              {suppliers.find(s => s.id === selectedRequest.supplierId)?.name || "Vendor Unknown"}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-200/40">
                            <td className="py-1 text-gray-500">Compliance Contract Status:</td>
                            <td className="py-1 font-mono font-bold">
                              <span className={`px-1.5 py-0.2 text-[9px] rounded font-bold ${
                                selectedRequest.id === "PR-2026-001" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                              }`}>
                                {selectedRequest.id === "PR-2026-001" ? "RESTRICTED" : "PREFERRED"}
                              </span>
                            </td>
                          </tr>
                          <tr className="border-b border-gray-200/40">
                            <td className="py-1 text-gray-500">Vendor On-Time Reliability:</td>
                            <td className="py-1 font-mono font-bold text-gray-800">
                              {suppliers.find(s => s.id === selectedRequest.supplierId)?.deliveryPerformance || 90}%
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 text-gray-500">Average Supplier Lead Time:</td>
                            <td className="py-1 font-mono font-bold text-gray-800">
                              {suppliers.find(s => s.id === selectedRequest.supplierId)?.avgLeadTimeDays || 4} Days
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sourcing Audit Details Panel (The Chatter) */}
                  <div className="border-t border-gray-200 pt-6 space-y-8">
                    
                    {/* Collaboration Thread Panel */}
                    <CollaborationComments
                      requestId={selectedRequest.id}
                      comments={selectedRequest.comments}
                      activeUser={activeUserInfo.name}
                      activeRole={activeUserInfo.roleLabel}
                      onCommentAdded={handleCommentsRefresh}
                    />

                    {/* Document Attachments Panel */}
                    <DocumentAttachments
                      requestId={selectedRequest.id}
                      attachments={selectedRequest.attachments}
                      uploadedBy={activeUserInfo.name}
                      onAttachmentUploaded={handleAttachmentRefresh}
                    />

                    {/* Chronological Activity Feed Panel */}
                    <ActivityTimeline timeline={selectedRequest.timeline} />

                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                  <FileSpreadsheet className="w-12 h-12 mb-2 opacity-50 text-[#714B67]" />
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Select Requisition</p>
                  <p className="text-xs text-gray-500">Select an item from the pipeline queue to view its complete audit record.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col bg-white overflow-hidden animate-fade-in w-full">
            
            {/* Advanced Grid Toolbar */}
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0 text-xs">
              <div className="flex items-center gap-3">
                {selectedRequisitionIds.length > 0 ? (
                  <div className="flex items-center gap-2 bg-[#714B67]/5 border border-[#714B67]/20 rounded px-2.5 py-1 text-xs">
                    <span className="font-bold text-[#714B67]">{selectedRequisitionIds.length} records selected</span>
                    <div className="w-px h-3.5 bg-gray-200 mx-1"></div>
                    <button
                      onClick={handleBulkApprove}
                      className="text-[#00A09D] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Bulk Approve
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      onClick={handleBulkExport}
                      className="text-gray-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Selected (CSV)
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      onClick={() => setSelectedRequisitionIds([])}
                      className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                    >
                      Clear selection
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Data Grid View Controls</span>
                    <div className="w-px h-3 bg-gray-200 mx-1"></div>
                    <span className="font-semibold text-gray-700">Pipeline Total: {sortedAndFilteredRequests.length} active PRs</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Column Selectors */}
                <div className="relative flex items-center gap-1.5 bg-white border border-gray-200 rounded px-2 py-1 text-xs">
                  <Sliders className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-500 font-medium">Columns:</span>
                  {["Department", "Priority", "Risk Level", "Requester", "Date"].map(col => {
                    const colKey = col === "Risk Level" ? "riskLevel" : col === "Requester" ? "requestedBy" : col === "Date" ? "createdAt" : col.toLowerCase();
                    const isHidden = hiddenRequisitionColumns.includes(colKey);
                    return (
                      <button
                        key={col}
                        onClick={() => {
                          if (isHidden) {
                            setHiddenRequisitionColumns(prev => prev.filter(c => c !== colKey));
                          } else {
                            setHiddenRequisitionColumns(prev => [...prev, colKey]);
                          }
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                          !isHidden 
                            ? "bg-gray-100 border-gray-300 text-gray-700" 
                            : "bg-transparent border-gray-200 text-gray-400 line-through"
                        }`}
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>

                {/* Quick CSV Export all filtered */}
                <button
                  onClick={() => handleExport("csv")}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-2.5 py-1 rounded-sm text-xs cursor-pointer flex items-center gap-1 shadow-3xs"
                  title="Export all matching records to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Data Grid Body with Sticky Header */}
            <div className="flex-1 overflow-auto bg-slate-50/30">
              <table className="w-full text-xs text-left border-collapse table-fixed min-w-[1000px]">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 shadow-3xs">
                  <tr className="text-gray-500 font-bold uppercase tracking-wider font-mono select-none text-[10px] h-10">
                    <th className="w-12 p-3 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedRequests.length > 0 && paginatedRequests.every(r => selectedRequisitionIds.includes(r.id))}
                        onChange={() => {
                          const isAllSelectedOnPage = paginatedRequests.length > 0 && paginatedRequests.every(r => selectedRequisitionIds.includes(r.id));
                          if (isAllSelectedOnPage) {
                            setSelectedRequisitionIds(prev => prev.filter(id => !paginatedRequests.some(r => r.id === id)));
                          } else {
                            const newIds = paginatedRequests.map(r => r.id).filter(id => !selectedRequisitionIds.includes(id));
                            setSelectedRequisitionIds(prev => [...prev, ...newIds]);
                          }
                        }}
                        className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67] cursor-pointer"
                      />
                    </th>
                    <th className="w-28 p-3 cursor-pointer hover:bg-gray-150 transition-colors" onClick={() => {
                      if (requisitionSortKey === "id") {
                        setRequisitionSortOrder(prev => prev === "asc" ? "desc" : "asc");
                      } else {
                        setRequisitionSortKey("id");
                        setRequisitionSortOrder("desc");
                      }
                    }}>
                      <div className="flex items-center gap-1.5">
                        PR Reference {requisitionSortKey === "id" && (requisitionSortOrder === "asc" ? "▲" : "▼")}
                      </div>
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-gray-150 transition-colors" onClick={() => {
                      if (requisitionSortKey === "itemName") {
                        setRequisitionSortOrder(prev => prev === "asc" ? "desc" : "asc");
                      } else {
                        setRequisitionSortKey("itemName");
                        setRequisitionSortOrder("asc");
                      }
                    }}>
                      <div className="flex items-center gap-1.5">
                        Procurement Item {requisitionSortKey === "itemName" && (requisitionSortOrder === "asc" ? "▲" : "▼")}
                      </div>
                    </th>
                    {!hiddenRequisitionColumns.includes("department") && (
                      <th className="w-40 p-3">Department</th>
                    )}
                    {!hiddenRequisitionColumns.includes("priority") && (
                      <th className="w-24 p-3">Priority</th>
                    )}
                    <th className="w-28 p-3 cursor-pointer hover:bg-gray-150 transition-colors text-right" onClick={() => {
                      if (requisitionSortKey === "totalAmount") {
                        setRequisitionSortOrder(prev => prev === "asc" ? "desc" : "asc");
                      } else {
                        setRequisitionSortKey("totalAmount");
                        setRequisitionSortOrder("desc");
                      }
                    }}>
                      <div className="flex items-center justify-end gap-1.5">
                        Value {requisitionSortKey === "totalAmount" && (requisitionSortOrder === "asc" ? "▲" : "▼")}
                      </div>
                    </th>
                    {!hiddenRequisitionColumns.includes("riskLevel") && (
                      <th className="w-28 p-3 cursor-pointer hover:bg-gray-150 transition-colors" onClick={() => {
                        if (requisitionSortKey === "riskLevel") {
                          setRequisitionSortOrder(prev => prev === "asc" ? "desc" : "asc");
                        } else {
                          setRequisitionSortKey("riskLevel");
                          setRequisitionSortOrder("desc");
                        }
                      }}>
                        <div className="flex items-center gap-1.5">
                          Risk Level {requisitionSortKey === "riskLevel" && (requisitionSortOrder === "asc" ? "▲" : "▼")}
                        </div>
                      </th>
                    )}
                    <th className="w-32 p-3 cursor-pointer hover:bg-gray-150 transition-colors" onClick={() => {
                      if (requisitionSortKey === "status") {
                        setRequisitionSortOrder(prev => prev === "asc" ? "desc" : "asc");
                      } else {
                        setRequisitionSortKey("status");
                        setRequisitionSortOrder("asc");
                      }
                    }}>
                      <div className="flex items-center gap-1.5">
                        Workflow Status {requisitionSortKey === "status" && (requisitionSortOrder === "asc" ? "▲" : "▼")}
                      </div>
                    </th>
                    {!hiddenRequisitionColumns.includes("requestedBy") && (
                      <th className="w-36 p-3">Requested By</th>
                    )}
                    {!hiddenRequisitionColumns.includes("createdAt") && (
                      <th className="w-32 p-3">Created Date</th>
                    )}
                    <th className="w-28 p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {paginatedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-gray-400 italic">
                        <FileSpreadsheet className="w-10 h-10 opacity-30 mx-auto mb-2" />
                        No matching purchase requisitions found under those filter conditions.
                      </td>
                    </tr>
                  ) : (
                    paginatedRequests.map(req => {
                      const isSelected = selectedRequisitionIds.includes(req.id);
                      const isRowActive = selectedRequest?.id === req.id;
                      return (
                        <tr
                          key={req.id}
                          className={`hover:bg-gray-50/50 transition-colors font-mono h-11 ${
                            isRowActive ? "bg-indigo-50/25 border-l-2 border-[#714B67]" : isSelected ? "bg-[#714B67]/5" : "bg-white"
                          }`}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (selectedRequisitionIds.includes(req.id)) {
                                  setSelectedRequisitionIds(prev => prev.filter(i => i !== req.id));
                                } else {
                                  setSelectedRequisitionIds(prev => [...prev, req.id]);
                                }
                              }}
                              className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67] cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-bold text-[#714B67] cursor-pointer hover:underline" onClick={() => {
                            setSelectedRequest(req);
                            setRequisitionViewMode("split");
                          }}>
                            {req.id}
                          </td>
                          <td className="p-3 font-sans font-semibold text-gray-800 truncate" title={req.itemName}>
                            {highlightText(req.itemName, searchTerm)}
                          </td>
                          {!hiddenRequisitionColumns.includes("department") && (
                            <td className="p-3 font-sans text-gray-600 truncate">{req.department}</td>
                          )}
                          {!hiddenRequisitionColumns.includes("priority") && (
                            <td className="p-3 font-sans capitalize">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                req.priority === "urgent" ? "bg-red-50 text-red-700" :
                                req.priority === "high" ? "bg-orange-50 text-orange-700" :
                                req.priority === "medium" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-600"
                              }`}>
                                {req.priority || "Medium"}
                              </span>
                            </td>
                          )}
                          <td className="p-3 font-bold text-gray-950 text-right">
                            ₹{req.totalAmount.toLocaleString()}
                          </td>
                          {!hiddenRequisitionColumns.includes("riskLevel") && (
                            <td className="p-3 font-sans">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                req.riskLevel === RiskLevel.HIGH ? "bg-rose-50 text-rose-700 border border-rose-100" :
                                req.riskLevel === RiskLevel.MEDIUM ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              }`}>
                                {req.riskLevel}
                              </span>
                            </td>
                          )}
                          <td className="p-3 font-sans">
                            <WorkflowStatusBadge status={req.status} className="scale-95" />
                          </td>
                          {!hiddenRequisitionColumns.includes("requestedBy") && (
                            <td className="p-3 font-sans text-gray-700 truncate">{highlightText(req.requestedBy, searchTerm)}</td>
                          )}
                          {!hiddenRequisitionColumns.includes("createdAt") && (
                            <td className="p-3 text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                          )}
                          <td className="p-3 text-center font-sans space-x-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setRequisitionViewMode("split");
                              }}
                              className="text-[#714B67] hover:underline font-bold text-xs cursor-pointer"
                              title="Open details"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Data Grid Footer Pagination */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500 shrink-0 select-none">
              <div className="flex items-center gap-4">
                <span>
                  Showing <b>{Math.min(sortedAndFilteredRequests.length, (requisitionPage - 1) * requisitionPageSize + 1)}</b> to{" "}
                  <b>{Math.min(sortedAndFilteredRequests.length, requisitionPage * requisitionPageSize)}</b> of{" "}
                  <b>{sortedAndFilteredRequests.length}</b> entries
                </span>
                <div className="flex items-center gap-1.5">
                  <span>Rows per page:</span>
                  <select
                    value={requisitionPageSize}
                    onChange={(e) => {
                      setRequisitionPageSize(Number(e.target.value));
                      setRequisitionPage(1);
                    }}
                    className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none cursor-pointer"
                  >
                    {[5, 10, 20, 50].map(sz => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRequisitionPage(1)}
                  disabled={requisitionPage === 1}
                  className="px-2.5 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer font-bold text-[10px]"
                >
                  First
                </button>
                <button
                  onClick={() => setRequisitionPage(prev => Math.max(1, prev - 1))}
                  disabled={requisitionPage === 1}
                  className="px-2.5 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer font-bold text-[10px]"
                >
                  Previous
                </button>
                <span className="px-3 py-1 font-bold text-[#714B67]">
                  Page {requisitionPage} of {totalRequisitionPages}
                </span>
                <button
                  onClick={() => setRequisitionPage(prev => Math.min(totalRequisitionPages, prev + 1))}
                  disabled={requisitionPage === totalRequisitionPages}
                  className="px-2.5 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer font-bold text-[10px]"
                >
                  Next
                </button>
                <button
                  onClick={() => setRequisitionPage(totalRequisitionPages)}
                  disabled={requisitionPage === totalRequisitionPages}
                  className="px-2.5 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer font-bold text-[10px]"
                >
                  Last
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    )
  )}

        {/* ----------------- TAB 3: AUDIT WORKBENCH (INTERACTIVE REVIEW) ----------------- */}
        {activeTab === "review" && (
          requests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white w-full animate-fade-in">
              <div className="inline-flex items-center justify-center p-4 bg-gray-50 text-gray-400 rounded-full mb-3 border border-gray-100">
                <Scale className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">No procurement activity yet</h3>
              <p className="text-xs text-gray-500 max-w-md mt-1 leading-relaxed">
                No active purchase requisitions are in the audit pipeline. When draft or submitted requests are received, ProcureIQ will automatically evaluate sourcing compliance and compliance rules here.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold px-4 py-2 rounded text-xs cursor-pointer shadow-3xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Purchase Request
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
            
            {/* Left Queue */}
            <div className="w-[380px] border-r border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">
              <div className="p-3 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center shrink-0">
                <span className="text-xs font-extrabold text-[#714B67] uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
                  Audit Queue ({requests.filter(r => r.status === RequestStatus.SUBMITTED || r.status === RequestStatus.UNDER_REVIEW || r.status === RequestStatus.NEEDS_REVISION).length})
                </span>
                <span className="text-[9px] font-mono font-bold bg-amber-50 border border-amber-100 text-amber-800 px-1.5 py-0.2 rounded uppercase">
                  Awaiting Action
                </span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {requests
                  .filter(r => r.status === RequestStatus.SUBMITTED || r.status === RequestStatus.UNDER_REVIEW || r.status === RequestStatus.NEEDS_REVISION)
                  .map(req => {
                    const isSelected = selectedRequest?.id === req.id;
                    return (
                      <div 
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={`p-3.5 cursor-pointer transition-all hover:bg-gray-50 flex flex-col gap-1 ${
                          isSelected ? "bg-[#714B67]/5 border-r-[3px] border-[#714B67]" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-xs font-bold text-gray-900">{req.id}</span>
                            <p className="text-xs font-semibold text-gray-800">{req.itemName}</p>
                          </div>
                          <span className="font-mono text-xs font-bold text-gray-950">₹{req.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1.5 text-[10px]">
                          <span className="text-gray-400 uppercase font-mono tracking-wider font-bold">{req.riskLevel} Risk</span>
                          <WorkflowStatusBadge status={req.status} className="scale-90" />
                        </div>
                      </div>
                    );
                  })}

                {requests.filter(r => r.status === RequestStatus.SUBMITTED || r.status === RequestStatus.UNDER_REVIEW || r.status === RequestStatus.NEEDS_REVISION).length === 0 && (
                  <div className="p-8 text-center text-gray-400 italic text-xs space-y-1">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                    <p className="font-bold text-gray-700">Audit Queue Clear!</p>
                    <p className="text-gray-400">All purchase requests have been processed.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sandbox Detail Card */}
            <div className="flex-1 bg-white overflow-y-auto flex flex-col">
              {selectedRequest ? (
                <div className="p-6 space-y-6 flex-1 max-w-4xl">
                  
                  {/* Requisition Status Trail Tracker */}
                  <div className="bg-gray-50 border border-gray-200/80 rounded-sm p-4 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Enterprise Workflow Tracker</p>
                      <p className="text-xs text-gray-500">Live lifecycle tracking of Odoo requisitions</p>
                    </div>

                    {/* Adaptive Action Buttons based on User Role */}
                    <div className="flex gap-2">
                      {/* 1. Buyer Controls */}
                      {selectedRole === "buyer" && (
                        <>
                          {(selectedRequest.status === RequestStatus.DRAFT || selectedRequest.status === RequestStatus.NEEDS_REVISION) ? (
                            <button
                              onClick={() => triggerWorkflowDialog("approve")}
                              className="px-4 py-1.5 bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs"
                            >
                              Resubmit Requisition
                            </button>
                          ) : (
                            <p className="text-xs text-gray-500 font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-xs">
                              Under Review. Awaiting procurement officer action.
                            </p>
                          )}
                        </>
                      )}

                      {/* 2. Officer Controls */}
                      {selectedRole === "officer" && (
                        <>
                          {selectedRequest.status === RequestStatus.SUBMITTED && (
                            <button
                              onClick={async () => {
                                // Transition to Under Review automatically
                                try {
                                  setIsLoading(true);
                                  await fetch(`/api/requests/${selectedRequest.id}/workflow`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      status: RequestStatus.UNDER_REVIEW,
                                      username: activeUserInfo.name,
                                      role: activeUserInfo.roleLabel
                                    })
                                  });
                                  showNotification(`Requisition ${selectedRequest.id} moved to Under Review.`);
                                  await fetchData();
                                } catch (err) {
                                  showNotification("Failed to transition status.", "error");
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                              className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5f3f56] text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs"
                            >
                              Initialize Audit
                            </button>
                          )}

                          {(selectedRequest.status === RequestStatus.UNDER_REVIEW || selectedRequest.status === RequestStatus.SUBMITTED) && (
                            <>
                              <button 
                                onClick={() => triggerWorkflowDialog("needs_revision")}
                                className="px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 font-bold text-xs rounded transition-all cursor-pointer"
                              >
                                Ask Revision
                              </button>
                              <button 
                                onClick={() => triggerWorkflowDialog("reject")}
                                className="px-3.5 py-1.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-800 font-bold text-xs rounded transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                              <button 
                                onClick={() => triggerWorkflowDialog("approve")}
                                className="px-4 py-1.5 bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs"
                              >
                                Forward to Approval
                              </button>
                            </>
                          )}

                          {selectedRequest.status === RequestStatus.APPROVED && (
                            <button
                              onClick={() => triggerWorkflowDialog("po_created")}
                              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs"
                            >
                              Create Purchase Order (PO)
                            </button>
                          )}

                          {selectedRequest.status === RequestStatus.PO_CREATED && (
                            <button
                              onClick={() => triggerWorkflowDialog("completed")}
                              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs"
                            >
                              Deliver Requisition
                            </button>
                          )}
                        </>
                      )}

                      {/* 3. Dept Head Controls */}
                      {selectedRole === "head" && (
                        <>
                          {selectedRequest.totalAmount < 500000 ? (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => triggerWorkflowDialog("reject")}
                                className="px-3.5 py-1.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-800 font-bold text-xs rounded transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                              <button 
                                onClick={() => triggerWorkflowDialog("approve")}
                                className="px-4 py-1.5 bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs"
                              >
                                Authorize Purchase
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xs font-bold">
                              ₹5L+ limit exceeded. Requires Corporate Finance authorization.
                            </p>
                          )}
                        </>
                      )}

                      {/* 4. Finance Director Controls */}
                      {selectedRole === "manager" && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => triggerWorkflowDialog("reject")}
                            className="px-3.5 py-1.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-800 font-bold text-xs rounded transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => triggerWorkflowDialog("approve")}
                            className="px-4 py-1.5 bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs"
                          >
                            Approve Purchase (₹5L+ authorized)
                          </button>
                        </div>
                      )}

                      {/* 5. Administrator Override */}
                      {selectedRole === "admin" && (
                        <div className="flex gap-1.5">
                          <button onClick={() => triggerWorkflowDialog("needs_revision")} className="px-2.5 py-1 bg-white border border-gray-300 rounded-xs text-[11px] font-bold text-gray-700">Ask Revision</button>
                          <button onClick={() => triggerWorkflowDialog("reject")} className="px-2.5 py-1 bg-white border border-rose-200 rounded-xs text-[11px] font-bold text-rose-700">Reject</button>
                          <button onClick={() => triggerWorkflowDialog("approve")} className="px-3 py-1 bg-[#00A09D] text-white rounded-xs text-[11px] font-bold">Approve</button>
                          <button onClick={() => triggerWorkflowDialog("po_created")} className="px-3 py-1 bg-purple-600 text-white rounded-xs text-[11px] font-bold">PO</button>
                          <button onClick={() => triggerWorkflowDialog("completed")} className="px-3 py-1 bg-teal-600 text-white rounded-xs text-[11px] font-bold">Complete</button>
                        </div>
                      )}
                    </div>
                  </div>



                  {/* Operational indicators details */}
                  <div className="bg-gray-50/20 border border-gray-200 rounded-sm p-5 space-y-4">
                    <div className="border-b border-gray-100 pb-2">
                      <h4 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Division Budget Lockup & Compliance Assessment</h4>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs font-mono font-semibold">
                      <div className="bg-white p-3 border border-gray-200 rounded">
                        <span className="block text-[10px] text-gray-400 uppercase font-sans font-bold">Contract pricing variance</span>
                        <span className={selectedRequest.id === "PR-2026-001" ? "text-rose-600" : "text-emerald-600"}>
                          {selectedRequest.id === "PR-2026-001" ? "+₹35 per sheet (Over contracted)" : "0% Contract Variance"}
                        </span>
                      </div>
                      <div className="bg-white p-3 border border-gray-200 rounded">
                        <span className="block text-[10px] text-gray-400 uppercase font-sans font-bold">Inventory surplus lockup</span>
                        <span className="text-gray-800">
                          {selectedRequest.id === "PR-2026-001" ? "₹28,000 (75 days excess)" : selectedRequest.id === "PR-2026-003" ? "₹5,40,000 (10 mo excess)" : "₹0 (Stock below safety limit)"}
                        </span>
                      </div>
                      <div className="bg-white p-3 border border-gray-200 rounded">
                        <span className="block text-[10px] text-gray-400 uppercase font-sans font-bold">Contract Compliance Savings</span>
                        <span className="text-emerald-600">
                          ₹{(selectedRequest.aiRecommendation?.estimatedSavings || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sourcing Audit Details Panel (The Chatter) */}
                  <div className="border-t border-gray-200 pt-6 space-y-8">
                    
                    {/* Collaboration Thread Panel */}
                    <CollaborationComments
                      requestId={selectedRequest.id}
                      comments={selectedRequest.comments}
                      activeUser={activeUserInfo.name}
                      activeRole={activeUserInfo.roleLabel}
                      onCommentAdded={handleCommentsRefresh}
                    />

                    {/* Document Attachments Panel */}
                    <DocumentAttachments
                      requestId={selectedRequest.id}
                      attachments={selectedRequest.attachments}
                      uploadedBy={activeUserInfo.name}
                      onAttachmentUploaded={handleAttachmentRefresh}
                    />

                    {/* Chronological Activity Feed Panel */}
                    <ActivityTimeline timeline={selectedRequest.timeline} />

                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                  <FileText className="w-12 h-12 mb-2 opacity-50 text-[#714B67]" />
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">No Requisition Selected</p>
                  <p className="text-xs text-gray-500">Select a purchase requisition from the audit queue to view details, timeline comments, and sourcing alternatives.</p>
                </div>
              )}
            </div>

          </div>
        )
      )}

        {/* ----------------- TAB 4: SUPPLIERS ----------------- */}
        {activeTab === "suppliers" && (
          suppliers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white w-full animate-fade-in">
              <div className="inline-flex items-center justify-center p-4 bg-gray-50 text-gray-400 rounded-full mb-3 border border-gray-100">
                <Building className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider font-sans">No suppliers available</h3>
              <p className="text-xs text-gray-500 max-w-md mt-1 leading-relaxed font-sans">
                The vendor master directory is currently empty. This system contains no default supplier files. Please import vendors or connect to your Odoo ERP database to sync.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      const res = await fetch("/api/import/suppliers", { method: "POST" });
                      const data = await res.json();
                      if (data.success) {
                        showNotification("Vendor master directory imported successfully.");
                        await fetchData();
                      } else {
                        showNotification(data.error || "Failed to import suppliers.", "error");
                      }
                    } catch (err) {
                      showNotification("Failed to connect to import server.", "error");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold px-4 py-2 rounded text-xs cursor-pointer shadow-3xs"
                >
                  Import Suppliers
                </button>
                <button
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      const res = await fetch("/api/import/connect-odoo", { method: "POST" });
                      const data = await res.json();
                      if (data.success) {
                        showNotification("Secure connection established. Odoo ERP databases synced.");
                        await fetchData();
                      } else {
                        showNotification(data.error || "Failed to sync Odoo ERP.", "error");
                      }
                    } catch (err) {
                      showNotification("Failed to connect to ERP server.", "error");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold px-4 py-2 rounded text-xs cursor-pointer shadow-3xs"
                >
                  Connect Odoo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden animate-fade-in">
            
            {/* Left Column: Vendor Directory List */}
            <div className="w-[300px] border-r border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">
              <div className="p-3 border-b border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Supplier Directory ({suppliers.length})
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {suppliers.map(sup => {
                  const isSelected = sup.id === selectedSupplierId;
                  const isRestricted = sup.status === SupplierStatus.RESTRICTED;

                  return (
                    <div
                      key={sup.id}
                      onClick={() => setSelectedSupplierId(sup.id)}
                      className={`p-3.5 cursor-pointer transition-all hover:bg-gray-50 ${isSelected ? "bg-[#714B67]/5 border-r-[3px] border-[#714B67]" : ""}`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-semibold text-gray-800">{sup.name}</p>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono border ${
                          isRestricted 
                            ? "bg-rose-50 border-rose-100 text-rose-700" 
                            : sup.status === SupplierStatus.PREFERRED 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                              : "bg-gray-50 border-gray-100 text-gray-700"
                        }`}>
                          {sup.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 mt-2 font-mono">
                        <span>Lead Time: {sup.avgLeadTimeDays} days</span>
                        <span>Rating: {sup.qualityRating.toFixed(1)}/5.0</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Complete Supplier profile view */}
            <div className="flex-1 bg-white overflow-y-auto p-6 space-y-6">
              
              {/* Profile Header */}
              <div className="border-b border-gray-200 pb-5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-gray-400 font-mono tracking-wider font-bold">VENDOR RECORD FILE</span>
                    <h2 className="text-base font-bold text-gray-900 mt-0.5">{currentSupplierRecord.name}</h2>
                    <p className="text-xs text-gray-500 mt-1">Vendor ID: <span className="font-mono font-semibold">{currentSupplierRecord.id}</span> | Contract Expiry: {getSupplierContractExpiry(currentSupplierRecord.id)}</p>
                  </div>

                  <span className={`text-xs px-2.5 py-1 rounded font-bold border uppercase font-mono ${
                    currentSupplierRecord.status === SupplierStatus.PREFERRED 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : currentSupplierRecord.status === SupplierStatus.RESTRICTED
                        ? "bg-rose-50 border-rose-200 text-rose-700"
                        : "bg-gray-50 border-gray-200 text-gray-700"
                  }`}>
                    {currentSupplierRecord.status} Vendor
                  </span>
                </div>
              </div>

              {/* Vendor General Info Table */}
              <div className="grid grid-cols-2 gap-6">
                
                {/* General & Contract Info */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded text-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">General Information & Contracts</h3>
                  <table className="w-full text-xs text-left border-collapse space-y-2">
                    <tbody>
                      <tr className="border-b border-gray-200/60">
                        <td className="py-2 text-gray-400">Baseline Unit Price:</td>
                        <td className="py-2 font-mono font-bold text-gray-800">₹{currentSupplierRecord.avgPricePerUnit}/unit</td>
                      </tr>
                      <tr className="border-b border-gray-200/60">
                        <td className="py-2 text-gray-400">Average Lead Time:</td>
                        <td className="py-2 font-semibold text-gray-800">{currentSupplierRecord.avgLeadTimeDays} Days</td>
                      </tr>
                      <tr className="border-b border-gray-200/60">
                        <td className="py-2 text-gray-400">Quality Index Rating:</td>
                        <td className="py-2 font-semibold text-gray-800">{currentSupplierRecord.qualityRating.toFixed(1)} / 5.0</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-400">Contract End Date:</td>
                        <td className="py-2 font-semibold text-gray-800">{getSupplierContractExpiry(currentSupplierRecord.id)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Performance Metrics Summary Card */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Delivery Performance Summary</h3>
                    <div className="flex items-baseline gap-2 text-xs">
                      <span className="text-3xl font-extrabold text-gray-800 font-mono">{currentSupplierRecord.deliveryPerformance}%</span>
                      <span className="text-gray-500">On-Time Shipments</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 text-xs">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Approved Category Offerings</p>
                    <p className="text-gray-700 font-semibold">{getSupplierProducts(currentSupplierRecord.id).join(", ")}</p>
                  </div>
                </div>

              </div>

              {/* Purchase History Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Past Purchase History Trail</h3>
                <div className="border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold font-mono">
                        <th className="p-3">Purchase Order (PO)</th>
                        <th className="p-3">Issue Date</th>
                        <th className="p-3">Procurement Item</th>
                        <th className="p-3">Total Cost</th>
                        <th className="p-3">ERP Delivery Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getSupplierPurchaseHistory(currentSupplierRecord.id).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-400 italic">No past purchase histories registered for this vendor profile.</td>
                        </tr>
                      ) : (
                        getSupplierPurchaseHistory(currentSupplierRecord.id).map(hist => (
                          <tr key={hist.po} className="hover:bg-gray-50/50 font-mono">
                            <td className="p-3 font-bold text-gray-800">{hist.po}</td>
                            <td className="p-3">{hist.date}</td>
                            <td className="p-3 font-sans font-medium text-gray-700">{hist.item}</td>
                            <td className="p-3 font-bold text-gray-950">₹{hist.total.toLocaleString()}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                hist.status.includes("Delayed") ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                              }`}>{hist.status}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )
      )}

        {/* ----------------- TAB 5: INVENTORY ----------------- */}
        {activeTab === "inventory" && (
          inventory.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white w-full animate-fade-in">
              <div className="inline-flex items-center justify-center p-4 bg-gray-50 text-gray-400 rounded-full mb-3 border border-gray-100">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider font-sans">No inventory records</h3>
              <p className="text-xs text-gray-500 max-w-md mt-1 leading-relaxed font-sans">
                Inventory balance registers have not been imported. Load active stock limits, buffer points, and warehouse metrics to enable automated surplus checks.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      const res = await fetch("/api/import/inventory", { method: "POST" });
                      const data = await res.json();
                      if (data.success) {
                        showNotification("Warehouse inventory master imported successfully.");
                        await fetchData();
                      } else {
                        showNotification(data.error || "Failed to import inventory.", "error");
                      }
                    } catch (err) {
                      showNotification("Failed to connect to import server.", "error");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold px-4 py-2 rounded text-xs cursor-pointer shadow-3xs"
                >
                  Import Inventory
                </button>
                <button
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      const res = await fetch("/api/import/connect-odoo", { method: "POST" });
                      const data = await res.json();
                      if (data.success) {
                        showNotification("Secure connection established. Odoo ERP databases synced.");
                        await fetchData();
                      } else {
                        showNotification(data.error || "Failed to sync Odoo ERP.", "error");
                      }
                    } catch (err) {
                      showNotification("Failed to connect to ERP server.", "error");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold px-4 py-2 rounded text-xs cursor-pointer shadow-3xs"
                >
                  Connect Odoo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">
            
            {/* Top Toolbar filters */}
            <div className="flex items-center justify-between gap-4 bg-white p-4 border border-gray-200 rounded shadow-3xs">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 font-bold uppercase mr-2 flex items-center gap-1"><Sliders className="w-3.5 h-3.5" /> Warehouse Drill-down:</span>
                <select
                  value={inventoryWarehouse}
                  onChange={(e) => setInventoryWarehouse(e.target.value)}
                  className="bg-white border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="all">All Warehouses</option>
                  <option value="Jaipur (North) Warehouse">Jaipur (North) Warehouse</option>
                  <option value="Pune (West) Warehouse">Pune (West) Warehouse</option>
                  <option value="Chennai (South) Warehouse">Chennai (South) Warehouse</option>
                </select>

                <div className="flex items-center bg-gray-50 border border-gray-200 rounded px-2.5 py-1 w-60 ml-2">
                  <Search className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                  <input
                    type="text"
                    placeholder="Search SKU or description..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="bg-transparent border-none text-xs focus:outline-none w-full"
                  />
                  {inventorySearch && <X className="w-3 h-3 text-gray-400 cursor-pointer" onClick={() => setInventorySearch("")} />}
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                <span>Active Stock Keepings: {sortedAndFilteredInventory.length} SKUs</span>
              </div>
            </div>

            {/* Structured Inventory Table */}
            <div className="border border-gray-200 rounded shadow-3xs overflow-hidden bg-white">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold font-mono">
                    <th className="p-3 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleInventorySort("id")}>
                      <div className="flex items-center gap-1">SKU Reference <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleInventorySort("itemName")}>
                      <div className="flex items-center gap-1">Item Description <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3">Warehouse Stocking Point</th>
                    <th className="p-3 cursor-pointer select-none hover:bg-gray-100" onClick={() => handleInventorySort("quantityInStock")}>
                      <div className="flex items-center gap-1">Units In Stock <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3">Safety Reorder Point</th>
                    <th className="p-3">Monthly Consumption</th>
                    <th className="p-3">Operational Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {sortedAndFilteredInventory.map(item => {
                    const isLow = item.quantityInStock <= item.reorderPoint;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/40">
                        <td className="p-3 font-bold text-gray-800">{item.id}</td>
                        <td className="p-3 font-sans font-semibold text-gray-700">{item.itemName}</td>
                        <td className="p-3 font-sans text-gray-500">{item.warehouse}</td>
                        <td className="p-3 font-bold">
                          {adjustingItemId === item.id ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={adjustQtyInput}
                                onChange={(e) => setAdjustQtyInput(Number(e.target.value))}
                                className="w-20 bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-800 focus:outline-none focus:border-[#714B67]"
                                autoFocus
                              />
                              <button
                                onClick={async () => {
                                  try {
                                    setIsLoading(true);
                                    const res = await fetch(`/api/inventory/${item.id}/adjust`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        quantity: adjustQtyInput,
                                        username: activeUserInfo.name,
                                        role: activeUserInfo.roleLabel
                                      })
                                    });
                                    if (res.ok) {
                                      showNotification(`SKU ${item.id} adjusted to ${adjustQtyInput} successfully.`, "success");
                                      await fetchData();
                                    } else {
                                      showNotification("Failed to adjust inventory stock.", "error");
                                    }
                                  } catch (err) {
                                    showNotification("Failed to communicate with ERP server.", "error");
                                  } finally {
                                    setAdjustingItemId(null);
                                    setIsLoading(false);
                                  }
                                }}
                                className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded cursor-pointer transition-colors"
                                title="Save Adjustment"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setAdjustingItemId(null)}
                                className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded cursor-pointer transition-colors"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={isLow ? "text-rose-600 font-bold" : "text-gray-800 font-semibold"}>
                                {item.quantityInStock} {item.unit}
                              </span>
                              {(selectedRole === "warehouse" || selectedRole === "admin") && (
                                <button
                                  onClick={() => {
                                    setAdjustingItemId(item.id);
                                    setAdjustQtyInput(item.quantityInStock);
                                  }}
                                  className="p-0.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-100 rounded transition-all cursor-pointer"
                                  title="Quick Adjust Stock"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">{item.reorderPoint} {item.unit}</td>
                        <td className="p-3 text-gray-500">{item.monthlyConsumption} {item.unit} / mo</td>
                        <td className="p-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isLow ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>{isLow ? "Refill Needed" : "Optimal Stock"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Odoo Enterprise Style Incoming Shipments Panel */}
            <div className="space-y-3.5 pt-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#714B67]" />
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider font-sans">Incoming Shipments & Receipts (Procurement POs)</h3>
                </div>
                <span className="text-xs bg-[#714B67]/10 text-[#714B67] px-2.5 py-0.5 rounded-full font-bold font-mono">
                  {requests.filter(r => r.status === RequestStatus.PO_CREATED).length} Pending Receipts
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded shadow-3xs overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold font-mono">
                      <th className="p-3">Source Document (PO)</th>
                      <th className="p-3">Item Description</th>
                      <th className="p-3">Dest Warehouse</th>
                      <th className="p-3">Quantity ordered</th>
                      <th className="p-3">Expected Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {requests
                      .filter(r => r.status === RequestStatus.PO_CREATED || r.status === RequestStatus.COMPLETED)
                      .map(req => {
                        const isCompleted = req.status === RequestStatus.COMPLETED;
                        const destWarehouse = req.itemName.includes("Steel") ? "Jaipur (North) Warehouse" : "Pune (West) Warehouse";
                        return (
                          <tr key={req.id} className="hover:bg-gray-50/40">
                            <td className="p-3 font-bold text-[#714B67]">{req.id}</td>
                            <td className="p-3 font-sans font-semibold text-gray-700">{req.itemName}</td>
                            <td className="p-3 font-sans text-gray-500">{destWarehouse}</td>
                            <td className="p-3 font-bold text-gray-800">{req.quantity} units</td>
                            <td className="p-3 text-gray-400">{req.expectedDeliveryDate ? new Date(req.expectedDeliveryDate).toLocaleDateString() : "TBD"}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isCompleted ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}>
                                {isCompleted ? "Received" : "Awaiting Goods"}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {isCompleted ? (
                                <span className="text-gray-400 text-[11px] font-sans">Stock Synced</span>
                              ) : (
                                <button
                                  onClick={async () => {
                                    if (selectedRole !== "warehouse" && selectedRole !== "admin") {
                                      showNotification("Access Denied: Only Warehouse Operations Manager can receive shipments.", "error");
                                      return;
                                    }
                                    try {
                                      setIsLoading(true);
                                      const res = await fetch(`/api/requests/${req.id}/receive`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          username: activeUserInfo.name,
                                          role: activeUserInfo.roleLabel
                                        })
                                      });
                                      if (res.ok) {
                                        showNotification(`Shipment for ${req.id} received and stock updated.`, "success");
                                        await fetchData();
                                      } else {
                                        showNotification("Failed to log receipt.", "error");
                                      }
                                    } catch (err) {
                                      showNotification("Communication failure with Odoo server.", "error");
                                    } finally {
                                      setIsLoading(false);
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-sm transition-all cursor-pointer ${
                                    (selectedRole === "warehouse" || selectedRole === "admin")
                                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                      : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                  }`}
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Receive Products</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {requests.filter(r => r.status === RequestStatus.PO_CREATED || r.status === RequestStatus.COMPLETED).length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-400 italic font-sans">No pending shipments or received orders registered. Check your Purchase Orders.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )
      )}

        {/* ----------------- TAB 6: REPORTS ----------------- */}
        {activeTab === "reports" && (
          requests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white w-full animate-fade-in">
              <div className="inline-flex items-center justify-center p-4 bg-gray-50 text-gray-400 rounded-full mb-3 border border-gray-100">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider font-sans">No reports generated</h3>
              <p className="text-xs text-gray-500 max-w-md mt-1 leading-relaxed font-sans">
                Procurement analytics will appear after purchasing activity. Add active vendor requisitions and submit them to render budget spend trends, compliance indexes, and audit timelines.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold px-4 py-2 rounded text-xs cursor-pointer shadow-3xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Purchase Request
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">
            
            {/* Banner */}
            <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs flex justify-between items-center">
              <div className="space-y-0.5">
                <h1 className="text-base font-bold text-gray-900 font-sans">Operational Analytics & Spend Reports</h1>
                <p className="text-gray-500 text-xs font-sans">Standard corporate reports on procurement volumes, vendor ratings, and savings outcomes.</p>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider block">YTD Purchase Volume:</span>
                <span className="text-xl font-mono font-bold text-gray-800 block mt-1">₹1.17 Crore</span>
                <span className="text-[10px] text-gray-500 font-sans">Total Odoo approved allocations</span>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider block">Audit Leakage Protection:</span>
                <span className="text-xl font-mono font-bold text-emerald-600 block mt-1">₹{totalCostReductions.toLocaleString()}</span>
                <span className="text-[10px] text-gray-500 font-sans">Saved via quantity & price adjustments</span>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider block">Avg Approval Cycle Time:</span>
                <span className="text-xl font-mono font-bold text-gray-800 block mt-1">4.2 Hours</span>
                <span className="text-[10px] text-gray-500 font-sans">From creation to final PO state</span>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded shadow-3xs text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider block">Active Vendor Coverage:</span>
                <span className="text-xl font-mono font-bold text-[#714B67] block mt-1">{suppliers.length} Vendors</span>
                <span className="text-[10px] text-gray-500 font-sans">6 active agreements registered</span>
              </div>
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-2 gap-6">
              
              <div className="p-5 bg-white border border-gray-200 rounded shadow-3xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 font-mono">Monthly Procurement Spend Profile</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlySpendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickFormatter={(v) => `₹${v / 100000}L`} />
                      <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} contentStyle={{ fontSize: "11px" }} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                      <Line type="monotone" dataKey="Total Spend" stroke="#714B67" strokeWidth={2} name="Proposed Requisitions" />
                      <Line type="monotone" dataKey="Cost Reduction" stroke="#10b981" strokeWidth={1.5} name="Optimized Savings" strokeDasharray="4 4" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-5 bg-white border border-gray-200 rounded shadow-3xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 font-mono">Vendor On-Time Shipments vs Quality Rating</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vendorPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={9} />
                      <Tooltip contentStyle={{ fontSize: "11px" }} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                      <Bar dataKey="Delivery Reliability (%)" fill="#714B67" barSize={12} name="Delivery Performance (%)" />
                      <Bar dataKey="Quality Score (x20)" fill="#00A09D" barSize={12} name="Quality Score (x20)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department Allocation Progress Bars */}
              <div className="p-5 bg-white border border-gray-200 rounded shadow-3xs col-span-2 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">Active Spend Allocation by Department</h3>
                <div className="space-y-3.5">
                  {deptChartData.map(item => {
                    const valueNum = Number(item.value);
                    const percent = totalSpendPipeline > 0 ? (valueNum / totalSpendPipeline) * 100 : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-gray-700">{item.name}</span>
                          <span className="font-mono text-gray-500">₹{valueNum.toLocaleString()} ({percent.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#714B67] h-full rounded-full" 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )
      )}

        {/* ----------------- TAB 7: SETTINGS ----------------- */}
        {activeTab === "settings" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl animate-fade-in">
            
            <div className="bg-white border border-gray-200 rounded shadow-3xs p-5 space-y-5">
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">ProcureIQ Module Parameters</h2>
              
              <div className="space-y-4 text-xs">
                
                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-gray-500 font-semibold">ERP Corporate Identifier:</label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    className="col-span-2 bg-white border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#714B67]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-gray-500 font-semibold">Standard Currency Type:</label>
                  <input
                    type="text"
                    disabled
                    value={settings.currency}
                    className="col-span-2 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-gray-400 cursor-not-allowed font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-gray-500 font-semibold">Reorder Safety Stock (Days):</label>
                  <input
                    type="number"
                    value={settings.safetyStockThreshold}
                    onChange={(e) => setSettings({ ...settings, safetyStockThreshold: parseInt(e.target.value) || 15 })}
                    className="col-span-2 bg-white border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#714B67] font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <label className="text-gray-500 font-semibold">Automatic Intercept Level (₹):</label>
                  <input
                    type="number"
                    value={settings.requireExplanationAbove}
                    onChange={(e) => setSettings({ ...settings, requireExplanationAbove: parseInt(e.target.value) || 100000 })}
                    className="col-span-2 bg-white border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#714B67] font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 items-center pt-3 border-t border-gray-100">
                  <label className="text-gray-500 font-semibold">Purchase Intercept Strategy:</label>
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoflag"
                      checked={settings.autoFlagHighRisk}
                      onChange={(e) => setSettings({ ...settings, autoFlagHighRisk: e.target.checked })}
                      className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67]"
                    />
                    <label htmlFor="autoflag" className="text-gray-600 font-medium">Auto-flag restricted suppliers and inventory surplus</label>
                  </div>
                </div>

              </div>

              <div className="pt-3 flex justify-end">
                <button 
                  onClick={() => showNotification("ERP Parameters updated and saved.")}
                  className="px-4 py-1.5 bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs"
                >
                  Save Configuration
                </button>
              </div>
            </div>

            {/* ENTERPRISE WORKSPACE TEAM DIRECTORY */}
            <div className="bg-white border border-gray-200 rounded shadow-3xs p-5 space-y-5">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#00A09D]" />
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Workspace Team Directory</h2>
                    <p className="text-[10px] text-gray-500 font-medium">Tenant ID: <span className="font-mono font-bold text-[#00A09D]">{company?.id || 'Multi-Tenant isolated'}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {teamMembers.length} Seat(s) Allocated
                  </span>
                  {pendingInvitations.length > 0 && (
                    <span className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#714B67]/10 text-[#714B67] border border-[#714B67]/20">
                      {pendingInvitations.length} Pending Invite(s)
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Configure corporate seat allocations, assign role-based access control, adjust business departments, or revoke login seats. Changes synchronize immediately with your isolated multi-tenant registry.
              </p>

              {/* SECTION: INVITE MEMBER (Only authorized for owners and admins) */}
              {(dbUser?.role === "owner" || dbUser?.role === "admin") ? (
                <div className="p-4 bg-slate-50 border border-slate-150 rounded space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-[#00A09D]" />
                    <span>Invite Employee</span>
                  </h3>
                  <form onSubmit={handleSendInvite} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          placeholder="John Doe"
                          className="pl-8 w-full bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00A09D]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company Email</label>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="john.doe@company.com"
                          className="pl-8 w-full bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00A09D]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</label>
                      <input
                        type="text"
                        required
                        value={inviteDept}
                        onChange={(e) => setInviteDept(e.target.value)}
                        placeholder="e.g. Procurement, Logistics"
                        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#00A09D]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00A09D] font-medium"
                      >
                        <option value="owner">Company Owner</option>
                        <option value="admin">Administrator</option>
                        <option value="officer">Procurement Officer</option>
                        <option value="manager">Manager</option>
                        <option value="auditor">Auditor</option>
                        <option value="viewer">Viewer</option>
                        <option value="buyer">Authorized Buyer</option>
                        <option value="head">Manufacturing Head</option>
                        <option value="warehouse">Warehouse Manager</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Permission Level</label>
                      <select
                        value={invitePermission}
                        onChange={(e) => setInvitePermission(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00A09D] font-medium"
                      >
                        <option value="Read-Only">Read-Only</option>
                        <option value="Standard">Standard Access</option>
                        <option value="Elevated">Elevated Access</option>
                        <option value="Full Admin">Full Administrative Access</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Initial Account Password</label>
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={invitePassword}
                          onChange={(e) => setInvitePassword(e.target.value)}
                          placeholder="Password"
                          className="pl-8 w-full bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#00A09D]"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-3 pt-1">
                      <button
                        type="submit"
                        disabled={isSendingInvite}
                        className="w-full bg-[#00A09D] hover:bg-[#008f8c] disabled:opacity-50 text-white font-bold py-2 rounded transition-all flex items-center justify-center gap-1 cursor-pointer font-sans text-xs uppercase tracking-wider"
                      >
                        {isSendingInvite ? "Creating account..." : "Create Real Account & Invite Employee"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded text-[11px] text-amber-800 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Your current clearance role (<strong className="capitalize">{dbUser?.role || 'user'}</strong>) is not authorized to modify workspace memberships. Only **owners** or **system administrators** may dispatch invitations, disable accounts, or adjust security clearance.
                  </span>
                </div>
              )}

              {/* LIST: ACTIVE MEMBERS */}
              <div className="space-y-3.5 pt-2">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Active Workspace Seats</h3>
                {isTeamLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 italic py-4 justify-center">
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-[#00A09D] rounded-full animate-spin"></span>
                    <span>Querying workspace directory...</span>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-3 text-center">No active seats found.</p>
                ) : (
                  <div className="border border-gray-150 rounded overflow-hidden divide-y divide-gray-150 bg-slate-50/50">
                    {teamMembers.map((member) => {
                      const isSelf = member.uid === dbUser?.uid;
                      const isEditing = editingUserId === member.id;
                      const canManage = (dbUser?.role === "owner" || dbUser?.role === "admin") && !isSelf && member.role !== "owner";

                      return (
                        <div key={member.id} className="p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
                          <div className="space-y-1 max-w-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800">{member.name || 'Invited User'}</span>
                              {isSelf && (
                                <span className="bg-[#00A09D]/10 text-[#00A09D] border border-[#00A09D]/20 px-1 rounded text-[9px] font-extrabold uppercase">
                                  You
                                </span>
                              )}
                              {member.isDisabled && (
                                <span className="bg-rose-100 text-rose-700 border border-rose-200 px-1 rounded text-[9px] font-extrabold uppercase">
                                  DISABLED
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-gray-500 text-[10px] truncate">{member.email}</div>
                            <div className="text-gray-400 text-[10px]">Joined {new Date(member.createdAt).toLocaleDateString()}</div>
                          </div>

                          {isEditing ? (
                            <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded border border-gray-200">
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold text-gray-400 uppercase">Role</label>
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value)}
                                  className="bg-white border border-gray-200 rounded px-1.5 py-1 text-xs font-semibold focus:outline-none"
                                >
                                  <option value="buyer">Buyer</option>
                                  <option value="officer">Officer</option>
                                  <option value="head">Dept Head</option>
                                  <option value="manager">Finance Director</option>
                                  <option value="admin">System Admin</option>
                                  <option value="warehouse">Warehouse Manager</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold text-gray-400 uppercase">Department</label>
                                <input
                                  type="text"
                                  value={editDept}
                                  onChange={(e) => setEditDept(e.target.value)}
                                  className="bg-white border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none w-32"
                                />
                              </div>
                              <div className="flex items-end gap-1 pt-4">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMemberRole(member.id)}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors cursor-pointer"
                                  title="Save clearance role"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
                                  className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded transition-colors cursor-pointer"
                                  title="Cancel changes"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                                  member.role === "owner"
                                    ? "bg-[#714B67]/10 text-[#714B67] border-[#714B67]/20"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}>
                                  {member.role}
                                </span>
                                <div className="text-[10px] text-gray-500 font-semibold mt-0.5">{member.department || 'Corporate'}</div>
                              </div>

                              {canManage && (
                                <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUserId(member.id);
                                      setEditRole(member.role);
                                      setEditDept(member.department || "");
                                    }}
                                    className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-[#00A09D] rounded transition-colors cursor-pointer"
                                    title="Edit seat roles"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemberStatus(member.id, member.isDisabled)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                      member.isDisabled
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200"
                                        : "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
                                    }`}
                                    title={member.isDisabled ? "Enable Workspace Seat" : "Revoke/Disable Workspace Seat"}
                                  >
                                    {member.isDisabled ? "Enable" : "Disable"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMember(member.id)}
                                    className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                    title="Terminate Seat"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LIST: PENDING INVITATIONS */}
              {pendingInvitations.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#714B67]" />
                    <span>Pending Invitations ({pendingInvitations.length})</span>
                  </h3>
                  <div className="border border-[#714B67]/15 rounded divide-y divide-[#714B67]/10 bg-[#714B67]/5">
                    {pendingInvitations.map((invite) => (
                      <div key={invite.id} className="p-3 flex items-center justify-between gap-3 text-xs animate-fade-in">
                        <div>
                          <div className="font-semibold text-slate-850">{invite.email}</div>
                          <div className="text-[10px] text-[#714B67] font-bold uppercase">{invite.role} • {invite.department}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-[#714B67] uppercase bg-[#714B67]/5 px-1.5 py-0.5 rounded border border-[#714B67]/10">
                            Awaiting Setup
                          </span>
                          {(dbUser?.role === "owner" || dbUser?.role === "admin") && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(invite.id)}
                              className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              title="Revoke Invitation"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ENTERPRISE APPEARANCE SETTINGS */}
            <div className="bg-white border border-gray-200 rounded shadow-3xs p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                {isDarkMode ? <Moon className="w-4 h-4 text-[#714B67]" /> : <Sun className="w-4 h-4 text-[#714B67]" />}
                <h2 className="text-base font-bold text-gray-900">Corporate Interface Appearance</h2>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Customize the local workspace rendering theme to reduce eye strain in high-frequency procurement audits. Preferences are saved automatically.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setIsDarkMode(false);
                    showNotification("Standard Daylight Mode Activated.", "success");
                  }}
                  className={`p-4 border rounded flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${!isDarkMode ? "border-[#00A09D] bg-indigo-50/5 text-[#00A09D] ring-1 ring-[#00A09D]/10" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}
                >
                  <Sun className="w-6 h-6 text-amber-500" />
                  <div className="text-center">
                    <p className="text-xs font-bold">Standard Light Mode</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">High contrast daylight readability</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsDarkMode(true);
                    showNotification("Corporate Slate Dark Mode Activated.", "success");
                  }}
                  className={`p-4 border rounded flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${isDarkMode ? "border-[#00A09D] bg-indigo-50/5 text-[#00A09D] ring-1 ring-[#00A09D]/10" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}
                >
                  <Moon className="w-6 h-6 text-[#00A09D]" />
                  <div className="text-center">
                    <p className="text-xs font-bold">Slate Dark Mode</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Reduced eye fatigue night-shift theme</p>
                  </div>
                </button>
              </div>
            </div>

            {/* DATASTORE CONTROLS CARD */}
            <div className="bg-white border border-gray-200 rounded shadow-3xs p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Sliders className="w-4 h-4 text-[#714B67]" />
                <h2 className="text-base font-bold text-gray-900">System Datastore Controls</h2>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Manage database tables and ERP synchronization. Use these controls to purge active transactions or synchronize live master tables from your Odoo ERP system.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 border border-gray-150 rounded space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Empty State (Evaluation State)</h4>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                      Removes all transactional data, suppliers, inventory metrics, audit comments, and notifications from the database. Reverts ProcureIQ to a clean, empty state.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to purge all active transactions and revert the application to a clean slate?")) {
                        try {
                          setIsLoading(true);
                          const res = await fetch("/api/reset", { method: "POST" });
                          const data = await res.json();
                          if (data.success) {
                            showNotification("System purged. All transactional databases cleared.", "success");
                            await fetchData();
                          } else {
                            showNotification(data.error || "Failed to reset.", "error");
                          }
                        } catch (err) {
                          showNotification("Failed to communicate with reset server.", "error");
                        } finally {
                          setIsLoading(false);
                        }
                      }
                    }}
                    className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded transition-all cursor-pointer text-center font-semibold"
                  >
                    Reset to Empty Slate
                  </button>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-150 rounded space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">ERP Baseline Seeding</h4>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                      Establishes a secure connection with the core Odoo ERP database. Synchronizes standard enterprise vendors, inventory SKU balances, and pre-negotiated base pricing agreements.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setIsLoading(true);
                        const res = await fetch("/api/import/connect-odoo", { method: "POST" });
                        const data = await res.json();
                        if (data.success) {
                          showNotification("Secure connection established. Odoo ERP databases synced.", "success");
                          await fetchData();
                        } else {
                          showNotification(data.error || "Failed to sync ERP databases.", "error");
                        }
                      } catch (err) {
                        showNotification("Failed to connect to ERP server.", "error");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="w-full py-1.5 bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold text-xs rounded transition-all cursor-pointer text-center font-semibold"
                  >
                    Sync Odoo ERP Database
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ----------------- DIALOG 1: CREATE REQUISITION FORM ----------------- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 rounded shadow-lg max-w-xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase">New Odoo Purchase Requisition</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Item SKU Name:</label>
                  <select
                    value={newRequest.itemName}
                    onChange={(e) => {
                      const sel = e.target.value;
                      let price = 350;
                      let supId = "SUP-001";
                      if (sel.includes("Microprocessor")) {
                        price = 1200;
                        supId = "SUP-004";
                      } else if (sel.includes("Hydraulic")) {
                        price = 450;
                        supId = "SUP-005";
                      }
                      setNewRequest({ ...newRequest, itemName: sel, unitPrice: price, supplierId: supId });
                    }}
                    className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="Raw Material Steel Sheet (12mm)">Raw Material Steel Sheet (12mm)</option>
                    <option value="Microprocessor Chip X1">Microprocessor Chip X1</option>
                    <option value="Hydraulic Fluid XL">Hydraulic Fluid XL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Target Department:</label>
                  <select
                    value={newRequest.department}
                    onChange={(e) => setNewRequest({ ...newRequest, department: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="Manufacturing">Manufacturing Division</option>
                    <option value="Research & Development">Research & Development</option>
                    <option value="Maintenance Operations">Maintenance Operations</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Requisition Quantity:</label>
                  <input
                    type="number"
                    value={newRequest.quantity}
                    onChange={(e) => setNewRequest({ ...newRequest, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Unit Price (₹):</label>
                  <input
                    type="number"
                    disabled
                    value={newRequest.unitPrice}
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-gray-400 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-500 font-semibold mb-1">Proposed Supplier Assignment:</label>
                <select
                  value={newRequest.supplierId}
                  onChange={(e) => setNewRequest({ ...newRequest, supplierId: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 font-semibold mb-1">Requisition Description / Purpose:</label>
                <textarea
                  rows={2}
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none"
                  placeholder="Justify division requisition requirements..."
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-100 cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#00A09D] hover:bg-[#008f8c] text-white font-bold rounded cursor-pointer"
                >
                  Create & Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- DIALOG 2: INTERACTIVE WORKFLOW DIALOG ----------------- */}
      {isApprovalDialogOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 rounded shadow-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[#714B67]" />
                Commit Workflow Transition
              </h3>
              <button onClick={() => setIsApprovalDialogOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono space-y-1">
                <div className="flex justify-between font-bold text-gray-800">
                  <span>Requisition: {selectedRequest.id}</span>
                  <span className="text-[#714B67]">Value: ₹{selectedRequest.totalAmount.toLocaleString()}</span>
                </div>
                <p className="text-gray-500 text-[11px] font-sans">Item: {selectedRequest.itemName}</p>
                <p className="text-[11px] text-gray-600 font-sans">Transitioning to State: <span className="font-bold capitalize text-[#714B67]">{approvalType.replace('_', ' ')}</span></p>
              </div>

              {/* Advanced Parameters for Workflow Transition */}
              {approvalType === "approve" && (
                <div className="grid grid-cols-2 gap-3.5 border-t border-b border-gray-100 py-3">
                  <div>
                    <label className="block text-gray-500 font-bold mb-1">Set Priority:</label>
                    <select
                      value={workflowPriority}
                      onChange={(e) => setWorkflowPriority(e.target.value as any)}
                      className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 font-semibold text-gray-700"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-500 font-bold mb-1">Expected Delivery Date:</label>
                    <input
                      type="date"
                      value={workflowDeliveryDate}
                      onChange={(e) => setWorkflowDeliveryDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 font-semibold text-gray-700 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-500 font-bold mb-1">Internal Sourcing Instructions:</label>
                    <input
                      type="text"
                      placeholder="e.g. Route via priority air freight, utilize corporate supplier discount code..."
                      value={workflowInstructions}
                      onChange={(e) => setWorkflowInstructions(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 text-gray-700"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-gray-500 font-bold mb-1">
                  {approvalType === "needs_revision" ? "Revision Instructions (Sent to Buyer):" : 
                   approvalType === "reject" ? "Reason for Rejection:" : 
                   "Corporate Audit Justification:"}
                </label>
                <textarea
                  rows={3}
                  value={explanationText}
                  onChange={(e) => setExplanationText(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded p-2.5 focus:outline-none focus:border-[#714B67] text-gray-800 leading-relaxed font-sans"
                  placeholder="Justification notes..."
                />
              </div>

              <p className="text-[10px] text-gray-400 italic">
                Note: This transition is signed by {activeUserInfo.name} ({activeUserInfo.roleLabel}) and committed to Odoo audit trails.
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsApprovalDialogOpen(false)}
                className="px-3.5 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-100 cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={commitWorkflowState}
                className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5f3f56] text-white font-bold rounded cursor-pointer"
              >
                Confirm State Transition
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
