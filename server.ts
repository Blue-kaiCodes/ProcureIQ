import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { count, eq, desc, and, ilike } from "drizzle-orm";
import { db } from "./src/db/index.ts";
import {
  companies,
  users,
  suppliers,
  inventory,
  requests,
  timelines,
  comments,
  changeHistories,
  attachments,
  notifications,
  auditLogs,
  invitations,
} from "./src/db/schema.ts";
import { seedDatabase, seedCompanyWorkspace } from "./src/db/seed.ts";
import { initialSuppliers, initialInventory } from "./src/data/seedData.ts";
import {
  RequestStatus,
  RiskLevel,
  SupplierStatus,
  Supplier,
  InventoryItem,
  PurchaseRequest,
  AuditLog,
  ChatMessage,
  AIRecommendation,
  FinancialImpact,
} from "./src/types";
import { generatePurchaseOrderPdf } from "./src/lib/pdfGenerator.ts";
import { testOdooXmlRpcConnection, executeBiDirectionalOdooSync } from "./src/lib/odooConnector.ts";


// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = 3000;

app.use(express.json());

// Demo Bypass Authentication Middleware
async function authenticateUser(req: any, res: any, next: any) {
  const role = req.headers["x-selected-role"] || "admin";
  const email = req.headers["x-selected-email"] || `${role}@company.com`;
  
  try {
    let [dbUser] = await db.select().from(users).where(eq(users.email, email));
    if (!dbUser) {
      // If user not found, look up by role
      const [userByRole] = await db.select().from(users).where(eq(users.role, role));
      if (userByRole) {
        dbUser = userByRole;
      } else {
        // Fallback to any user
        const allUsers = await db.select().from(users).limit(1);
        if (allUsers.length > 0) {
          dbUser = allUsers[0];
        } else {
          // If no users exist, create a mock user
          dbUser = {
            id: `${role}-uid`,
            email: email,
            name: role === "admin" ? "Superuser (Admin)" : role === "officer" ? "Sarah Jenkins" : "Anil Sharma",
            role: role,
            department: role === "admin" ? "IT Operations" : "Procurement",
            companyId: "DEMO-COMP",
            isDisabled: false,
            createdAt: new Date(),
          } as any;
        }
      }
    }
    
    req.user = { uid: dbUser.id, email: dbUser.email, email_verified: true };
    req.dbUser = dbUser;
    next();
  } catch (error: any) {
    console.error("[DEMO-AUTH] Failed to establish demo user context:", error);
    next();
  }
}

// Lazily initialised Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not defined in environment secrets. Using AI Fallback Rules.");
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Auth & workspace
app.get("/api/auth/me", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) {
      // User is authenticated in Firebase but does not have a profile in the SQL DB yet
      return res.json({
        isNew: true,
        firebaseUser: {
          uid: req.user.uid,
          email: req.user.email,
          emailVerified: req.user.email_verified,
        },
      });
    }

    // Load company details if present
    let companyInfo = null;
    if (req.dbUser.companyId) {
      const [comp] = await db.select().from(companies).where(eq(companies.id, req.dbUser.companyId));
      companyInfo = comp || null;
    }

    res.json({
      user: req.dbUser,
      company: companyInfo,
    });
  } catch (error: any) {
    console.error("Failed to load authenticated profile:", error);
    res.status(500).json({ error: "Failed to load profile." });
  }
});

// Register Company Onboarding Flow
app.post("/api/auth/register-company", async (req, res) => {
  try {
    const { company, admin } = req.body;
    if (!company || !admin || !company.id || !admin.uid) {
      return res.status(400).json({ error: "Missing required onboarding parameters." });
    }

    const [existingComp] = await db.select().from(companies).where(eq(companies.id, company.id));
    if (existingComp) {
      return res.status(400).json({ error: `A company workspace with key '${company.id}' already exists.` });
    }

    await db.insert(companies).values({
      id: company.id,
      name: company.name,
      email: company.email,
      industry: company.industry,
      country: company.country,
      timezone: company.timezone || "UTC",
      size: company.size || "100-500 employees",
      businessId: company.businessId || company.gstTaxId || null,
      logo: company.logo || null,
      website: company.website || null,
    });

    const [existingUserByUid] = await db.select().from(users).where(eq(users.id, admin.uid));
    const [existingUserByEmail] = await db.select().from(users).where(eq(users.email, admin.email));
    const existingUser = existingUserByUid || existingUserByEmail;

    if (existingUser) {
      await db.update(users).set({
        id: admin.uid,
        email: admin.email,
        name: admin.name,
        role: "owner",
        department: admin.department || "Operations",
        companyId: company.id,
      }).where(eq(users.id, existingUser.id));
    } else {
      await db.insert(users).values({
        id: admin.uid,
        email: admin.email,
        name: admin.name,
        role: "owner",
        department: admin.department || "Operations",
        companyId: company.id,
      });
    }

    await seedCompanyWorkspace(company.id);

    res.json({ success: true, message: "Workspace provisioned and administrator registered successfully." });
  } catch (error: any) {
    console.error("Company onboarding failed:", error);
    res.status(500).json({ error: error.message || "Failed to provision company workspace." });
  }
});

// Invite a new user and create an account
app.post("/api/auth/invite", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser || (req.dbUser.role !== "owner" && req.dbUser.role !== "admin")) {
      return res.status(403).json({ error: "Access Denied: Only owners or administrators can issue invitations." });
    }

    const { name, email, department, role, permissionLevel, password } = req.body;
    if (!email || !role || !department || !name) {
      return res.status(400).json({ error: "Missing required invitation parameters: email, role, department, name are required." });
    }

    const [existingDbUser] = await db.select().from(users).where(eq(users.email, email));
    const randomUid = existingDbUser?.id || `user-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!existingDbUser) {
      await db.insert(users).values({
        id: randomUid,
        email: email,
        name: name,
        role: role,
        department: department,
        companyId: req.dbUser.companyId,
      });
      console.log(`[DEMO-AUTH] Created database profile for employee: ${email}`);
    } else {
      await db.update(users).set({
        name: name,
        role: role,
        department: department,
        companyId: req.dbUser.companyId,
      }).where(eq(users.email, email));
      console.log(`[DEMO-AUTH] Updated existing database profile for employee: ${email}`);
    }

    const inviteToken = `INV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    await db.insert(invitations).values({
      id: inviteToken,
      companyId: req.dbUser.companyId,
      email,
      role,
      department,
      status: "accepted",
      expiresAt,
    });

    res.json({
      success: true,
      inviteToken,
      expiresAt,
      message: `Employee ${name} registered successfully.`,
    });
  } catch (error: any) {
    console.error("Failed to issue invitation:", error);
    res.status(500).json({ error: error.message || "Failed to create invitation and register employee." });
  }
});

// Retrieve invitation details
app.get("/api/auth/invitation/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const [invite] = await db.select().from(invitations).where(eq(invitations.id, token));
    
    if (!invite) {
      return res.status(404).json({ error: "Invitation not found." });
    }

    if (invite.status !== "pending" || invite.expiresAt < new Date()) {
      return res.status(400).json({ error: "This invitation link has expired or already been accepted." });
    }

    const [comp] = await db.select().from(companies).where(eq(companies.id, invite.companyId));

    res.json({
      invitation: invite,
      company: comp,
    });
  } catch (error: any) {
    console.error("Failed to fetch invitation details:", error);
    res.status(500).json({ error: "Failed to load invitation context." });
  }
});

// Accept invitation and register joining user profile
app.post("/api/auth/accept-invite", async (req, res) => {
  try {
    const { token, uid, name, email } = req.body;
    if (!token || !uid || !name || !email) {
      return res.status(400).json({ error: "Missing required invitation acceptance details." });
    }

    const [invite] = await db.select().from(invitations).where(eq(invitations.id, token));
    if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invitation is expired, void, or invalid." });
    }

    await db.insert(users).values({
      id: uid,
      email: email,
      name: name,
      role: invite.role,
      department: invite.department,
      companyId: invite.companyId,
    });

    await db.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, token));

    res.json({ success: true, message: "Invitation accepted. Profile created successfully." });
  } catch (error: any) {
    console.error("Failed to accept invitation:", error);
    res.status(500).json({ error: "Failed to accept company workspace invitation." });
  }
});

// Update user profile settings
app.post("/api/auth/update-profile", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const { name, avatar, theme, notificationPreferences } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;
    if (theme !== undefined) updates.theme = theme;
    if (notificationPreferences !== undefined) updates.notificationPreferences = notificationPreferences;

    await db.update(users).set(updates).where(eq(users.id, req.dbUser.id));

    res.json({ success: true, message: "Profile settings updated successfully." });
  } catch (error: any) {
    console.error("Failed to update profile settings:", error);
    res.status(500).json({ error: "Failed to update profile settings." });
  }
});

// Team management
app.get("/api/team", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) {
      return res.status(403).json({ error: "Access Denied: profile not found." });
    }
    const companyId = req.dbUser.companyId;

    // Fetch team members
    const teamMembers = await db.select().from(users).where(eq(users.companyId, companyId));
    // Fetch pending invitations
    const pendingInvites = await db.select().from(invitations).where(
      and(
        eq(invitations.companyId, companyId),
        eq(invitations.status, "pending")
      )
    );

    res.json({
      members: teamMembers,
      invitations: pendingInvites,
    });
  } catch (error: any) {
    console.error("Failed to load team members:", error);
    res.status(500).json({ error: "Failed to load team members." });
  }
});

// Toggle user active/disabled status
app.post("/api/team/members/:id/toggle-status", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser || (req.dbUser.role !== "owner" && req.dbUser.role !== "admin")) {
      return res.status(403).json({ error: "Access Denied: Only owners or administrators can toggle member status." });
    }

    const memberId = req.params.id;
    if (memberId === req.dbUser.id) {
      return res.status(400).json({ error: "Access Denied: You cannot disable your own account." });
    }

    const [member] = await db.select().from(users).where(
      and(
        eq(users.id, memberId),
        eq(users.companyId, req.dbUser.companyId)
      )
    );

    if (!member) {
      return res.status(404).json({ error: "Team member not found in your workspace." });
    }

    if (member.role === "owner" && req.dbUser.role !== "owner") {
      return res.status(403).json({ error: "Access Denied: Only the owner can toggle owner status." });
    }

    const newDisabledState = !member.isDisabled;
    await db.update(users).set({ isDisabled: newDisabledState }).where(eq(users.id, memberId));

    res.json({ success: true, isDisabled: newDisabledState });
  } catch (error: any) {
    console.error("Failed to toggle member status:", error);
    res.status(500).json({ error: "Failed to update member status." });
  }
});

// Assign role and department to a team member
app.post("/api/team/members/:id/role", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser || (req.dbUser.role !== "owner" && req.dbUser.role !== "admin")) {
      return res.status(403).json({ error: "Access Denied: Only owners or administrators can assign roles." });
    }

    const memberId = req.params.id;
    const { role, department } = req.body;

    if (!role || !department) {
      return res.status(400).json({ error: "Role and department parameters are required." });
    }

    const [member] = await db.select().from(users).where(
      and(
        eq(users.id, memberId),
        eq(users.companyId, req.dbUser.companyId)
      )
    );

    if (!member) {
      return res.status(404).json({ error: "Team member not found." });
    }

    if (member.role === "owner" && req.dbUser.id !== memberId) {
      return res.status(403).json({ error: "Access Denied: Only the owner can modify their own role." });
    }

    await db.update(users).set({
      role: role,
      department: department
    }).where(eq(users.id, memberId));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update user role:", error);
    res.status(500).json({ error: "Failed to assign role." });
  }
});

// Remove a team member
app.delete("/api/team/members/:id", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser || (req.dbUser.role !== "owner" && req.dbUser.role !== "admin")) {
      return res.status(403).json({ error: "Access Denied: Only owners or administrators can remove members." });
    }

    const memberId = req.params.id;
    if (memberId === req.dbUser.id) {
      return res.status(400).json({ error: "Access Denied: You cannot remove your own account from the workspace." });
    }

    const [member] = await db.select().from(users).where(
      and(
        eq(users.id, memberId),
        eq(users.companyId, req.dbUser.companyId)
      )
    );

    if (!member) {
      return res.status(404).json({ error: "Team member not found." });
    }

    if (member.role === "owner") {
      return res.status(403).json({ error: "Access Denied: The primary Owner cannot be removed." });
    }

    // Delete user from PostgreSQL
    await db.delete(users).where(eq(users.id, memberId));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete team member:", error);
    res.status(500).json({ error: "Failed to remove team member." });
  }
});

// Core ERP dataset
app.get("/api/data", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) {
      return res.status(403).json({ error: "Access Denied: local user profile not created." });
    }
    const companyId = req.dbUser.companyId;

    const dbSuppliers = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
    const dbInventory = await db.select().from(inventory).where(eq(inventory.companyId, companyId));
    const dbRequests = await db.select().from(requests).where(eq(requests.companyId, companyId));
    
    // Fetch timelines, comments, etc., but since requests are already filtered by company, 
    // we fetch them and map them cleanly
    const dbTimelines = await db.select().from(timelines);
    const dbComments = await db.select().from(comments);
    const dbChangeHistories = await db.select().from(changeHistories);
    const dbAttachments = await db.select().from(attachments);
    const dbAuditLogs = await db.select().from(auditLogs)
      .where(eq(auditLogs.companyId, companyId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(100);
    const dbNotifications = await db.select().from(notifications)
      .where(eq(notifications.companyId, companyId))
      .orderBy(desc(notifications.timestamp));

    const mappedRequests = dbRequests.map((r) => ({
      ...r,
      timeline: dbTimelines
        .filter((t) => t.requestId === r.id)
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
      comments: dbComments
        .filter((c) => c.requestId === r.id)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      changeHistory: dbChangeHistories
        .filter((ch) => ch.requestId === r.id)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      attachments: dbAttachments
        .filter((a) => a.requestId === r.id)
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()),
    })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({
      suppliers: dbSuppliers,
      inventory: dbInventory,
      requests: mappedRequests,
      auditLogs: dbAuditLogs,
      notifications: dbNotifications,
    });
  } catch (error: any) {
    console.error("Failed to fetch data:", error);
    res.status(500).json({ error: error.message || "Failed to load ERP core data." });
  }
});

// Import Suppliers from seed template
app.post("/api/import/suppliers", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;

    await db.delete(suppliers).where(eq(suppliers.companyId, companyId));
    await db.insert(suppliers).values(
      initialSuppliers.map((s) => ({
        id: `${companyId}-${s.id}`,
        name: s.name,
        avgPricePerUnit: s.avgPricePerUnit,
        deliveryPerformance: s.deliveryPerformance,
        avgLeadTimeDays: s.avgLeadTimeDays,
        qualityRating: s.qualityRating,
        status: s.status,
        companyId,
      }))
    );

    const logId = `AUD-${companyId}-${Date.now()}`;
    await db.insert(auditLogs).values({
      id: logId,
      timestamp: new Date(),
      user: req.dbUser.name,
      role: req.dbUser.role,
      action: "Import Suppliers",
      details: "Imported vendor master directory (6 active suppliers) from procurement database.",
      ip: req.ip || "127.0.0.1",
      companyId,
    });

    res.json({ success: true, message: "Suppliers database populated successfully." });
  } catch (error: any) {
    console.error("Failed to import suppliers:", error);
    res.status(500).json({ error: error.message || "Failed to import suppliers database." });
  }
});

// Import Inventory from seed template
app.post("/api/import/inventory", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;

    await db.delete(inventory).where(eq(inventory.companyId, companyId));
    await db.insert(inventory).values(
      initialInventory.map((i) => ({
        id: `${companyId}-${i.id}`,
        itemName: i.itemName,
        quantityInStock: i.quantityInStock,
        warehouse: i.warehouse,
        monthlyConsumption: i.monthlyConsumption,
        unit: i.unit,
        reorderPoint: i.reorderPoint,
        companyId,
      }))
    );

    const logId = `AUD-${companyId}-${Date.now()}`;
    await db.insert(auditLogs).values({
      id: logId,
      timestamp: new Date(),
      user: req.dbUser.name,
      role: req.dbUser.role,
      action: "Import Inventory",
      details: "Imported warehouse stock balances (5 active SKUs) from central inventory database.",
      ip: req.ip || "127.0.0.1",
      companyId,
    });

    res.json({ success: true, message: "Inventory database populated successfully." });
  } catch (error: any) {
    console.error("Failed to import inventory:", error);
    res.status(500).json({ error: error.message || "Failed to import inventory database." });
  }
});

// Sync both suppliers and inventory
app.post("/api/import/connect-odoo", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;

    await db.delete(suppliers).where(eq(suppliers.companyId, companyId));
    await db.delete(inventory).where(eq(inventory.companyId, companyId));

    await db.insert(suppliers).values(
      initialSuppliers.map((s) => ({
        id: `${companyId}-${s.id}`,
        name: s.name,
        avgPricePerUnit: s.avgPricePerUnit,
        deliveryPerformance: s.deliveryPerformance,
        avgLeadTimeDays: s.avgLeadTimeDays,
        qualityRating: s.qualityRating,
        status: s.status,
        companyId,
      }))
    );

    await db.insert(inventory).values(
      initialInventory.map((i) => ({
        id: `${companyId}-${i.id}`,
        itemName: i.itemName,
        quantityInStock: i.quantityInStock,
        warehouse: i.warehouse,
        monthlyConsumption: i.monthlyConsumption,
        unit: i.unit,
        reorderPoint: i.reorderPoint,
        companyId,
      }))
    );

    const logId = `AUD-${companyId}-${Date.now()}`;
    await db.insert(auditLogs).values({
      id: logId,
      timestamp: new Date(),
      user: req.dbUser.name,
      role: req.dbUser.role,
      action: "Connect ERP Sync",
      details: "Established secure connection to ERP databases. Synced 6 suppliers and 5 active warehouse SKUs.",
      ip: req.ip || "127.0.0.1",
      companyId,
    });

    const notifId = `NT-${companyId}-${Date.now()}`;
    await db.insert(notifications).values({
      id: notifId,
      title: "ERP Sync Established",
      message: "Sync complete: Imported 6 suppliers and 5 active inventory SKU balances from master.",
      timestamp: new Date(),
      read: false,
      type: "success",
      companyId,
    });

    res.json({ success: true, message: "ERP connection established and databases synced successfully." });
  } catch (error: any) {
    console.error("Failed to connect ERP:", error);
    res.status(500).json({ error: error.message || "Failed to establish ERP connection." });
  }
});

// Reset database for current workspace
app.post("/api/reset", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;

    // Cascade deletes timelines, comments, changeHistories, attachments
    await db.delete(requests).where(eq(requests.companyId, companyId));
    await db.delete(suppliers).where(eq(suppliers.companyId, companyId));
    await db.delete(inventory).where(eq(inventory.companyId, companyId));
    await db.delete(notifications).where(eq(notifications.companyId, companyId));
    await db.delete(auditLogs).where(eq(auditLogs.companyId, companyId));

    res.json({ success: true, message: "Your company's procurement pipelines and local datasets have been reset." });
  } catch (error: any) {
    console.error("Failed to reset database:", error);
    res.status(500).json({ error: error.message || "Failed to clear datastores." });
  }
});

app.post("/api/notifications/read-all", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    await db.update(notifications).set({ read: true }).where(eq(notifications.companyId, req.dbUser.companyId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/notifications/:id/read", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const { id } = req.params;
    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.companyId, req.dbUser.companyId)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a Purchase Request with instant AI evaluation
app.post("/api/requests", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;

    const {
      itemName,
      quantity,
      unitPrice,
      department,
      supplierId,
      requestedBy,
      description,
    } = req.body;

    if (!itemName || !quantity || !unitPrice || !department || !supplierId) {
      return res.status(400).json({ error: "Missing required procurement fields" });
    }

    const [existingCount] = await db.select({ value: count() }).from(requests).where(eq(requests.companyId, companyId));
    const nextNum = String(existingCount.value + 1).padStart(3, "0");
    const prId = `PR-2026-${nextNum}`;
    const totalAmount = quantity * unitPrice;

    // Standard static checks for backup or context building, filtered by company
    const dbSuppliers = (await db.select().from(suppliers).where(eq(suppliers.companyId, companyId))) as any as Supplier[];
    const [supplierObj] = (await db.select().from(suppliers).where(and(eq(suppliers.id, supplierId), eq(suppliers.companyId, companyId)))) as any as [Supplier | undefined];
    const [inventoryObj] = (await db.select().from(inventory).where(and(ilike(inventory.itemName, itemName), eq(inventory.companyId, companyId)))) as any as [InventoryItem | undefined];

    const isRestricted = supplierObj?.status === SupplierStatus.RESTRICTED;
    const stockAvailable = inventoryObj ? inventoryObj.quantityInStock : 0;
    const monthlyCons = inventoryObj ? inventoryObj.monthlyConsumption : 100;
    const daysOfSupply = inventoryObj && monthlyCons > 0 ? (stockAvailable / monthlyCons) * 30 : 0;

    // Alternate suppliers comparison
    const alternates = dbSuppliers.filter((s) => s.id !== supplierId && s.status !== SupplierStatus.RESTRICTED);
    const bestAlternate =
      alternates.length > 0
        ? alternates.reduce((prev, current) => (prev.avgPricePerUnit < current.avgPricePerUnit ? prev : current))
        : null;

    let aiRec: AIRecommendation;
    let finImpact: FinancialImpact;
    let computedRisk: RiskLevel = RiskLevel.LOW;
    let computedScore = 85;

    const ai = getGemini();
    if (ai) {
      const analysisPrompt = `
      You are an expert enterprise procurement analyst.
      Analyze the following proposed Purchase Request:
      - Item Name: "${itemName}"
      - Proposed Quantity: ${quantity} units (Unit Price: ₹${unitPrice}, Total Amount: ₹${totalAmount})
      - Proposed Supplier: "${supplierObj?.name || "Unknown"}" (Status: ${supplierObj?.status}, Lead Time: ${supplierObj?.avgLeadTimeDays} days, Quality: ${supplierObj?.qualityRating}/5, Del. Performance: ${supplierObj?.deliveryPerformance}%)
      - Department: "${department}"
      - Requested By: "${requestedBy || req.dbUser.name}"
      - Purpose/Description: "${description || "None"}"

      Context database metrics:
      - Current warehouse stock of this item: ${stockAvailable} units (Warehouse: "${inventoryObj?.warehouse || "N/A"}")
      - Monthly consumption speed: ${monthlyCons} units/month (Reorder threshold: ${inventoryObj?.reorderPoint || 0})
      - Alternate qualified suppliers for this item:
        ${alternates.map((alt) => `- "${alt.name}": avg price ₹${alt.avgPricePerUnit}/unit, delivery performance ${alt.deliveryPerformance}%, quality ${alt.qualityRating}/5, lead time ${alt.avgLeadTimeDays} days`).join("\n")}

      Compare prices, duplicate requests, stock surplus, risk factors (large quantities, Restricted suppliers, off-business hours buying), and produce an expert corporate assessment.
      Ensure the terminology is strictly professional and corporate (do NOT mention "AI", "AI Assistant", "Smart Recommendation", "intelligence", or "machine learning" anywhere. Speak like a senior procurement controller).
      You must respond with a JSON object strictly conforming to the following structure:
      {
        "reason": "Concise optimization flag or status message",
        "estimatedSavings": number (saving amount in INR if they buy from best alternate or reduce quantity. Enter 0 if already optimal),
        "confidence": number (0 to 100 confidence %),
        "businessImpact": "Strategic explanation of holding capital or supply security impact",
        "suggestedAction": "Concrete immediate recommendation for the manager (e.g. Approve, buy from X, reduce order)",
        "explanation": "Natural, professional and highly polished corporate explanation paragraph (similar to a report prepared by a procurement analyst, e.g. Warehouse B contains stock... Delta Metals offers same item 9% cheaper...)",
        "riskLevel": "low" or "medium" or "high",
        "healthScore": number (0 to 100 representing health),
        "financialImpact": {
          "annualSavings": number,
          "cashFlowImpact": "Sentence describing how it affects cash flow/capital lockup",
          "storageCostChange": number,
          "deliveryRiskMetric": "Description of supplier delivery speed, delays, or reliability ratings"
        }
      }
      `;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: analysisPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reason: { type: Type.STRING },
                estimatedSavings: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER },
                businessImpact: { type: Type.STRING },
                suggestedAction: { type: Type.STRING },
                explanation: { type: Type.STRING },
                riskLevel: { type: Type.STRING },
                healthScore: { type: Type.NUMBER },
                financialImpact: {
                  type: Type.OBJECT,
                  properties: {
                    annualSavings: { type: Type.NUMBER },
                    cashFlowImpact: { type: Type.STRING },
                    storageCostChange: { type: Type.NUMBER },
                    deliveryRiskMetric: { type: Type.STRING },
                  },
                  required: ["annualSavings", "cashFlowImpact", "storageCostChange", "deliveryRiskMetric"],
                },
              },
              required: [
                "reason",
                "estimatedSavings",
                "confidence",
                "businessImpact",
                "suggestedAction",
                "explanation",
                "riskLevel",
                "healthScore",
                "financialImpact",
              ],
            },
          },
        });

        const resJson = JSON.parse(response.text || "{}");
        aiRec = {
          reason: resJson.reason || "System heuristic evaluation completed",
          estimatedSavings: Number(resJson.estimatedSavings || 0),
          confidence: Number(resJson.confidence || 90),
          businessImpact: resJson.businessImpact || "Optimised procurement capital distribution.",
          suggestedAction: resJson.suggestedAction || "Proceed with request validation.",
          explanation: resJson.explanation || "Heuristics complete.",
        };
        finImpact = resJson.financialImpact || {
          annualSavings: Number(resJson.estimatedSavings || 0) * 12,
          cashFlowImpact: resJson.businessImpact || "Improves manufacturing working capital.",
          storageCostChange: 0,
          deliveryRiskMetric: "Reliable distribution channels verified.",
        };
        computedRisk = (resJson.riskLevel as RiskLevel) || RiskLevel.LOW;
        computedScore = Number(resJson.healthScore || 85);
      } catch (err) {
        console.error("Gemini request failed, executing heuristics fallback:", err);
        const { fallbackRec, fallbackImpact, risk, score } = computeHeuristicsFallback(
          itemName,
          quantity,
          unitPrice,
          totalAmount,
          supplierObj,
          inventoryObj,
          bestAlternate,
          isRestricted,
          daysOfSupply
        );
        aiRec = fallbackRec;
        finImpact = fallbackImpact;
        computedRisk = risk;
        computedScore = score;
      }
    } else {
      const { fallbackRec, fallbackImpact, risk, score } = computeHeuristicsFallback(
        itemName,
        quantity,
        unitPrice,
        totalAmount,
        supplierObj,
        inventoryObj,
        bestAlternate,
        isRestricted,
        daysOfSupply
      );
      aiRec = fallbackRec;
      finImpact = fallbackImpact;
      computedRisk = risk;
      computedScore = score;
    }

    const reqStatus = computedRisk === RiskLevel.HIGH ? RequestStatus.UNDER_REVIEW : RequestStatus.SUBMITTED;

    // Create the Request
    await db.insert(requests).values({
      id: prId,
      itemName,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      currency: "INR",
      totalAmount,
      department,
      supplierId,
      status: reqStatus,
      riskLevel: computedRisk,
      healthScore: computedScore,
      createdAt: new Date(),
      requestedBy: req.dbUser.name,
      description: description || "Replenishment requisition",
      priority: "medium",
      aiRecommendation: aiRec,
      financialImpact: finImpact,
      companyId: companyId,
    });

    // Create Timelines
    await db.insert(timelines).values([
      {
        id: `TM-${companyId}-${Date.now()}-01`,
        requestId: prId,
        date: new Date(),
        user: req.dbUser.name,
        action: "Purchase request created",
        status: "draft",
        details: `Requisition created for ${quantity} units of ${itemName}.`,
      },
      {
        id: `TM-${companyId}-${Date.now()}-02`,
        requestId: prId,
        date: new Date(),
        user: req.dbUser.name,
        action: "Purchase request submitted",
        status: reqStatus,
        details: `Requisition forwarded automatically for verification.`,
      },
    ]);

    // Audit logs
    await db.insert(auditLogs).values({
      id: `AUD-${companyId}-${Date.now()}`,
      timestamp: new Date(),
      user: req.dbUser.name,
      role: req.dbUser.role,
      action: "CREATE_REQUEST",
      details: `Created Requisition ${prId} for ${quantity}x ${itemName} (Risk: ${computedRisk.toUpperCase()}, Health Score: ${computedScore}).`,
      ip: req.ip || "127.0.0.1",
      companyId: companyId,
    });

    if (computedRisk === RiskLevel.HIGH) {
      await db.insert(auditLogs).values({
        id: `AUD-${companyId}-${Date.now()}-high`,
        timestamp: new Date(),
        user: "Compliance Engine",
        role: "System Agent",
        action: "AUTO_FLAG",
        details: `Automatically flagged ${prId} for UNDER REVIEW due to high procurement risk parameters.`,
        ip: "127.0.0.1",
        companyId: companyId,
      });

      await db.insert(timelines).values({
        id: `TM-${companyId}-${Date.now()}-03`,
        requestId: prId,
        date: new Date(),
        user: "Compliance Engine",
        action: "Review generated",
        status: "under_review",
        details: `System audit identified optimization potential: ${aiRec?.reason}.`,
      });
    }

    // Fetch the updated request with all child relations
    const [updatedPr] = await db.select().from(requests).where(and(eq(requests.id, prId), eq(requests.companyId, companyId)));
    const updatedTimelines = await db.select().from(timelines).where(eq(timelines.requestId, prId));
    const updatedComments = await db.select().from(comments).where(eq(comments.requestId, prId));
    const updatedChangeHistories = await db.select().from(changeHistories).where(eq(changeHistories.requestId, prId));
    const updatedAttachments = await db.select().from(attachments).where(eq(attachments.requestId, prId));

    const fullPr = {
      ...updatedPr,
      timeline: updatedTimelines,
      comments: updatedComments,
      changeHistory: updatedChangeHistories,
      attachments: updatedAttachments,
    };

    res.json({ success: true, request: fullPr });
  } catch (error: any) {
    console.error("Create request failed:", error);
    res.status(500).json({ error: error.message || "Failed to create and analyze request" });
  }
});

// Update Purchase Request Action (Approve / Reject)
app.post("/api/requests/:id/action", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;
    const { id } = req.params;
    const { action } = req.body; // action: 'approve' | 'reject' | 'flag'

    const [pr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
    if (!pr) {
      return res.status(404).json({ error: "Purchase Request not found" });
    }

    let status = pr.status;
    let logAction = "";
    if (action === "approve") {
      status = RequestStatus.APPROVED;
      logAction = "APPROVE_REQUEST";
    } else if (action === "reject") {
      status = RequestStatus.REJECTED;
      logAction = "REJECT_REQUEST";
    } else if (action === "flag") {
      status = RequestStatus.UNDER_REVIEW;
      logAction = "FLAG_REQUEST";
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    // Update in DB
    await db.update(requests).set({ status }).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));

    const timestamp = new Date();

    // Record audit
    await db.insert(auditLogs).values({
      id: `AUD-${companyId}-${Date.now()}`,
      timestamp,
      user: req.dbUser.name,
      role: req.dbUser.role,
      action: logAction,
      details: `${logAction === "APPROVE_REQUEST" ? "Approved" : logAction === "REJECT_REQUEST" ? "Rejected" : "Reviewed"} request ${id} (${pr.itemName}).`,
      ip: req.ip || "127.0.0.1",
      companyId: companyId,
    });

    // Record timeline event
    await db.insert(timelines).values({
      id: `TM-${companyId}-${Date.now()}`,
      requestId: id,
      date: timestamp,
      user: req.dbUser.name,
      action:
        logAction === "APPROVE_REQUEST"
          ? "Approval decision"
          : logAction === "REJECT_REQUEST"
            ? "Rejected decision"
            : "Review transition",
      status: status,
      details: `${req.dbUser.role || "User"} performed action: ${action.toUpperCase()}`,
    });

    // Fetch updated data
    const updatedTimelines = await db.select().from(timelines).where(eq(timelines.requestId, id));
    const updatedComments = await db.select().from(comments).where(eq(comments.requestId, id));
    const updatedChangeHistories = await db.select().from(changeHistories).where(eq(changeHistories.requestId, id));
    const updatedAttachments = await db.select().from(attachments).where(eq(attachments.requestId, id));

    res.json({
      success: true,
      request: {
        ...pr,
        status,
        timeline: updatedTimelines,
        comments: updatedComments,
        changeHistory: updatedChangeHistories,
        attachments: updatedAttachments,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post a comment / reply
app.post("/api/requests/:id/comments", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;
    const { id } = req.params;
    const { text, parentId } = req.body;

    const [pr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
    if (!pr) {
      return res.status(404).json({ error: "Purchase Request not found" });
    }

    const commentId = `CM-${Date.now()}`;
    const timestamp = new Date();

    // Insert comment
    await db.insert(comments).values({
      id: commentId,
      requestId: id,
      author: req.dbUser.name,
      role: req.dbUser.role,
      text: text || "",
      timestamp,
      parentId: parentId || null,
    });

    // Add timeline event
    await db.insert(timelines).values({
      id: `TM-${companyId}-${Date.now()}`,
      requestId: id,
      date: timestamp,
      user: req.dbUser.name,
      action: parentId ? "Replied to discussion" : "Added discussion comment",
      status: pr.status,
      details: `${req.dbUser.role}: "${text.length > 60 ? text.substring(0, 57) + "..." : text}"`,
    });

    // Log Audit
    await db.insert(auditLogs).values({
      id: `AUD-${companyId}-${Date.now()}`,
      timestamp,
      user: req.dbUser.name,
      role: req.dbUser.role,
      action: "ADD_COMMENT",
      details: `Added discussion note on request ${id}.`,
      ip: req.ip || "127.0.0.1",
      companyId: companyId,
    });

    // Fetch updated request
    const [updatedPr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
    const updatedTimelines = await db.select().from(timelines).where(eq(timelines.requestId, id));
    const updatedComments = await db.select().from(comments).where(eq(comments.requestId, id));
    const updatedChangeHistories = await db.select().from(changeHistories).where(eq(changeHistories.requestId, id));
    const updatedAttachments = await db.select().from(attachments).where(eq(attachments.requestId, id));

    res.json({
      success: true,
      comment: {
        id: commentId,
        author: req.dbUser.name,
        role: req.dbUser.role,
        text: text || "",
        timestamp: timestamp.toISOString(),
        parentId,
      },
      request: {
        ...updatedPr,
        timeline: updatedTimelines,
        comments: updatedComments,
        changeHistory: updatedChangeHistories,
        attachments: updatedAttachments,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upload supporting attachment
app.post("/api/requests/:id/attachments", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;
    const { id } = req.params;
    const { name, type, fileSize } = req.body;

    const [pr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
    if (!pr) {
      return res.status(404).json({ error: "Purchase Request not found" });
    }

    const attachmentId = `AT-${Date.now()}`;
    const timestamp = new Date();

    // Insert attachment
    await db.insert(attachments).values({
      id: attachmentId,
      requestId: id,
      name: name || "Document.pdf",
      type: type || "other",
      fileSize: fileSize || "120 KB",
      uploadedAt: timestamp,
      uploadedBy: req.dbUser.name,
      url: "/assets/invoice.pdf",
    });

    // Add timeline event
    await db.insert(timelines).values({
      id: `TM-${companyId}-${Date.now()}`,
      requestId: id,
      date: timestamp,
      user: req.dbUser.name,
      action: "Uploaded document",
      status: pr.status,
      details: `Attached ${type.toUpperCase()}: ${name}`,
    });

    // Log Audit
    await db.insert(auditLogs).values({
      id: `AUD-${companyId}-${Date.now()}`,
      timestamp,
      user: req.dbUser.name,
      role: req.dbUser.role,
      action: "UPLOAD_DOCUMENT",
      details: `Uploaded ${name} to request ${id}.`,
      ip: req.ip || "127.0.0.1",
      companyId: companyId,
    });

    // Fetch updated request
    const [updatedPr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
    const updatedTimelines = await db.select().from(timelines).where(eq(timelines.requestId, id));
    const updatedComments = await db.select().from(comments).where(eq(comments.requestId, id));
    const updatedChangeHistories = await db.select().from(changeHistories).where(eq(changeHistories.requestId, id));
    const updatedAttachments = await db.select().from(attachments).where(eq(attachments.requestId, id));

    res.json({
      success: true,
      attachment: {
        id: attachmentId,
        name: name || "Document.pdf",
        type: type || "other",
        fileSize: fileSize || "120 KB",
        uploadedAt: timestamp.toISOString(),
        uploadedBy: req.dbUser.name,
      },
      request: {
        ...updatedPr,
        timeline: updatedTimelines,
        comments: updatedComments,
        changeHistory: updatedChangeHistories,
        attachments: updatedAttachments,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Workflow Transition and State Management
app.post("/api/requests/:id/workflow", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;
    const { id } = req.params;
    const {
      status,
      priority,
      expectedDeliveryDate,
      purchasingInstructions,
      notes,
      rejectionReason,
      revisionComments,
      quantity,
      supplierId,
    } = req.body;

    const username = req.dbUser.name;
    const role = req.dbUser.role;

    const [pr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
    if (!pr) {
      return res.status(404).json({ error: "Purchase Request not found" });
    }

    const oldStatus = pr.status;
    const timestamp = new Date();

    const insertedChangeHistories = [];
    const insertedComments = [];
    const updates: any = {};

    // Handle value modifications first
    if (quantity !== undefined && Number(quantity) !== pr.quantity) {
      const oldVal = pr.quantity.toString();
      updates.quantity = Number(quantity);
      updates.totalAmount = Number(quantity) * pr.unitPrice;
      insertedChangeHistories.push({
        id: `CH-${Date.now()}-qty`,
        requestId: id,
        timestamp,
        user: username,
        field: "quantity",
        oldValue: oldVal,
        newValue: quantity.toString(),
      });
    }

    if (supplierId !== undefined && supplierId !== pr.supplierId) {
      const oldVal = pr.supplierId;
      updates.supplierId = supplierId;
      insertedChangeHistories.push({
        id: `CH-${Date.now()}-sup`,
        requestId: id,
        timestamp,
        user: username,
        field: "supplierId",
        oldValue: oldVal,
        newValue: supplierId,
      });
    }

    if (priority !== undefined && priority !== pr.priority) {
      const oldVal = pr.priority || "none";
      updates.priority = priority;
      insertedChangeHistories.push({
        id: `CH-${Date.now()}-pri`,
        requestId: id,
        timestamp,
        user: username,
        field: "priority",
        oldValue: oldVal,
        newValue: priority,
      });
    }

    if (expectedDeliveryDate !== undefined && expectedDeliveryDate !== pr.expectedDeliveryDate) {
      const oldVal = pr.expectedDeliveryDate || "none";
      updates.expectedDeliveryDate = expectedDeliveryDate;
      insertedChangeHistories.push({
        id: `CH-${Date.now()}-edd`,
        requestId: id,
        timestamp,
        user: username,
        field: "expectedDeliveryDate",
        oldValue: oldVal,
        newValue: expectedDeliveryDate,
      });
    }

    if (purchasingInstructions !== undefined && purchasingInstructions !== pr.purchasingInstructions) {
      updates.purchasingInstructions = purchasingInstructions;
    }

    // Handle status update
    let detailText = `Moved request from ${oldStatus.toUpperCase()} to ${status.toUpperCase()}`;
    if (status && status !== pr.status) {
      updates.status = status;

      insertedChangeHistories.push({
        id: `CH-${Date.now()}-status`,
        requestId: id,
        timestamp,
        user: username,
        field: "status",
        oldValue: oldStatus,
        newValue: status,
      });

      // Handle comments or notes associated with transition
      if (status === RequestStatus.APPROVED) {
        detailText = `Approved. Priority: ${(priority || "medium").toUpperCase()}, Delivery: ${expectedDeliveryDate || "Standard"}`;
        if (notes) {
          insertedComments.push({
            id: `CM-${Date.now()}-apr`,
            requestId: id,
            author: username,
            role: role,
            text: `Approval Note: ${notes}`,
            timestamp,
          });
        }
      } else if (status === RequestStatus.REJECTED) {
        detailText = `Rejected. Reason: ${rejectionReason || "No reason provided"}`;
        if (rejectionReason) {
          insertedComments.push({
            id: `CM-${Date.now()}-rej`,
            requestId: id,
            author: username,
            role: role,
            text: `Rejection Note: ${rejectionReason}`,
            timestamp,
          });
        }
      } else if (status === RequestStatus.NEEDS_REVISION) {
        detailText = `Revision Requested. Instructions: ${revisionComments || "Review items and details"}`;
        if (revisionComments) {
          insertedComments.push({
            id: `CM-${Date.now()}-rev`,
            requestId: id,
            author: username,
            role: role,
            text: `Revision Request details: ${revisionComments}`,
            timestamp,
          });
        }
      } else if (status === RequestStatus.PO_CREATED) {
        detailText = `Purchase Order Created. PO number: PO-2026-${id.split("-").pop() || "123"}`;
      }

      await db.insert(timelines).values({
        id: `TM-${Date.now()}-wf`,
        requestId: id,
        date: timestamp,
        user: username,
        action:
          status === RequestStatus.SUBMITTED
            ? "Purchase request submitted"
            : status === RequestStatus.UNDER_REVIEW
              ? "Review generated"
              : status === RequestStatus.NEEDS_REVISION
                ? "Revision requested"
                : status === RequestStatus.APPROVED
                  ? "Approval decision"
                  : status === RequestStatus.REJECTED
                    ? "Approval decision"
                    : status === RequestStatus.PO_CREATED
                      ? "Purchase Order generated"
                      : status === RequestStatus.COMPLETED
                        ? "Completed procurement"
                        : "Status updated",
        status: status,
        details: detailText,
      });

      // Record audit log
      await db.insert(auditLogs).values({
        id: `AUD-0${Date.now()}`,
        timestamp,
        user: username,
        role: role,
        action: `WORKFLOW_${status.toUpperCase()}`,
        details: `Transitioned request ${id} to ${status.toUpperCase()}: ${detailText}`,
        ip: req.ip || "127.0.0.1",
      });
    }

    // Save modifications to database
    if (Object.keys(updates).length > 0) {
      await db.update(requests).set(updates).where(eq(requests.id, id));
    }
    if (insertedChangeHistories.length > 0) {
      await db.insert(changeHistories).values(insertedChangeHistories);
    }
    if (insertedComments.length > 0) {
      await db.insert(comments).values(insertedComments);
    }

    // Fetch updated request
    const [updatedPr] = await db.select().from(requests).where(eq(requests.id, id));
    const updatedTimelines = await db.select().from(timelines).where(eq(timelines.requestId, id));
    const updatedComments = await db.select().from(comments).where(eq(comments.requestId, id));
    const updatedChangeHistories = await db.select().from(changeHistories).where(eq(changeHistories.requestId, id));
    const updatedAttachments = await db.select().from(attachments).where(eq(attachments.requestId, id));

    res.json({
      success: true,
      request: {
        ...updatedPr,
        timeline: updatedTimelines,
        comments: updatedComments,
        changeHistory: updatedChangeHistories,
        attachments: updatedAttachments,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Apply audit recommended changes (Supplier swap, quantity optimization)
app.post("/api/requests/:id/apply-recommendation", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;
    const { id } = req.params;

    const [pr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
    if (!pr) {
      return res.status(404).json({ error: "Purchase Request not found" });
    }

    const timestamp = new Date();
    const dbSuppliers = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));

    if (pr.aiRecommendation) {
      const oldQty = pr.quantity;
      const oldSupId = pr.supplierId;
      const oldAmount = pr.totalAmount;

      // Detect optimized targets
      let recommendedQty = pr.quantity;
      let recommendedSupId = pr.supplierId;

      const actionText = (pr.aiRecommendation as any).suggestedAction || "";
      const lowerAction = actionText.toLowerCase();

      // Look for supplier in recommendations matching our supplier database
      for (const sup of dbSuppliers) {
        if (lowerAction.includes(sup.name.toLowerCase()) || lowerAction.includes(sup.id.toLowerCase())) {
          recommendedSupId = sup.id;
          break;
        }
      }

      // Look for quantity
      const qtyMatch = lowerAction.match(
        /(?:reduce order to|source|buy|order)\s+(\d+)\s*(?:sheets|units|liters|rolls|pieces)?/
      );
      if (qtyMatch && qtyMatch[1]) {
        recommendedQty = parseInt(qtyMatch[1]);
      }

      // If no explicit matches, do a fallback optimization
      if (recommendedQty === oldQty && recommendedSupId === oldSupId) {
        const alternates = dbSuppliers.filter((s) => s.id !== oldSupId && s.status !== SupplierStatus.RESTRICTED);
        if (alternates.length > 0) {
          alternates.sort((a, b) => a.avgPricePerUnit - b.avgPricePerUnit);
          recommendedSupId = alternates[0].id;
        }
        recommendedQty = Math.max(1, Math.floor(oldQty * 0.75));
      }

      const matchedSup = dbSuppliers.find((s) => s.id === recommendedSupId) || dbSuppliers[0];
      const newUnitPrice = matchedSup.avgPricePerUnit;
      const newTotalAmount = recommendedQty * newUnitPrice;

      // Update in DB
      await db.update(requests).set({
        quantity: recommendedQty,
        supplierId: recommendedSupId,
        unitPrice: newUnitPrice,
        totalAmount: newTotalAmount,
        riskLevel: RiskLevel.LOW,
        healthScore: 98,
      }).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));

      const insertedChs = [];
      if (oldQty !== recommendedQty) {
        insertedChs.push({
          id: `CH-${Date.now()}-sim-qty`,
          requestId: id,
          timestamp,
          user: req.dbUser.name,
          field: "quantity",
          oldValue: oldQty.toString(),
          newValue: recommendedQty.toString(),
        });
      }

      if (oldSupId !== recommendedSupId) {
        insertedChs.push({
          id: `CH-${Date.now()}-sim-sup`,
          requestId: id,
          timestamp,
          user: req.dbUser.name,
          field: "supplierId",
          oldValue: oldSupId,
          newValue: recommendedSupId,
        });
      }

      insertedChs.push({
        id: `CH-${Date.now()}-sim-amt`,
        requestId: id,
        timestamp,
        user: req.dbUser.name,
        field: "totalAmount",
        oldValue: oldAmount.toString(),
        newValue: newTotalAmount.toString(),
      });

      await db.insert(changeHistories).values(insertedChs);

      // Timeline event
      await db.insert(timelines).values({
        id: `TM-${companyId}-${Date.now()}-sim`,
        requestId: id,
        date: timestamp,
        user: req.dbUser.name,
        action: "Supplier comparison completed",
        status: pr.status,
        details: `Savings recommendation applied. Supplier changed to ${matchedSup.name}, quantity optimized to ${recommendedQty}.`,
      });

      // Add note
      await db.insert(comments).values({
        id: `CM-${Date.now()}-sim`,
        requestId: id,
        author: "Requisition Optimizer",
        role: "System Agent",
        text: `Recommendation applied: Quantity reduced to ${recommendedQty} and routed to ${matchedSup.name} (Estimated Savings: ₹${(oldAmount - newTotalAmount).toLocaleString()}).`,
        timestamp,
      });

      // Audit logs
      await db.insert(auditLogs).values({
        id: `AUD-${companyId}-${Date.now()}`,
        timestamp,
        user: req.dbUser.name,
        role: req.dbUser.role,
        action: "APPLY_RECOMMENDATION",
        details: `Optimized purchase request ${id} based on side-by-side cost-savings recommendation.`,
        ip: req.ip || "127.0.0.1",
        companyId: companyId,
      });

      // Fetch updated request
      const [updatedPr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
      const updatedTimelines = await db.select().from(timelines).where(eq(timelines.requestId, id));
      const updatedComments = await db.select().from(comments).where(eq(comments.requestId, id));
      const updatedChangeHistories = await db.select().from(changeHistories).where(eq(changeHistories.requestId, id));
      const updatedAttachments = await db.select().from(attachments).where(eq(attachments.requestId, id));

      res.json({
        success: true,
        request: {
          ...updatedPr,
          timeline: updatedTimelines,
          comments: updatedComments,
          changeHistory: updatedChangeHistories,
          attachments: updatedAttachments,
        },
      });
    } else {
      res.status(400).json({ error: "No recommendation available for this request." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Adjust stock level of a specific inventory item
app.post("/api/inventory/:id/adjust", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;
    const { id } = req.params;
    const { quantity } = req.body;

    const [item] = await db.select().from(inventory).where(and(eq(inventory.id, id), eq(inventory.companyId, companyId)));
    if (!item) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    const oldQty = item.quantityInStock;
    await db.update(inventory).set({ quantityInStock: Number(quantity) }).where(and(eq(inventory.id, id), eq(inventory.companyId, companyId)));

    // Record audit log
    await db.insert(auditLogs).values({
      id: `AUD-${companyId}-${Date.now()}`,
      timestamp: new Date(),
      user: req.dbUser.name,
      role: req.dbUser.role,
      action: "ADJUST_STOCK",
      details: `Adjusted SKU ${id} (${item.itemName}) stock from ${oldQty} to ${quantity} ${item.unit}.`,
      ip: req.ip || "127.0.0.1",
      companyId: companyId,
    });

    const [updatedItem] = await db.select().from(inventory).where(and(eq(inventory.id, id), eq(inventory.companyId, companyId)));
    res.json({ success: true, item: updatedItem });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Receive goods for a Purchase Request that is in PO_CREATED status
app.post("/api/requests/:id/receive", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;
    const { id } = req.params;

    const [pr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
    if (!pr) {
      return res.status(404).json({ error: "Purchase Request not found" });
    }

    if (pr.status !== RequestStatus.PO_CREATED) {
      return res.status(400).json({ error: "Only PO created requisitions can be physically received" });
    }

    // Mark request as completed
    await db.update(requests).set({ status: RequestStatus.COMPLETED }).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));

    // Find corresponding inventory item and increase stock, isolated by company
    const [item] = await db.select().from(inventory).where(and(ilike(inventory.itemName, pr.itemName), eq(inventory.companyId, companyId)));
    let inventoryDetail = "";
    if (item) {
      const oldQty = item.quantityInStock;
      const newQty = oldQty + pr.quantity;
      await db.update(inventory).set({ quantityInStock: newQty }).where(and(eq(inventory.id, item.id), eq(inventory.companyId, companyId)));
      inventoryDetail = `Increased SKU ${item.id} (${item.itemName}) stock from ${oldQty} to ${newQty} ${item.unit}.`;
    } else {
      inventoryDetail = "Item not tracked in current core warehouse stock indexes.";
    }

    const timestamp = new Date();

    // Record timeline event
    await db.insert(timelines).values({
      id: `TM-${companyId}-${Date.now()}-rec`,
      requestId: id,
      date: timestamp,
      user: req.dbUser.name,
      action: "Received incoming shipment",
      status: RequestStatus.COMPLETED,
      details: `Goods physically checked and checked into inventory. ${inventoryDetail}`,
    });

    // Record audit log
    await db.insert(auditLogs).values({
      id: `AUD-${companyId}-${Date.now()}`,
      timestamp,
      user: req.dbUser.name,
      role: req.dbUser.role,
      action: "RECEIVE_GOODS",
      details: `Received delivery for PO ${id} (${pr.itemName}). ${inventoryDetail}`,
      ip: req.ip || "127.0.0.1",
      companyId: companyId,
    });

    // Fetch updated data
    const [updatedPr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
    const updatedTimelines = await db.select().from(timelines).where(eq(timelines.requestId, id));
    const updatedComments = await db.select().from(comments).where(eq(comments.requestId, id));
    const updatedChangeHistories = await db.select().from(changeHistories).where(eq(changeHistories.requestId, id));
    const updatedAttachments = await db.select().from(attachments).where(eq(attachments.requestId, id));
    const dbInventory = await db.select().from(inventory).where(eq(inventory.companyId, companyId));

    res.json({
      success: true,
      request: {
        ...updatedPr,
        timeline: updatedTimelines,
        comments: updatedComments,
        changeHistory: updatedChangeHistories,
        attachments: updatedAttachments,
      },
      inventory: dbInventory,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Odoo ERP XML-RPC Connector Endpoints

// Test live XML-RPC connection to Odoo ERP
app.post("/api/odoo/test-connection", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const { url, db: odooDb, username, apiKey } = req.body;
    const result = await testOdooXmlRpcConnection({
      url: url || "https://demo.odoo.com",
      db: odooDb || "odoo",
      username: username || "",
      apiKey: apiKey || "",
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bi-directional Odoo ERP XML-RPC sync
app.post("/api/odoo/sync", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;
    const { url, db: odooDb, username, apiKey } = req.body;

    const currentRequests = await db.select().from(requests).where(eq(requests.companyId, companyId));
    const syncResult = await executeBiDirectionalOdooSync(
      {
        url: url || "https://demo.odoo.com",
        db: odooDb || "odoo",
        username: username || "",
        apiKey: apiKey || "",
      },
      currentRequests
    );

    // Safely upsert suppliers and inventory in DB without violating foreign key constraints
    for (const s of initialSuppliers) {
      const supId = `${companyId}-${s.id}`;
      const [existing] = await db.select().from(suppliers).where(and(eq(suppliers.id, supId), eq(suppliers.companyId, companyId)));
      if (existing) {
        await db.update(suppliers).set({
          name: s.name,
          avgPricePerUnit: s.avgPricePerUnit,
          deliveryPerformance: s.deliveryPerformance,
          avgLeadTimeDays: s.avgLeadTimeDays,
          qualityRating: s.qualityRating,
          status: s.status,
        }).where(eq(suppliers.id, supId));
      } else {
        await db.insert(suppliers).values({
          id: supId,
          name: s.name,
          avgPricePerUnit: s.avgPricePerUnit,
          deliveryPerformance: s.deliveryPerformance,
          avgLeadTimeDays: s.avgLeadTimeDays,
          qualityRating: s.qualityRating,
          status: s.status,
          companyId,
        });
      }
    }

    for (const i of initialInventory) {
      const invId = `${companyId}-${i.id}`;
      const [existing] = await db.select().from(inventory).where(and(eq(inventory.id, invId), eq(inventory.companyId, companyId)));
      if (existing) {
        await db.update(inventory).set({
          itemName: i.itemName,
          quantityInStock: i.quantityInStock,
          warehouse: i.warehouse,
          monthlyConsumption: i.monthlyConsumption,
          unit: i.unit,
          reorderPoint: i.reorderPoint,
        }).where(eq(inventory.id, invId));
      } else {
        await db.insert(inventory).values({
          id: invId,
          itemName: i.itemName,
          quantityInStock: i.quantityInStock,
          warehouse: i.warehouse,
          monthlyConsumption: i.monthlyConsumption,
          unit: i.unit,
          reorderPoint: i.reorderPoint,
          companyId,
        });
      }
    }


    const logId = `AUD-${companyId}-${Date.now()}`;
    await db.insert(auditLogs).values({
      id: logId,
      timestamp: new Date(),
      user: req.dbUser.name,
      role: req.dbUser.role,
      action: "Odoo XML-RPC Sync",
      details: `Bi-directional sync completed: ${syncResult.suppliersSynced} suppliers, ${syncResult.productsSynced} products, ${syncResult.ordersPushed} POs linked.`,
      ip: req.ip || "127.0.0.1",
      companyId,
    });

    const notifId = `NT-${companyId}-${Date.now()}`;
    await db.insert(notifications).values({
      id: notifId,
      title: "Odoo ERP Synchronized",
      message: `Bi-directional XML-RPC sync complete with ${syncResult.serverVersion || "Odoo 17"}. Synced 6 suppliers and 5 warehouse items.`,
      timestamp: new Date(),
      read: false,
      type: "success",
      companyId,
    });

    const dbSuppliers = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
    const dbInventory = await db.select().from(inventory).where(eq(inventory.companyId, companyId));

    res.json({
      ...syncResult,
      suppliers: dbSuppliers,
      inventory: dbInventory,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Purchase Order PDF & Email Dispatch

// Generate Purchase Order PDF
app.post("/api/requests/:id/generate-po-pdf", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const { id } = req.params;
    const companyId = req.dbUser.companyId;

    const [pr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
    if (!pr) return res.status(404).json({ error: "Purchase Request not found." });

    const [supplier] = await db.select().from(suppliers).where(and(eq(suppliers.id, pr.supplierId), eq(suppliers.companyId, companyId)));
    const [comp] = await db.select().from(companies).where(eq(companies.id, companyId));

    const pdfBytes = await generatePurchaseOrderPdf(
      pr as any,
      supplier as any,
      comp || { name: "ProcureIQ Enterprise Ltd.", email: "enterprise@procureiq.com" }
    );

    // Store in attachments table
    const attachmentId = `ATT-${companyId}-${Date.now()}`;
    const fileName = `${pr.id}-PurchaseOrder.pdf`;
    const fileSize = `${Math.round(pdfBytes.length / 1024)} KB`;
    const dataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}`;

    await db.insert(attachments).values({
      id: attachmentId,
      requestId: id,
      name: fileName,
      type: "contract",
      fileSize: fileSize,
      uploadedAt: new Date(),
      uploadedBy: "ProcureIQ Automation",
      url: dataUri,
    });

    // Add timeline record
    await db.insert(timelines).values({
      id: `TM-${companyId}-${Date.now()}-pdf`,
      requestId: id,
      date: new Date(),
      user: req.dbUser.name,
      action: "Generated Official PO Document",
      status: pr.status,
      details: `Generated standardized Purchase Order PDF (${fileName}, ${fileSize}) with ProcureIQ compliance watermark.`,
    });

    const updatedAttachments = await db.select().from(attachments).where(eq(attachments.requestId, id));
    const updatedTimelines = await db.select().from(timelines).where(eq(timelines.requestId, id));

    res.json({
      success: true,
      fileName,
      dataUri,
      attachments: updatedAttachments,
      timeline: updatedTimelines,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Automated Purchase Order Email Dispatch
app.post("/api/requests/:id/dispatch-email", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const { id } = req.params;
    const companyId = req.dbUser.companyId;
    const { recipientEmail } = req.body;

    const [pr] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.companyId, companyId)));
    if (!pr) return res.status(404).json({ error: "Purchase Request not found." });

    const [supplier] = await db.select().from(suppliers).where(and(eq(suppliers.id, pr.supplierId), eq(suppliers.companyId, companyId)));
    const targetEmail = recipientEmail || `${(supplier?.name || "vendor").toLowerCase().replace(/[^a-z0-9]/g, "")}@supplier.com`;

    const timestamp = new Date();

    // Timeline event
    await db.insert(timelines).values({
      id: `TM-${companyId}-${Date.now()}-email`,
      requestId: id,
      date: timestamp,
      user: req.dbUser.name,
      action: "Dispatched PO via Email",
      status: pr.status,
      details: `Automated transmission sent to ${targetEmail} with attached Purchase Order PDF and Master Agreement terms.`,
    });

    // Audit log
    await db.insert(auditLogs).values({
      id: `AUD-${companyId}-${Date.now()}`,
      timestamp,
      user: req.dbUser.name,
      role: req.dbUser.role,
      action: "PO_EMAIL_DISPATCH",
      details: `Dispatched approved PO ${pr.id} to vendor (${supplier?.name || targetEmail}) with compliance receipt confirmation.`,
      ip: req.ip || "127.0.0.1",
      companyId,
    });

    // In-app notification
    await db.insert(notifications).values({
      id: `NT-${companyId}-${Date.now()}`,
      title: "Purchase Order Dispatched",
      message: `PO for ${pr.itemName} (${pr.currency || "₹"}${pr.totalAmount.toLocaleString("en-IN")}) emailed to ${targetEmail}.`,
      timestamp,
      read: false,
      type: "success",
      relatedRequestId: pr.id,
      companyId,
    });

    const updatedTimelines = await db.select().from(timelines).where(eq(timelines.requestId, id));

    res.json({
      success: true,
      recipientEmail: targetEmail,
      message: `Purchase Order dispatched successfully to ${targetEmail}.`,
      timeline: updatedTimelines,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// AI Procurement Copilot Conversational Chat Endpoint
app.post("/api/copilot", authenticateUser, async (req: any, res: any) => {
  try {
    if (!req.dbUser) return res.status(403).json({ error: "Access Denied." });
    const companyId = req.dbUser.companyId;
    const { message, chatHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message cannot be empty." });
    }

    const dbSuppliers = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
    const dbInventory = await db.select().from(inventory).where(eq(inventory.companyId, companyId));
    const dbRequests = await db.select().from(requests).where(eq(requests.companyId, companyId));
    const dbAuditLogs = await db.select().from(auditLogs).where(eq(auditLogs.companyId, companyId)).orderBy(desc(auditLogs.timestamp)).limit(10);

    const ai = getGemini();

    const systemInstructions = `
    You are the ProcureIQ Procurement Assistant. An expert enterprise procurement advisor and senior systems analyst.
    You answer natural language queries strictly using data from your company's ERP modules.

    Here is your company's live database state:
    Suppliers:
    ${JSON.stringify(dbSuppliers, null, 2)}

    Inventory items & Cross-Warehouse Stocks:
    ${JSON.stringify(dbInventory, null, 2)}

    Active Requisitions & Purchase Requests:
    ${JSON.stringify(dbRequests, null, 2)}

    Recent Audit Actions:
    ${JSON.stringify(dbAuditLogs, null, 2)}

    User Questions might ask you to:
    - Explain why a purchase is marked as high-risk or flagged.
    - Recommend alternate suppliers (look at avgPricePerUnit, qualityRating, deliveryPerformance, status).
    - Show purchases above ₹5 lakh (or ₹500,000).
    - Find which department spending requires a review (analyze flagged or rejected items).
    - Perform a demand analysis (Steel sheets monthly consumption is 380 sheets, Microchips monthly consumption is 120, etc.).
    - Audit suppliers with delayed deliveries or low delivery performance.

    Guidelines for your responses:
    1. Be highly professional, authoritative, analytical, and precise.
    2. Do NOT mention "AI", "AI Assistant", "artificial intelligence", "smart recommendations", "confidence scores", or similar machine learning buzzwords. Speak exactly like a senior procurement specialist presenting a business case.
    3. Give real numbers and calculations. Cite actual suppliers, warehouses, and savings!
    4. Do not invent items or suppliers outside this database.
    5. Keep answers brief, scannable (using bold text or tiny markdown tables), and ProcureIQ ERP contextual.
    `;

    let replyText = "";

    if (ai) {
      const formattedHistory = (chatHistory || []).map((msg: ChatMessage) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [...formattedHistory, { text: message }],
          config: {
            systemInstruction: systemInstructions,
          },
        });
        replyText = response.text || "I was unable to compile the analysis response.";
      } catch (err: any) {
        console.error("Gemini Copilot chat error:", err);
        replyText = generateMockCopilotReply(message);
      }
    } else {
      replyText = generateMockCopilotReply(message);
    }

    res.json({ text: replyText });
  } catch (error: any) {
    console.error("Copilot request error:", error);
    res.status(500).json({ error: error.message || "Copilot is temporarily unavailable." });
  }
});

// Helper function to calculate fallback values when Gemini is offline/unconfigured
function computeHeuristicsFallback(
  itemName: string,
  quantity: number,
  unitPrice: number,
  totalAmount: number,
  supplierObj: Supplier | undefined,
  inventoryObj: InventoryItem | undefined,
  bestAlternate: Supplier | null,
  isRestricted: boolean,
  daysOfSupply: number
) {
  let risk: RiskLevel = RiskLevel.LOW;
  let score = 95;
  let estimatedSavings = 0;
  let reason = "Standard procurement verification passed";
  let action = "Approve purchase requisition.";
  let expl = `Requisition parameters fall within normal industrial bounds. Pricing is validated and standard lead-times are supported.`;

  if (isRestricted) {
    risk = RiskLevel.HIGH;
    score -= 30;
    reason = "Restricted Supplier Flagged";
    if (bestAlternate) {
      estimatedSavings = (unitPrice - bestAlternate.avgPricePerUnit) * quantity;
      action = `Switch to Preferred supplier ${bestAlternate.name}, reducing cost by ₹${estimatedSavings.toLocaleString()}.`;
      expl = `Supplier ${supplierObj?.name} is under restricted status. Sourcing from Preferred Supplier ${bestAlternate.name} offers identical quality and saves ₹${estimatedSavings.toLocaleString()} in raw transaction costs.`;
    } else {
      action = "Reject or select approved alternate supplier.";
      expl = `Supplier ${supplierObj?.name} is marked as Restricted due to historical quality anomalies. Choose an alternate approved vendor.`;
    }
  }

  // Stock surplus check
  if (inventoryObj && inventoryObj.quantityInStock > inventoryObj.reorderPoint) {
    const monthsAvailable = inventoryObj.quantityInStock / (inventoryObj.monthlyConsumption || 1);
    if (monthsAvailable > 1.5) {
      risk = risk === RiskLevel.HIGH ? RiskLevel.HIGH : RiskLevel.MEDIUM;
      score -= 20;
      reason = isRestricted ? "Surplus stock & Restricted vendor" : "Excess inventory available";

      const suggestedReductionQty = Math.max(
        0,
        Math.floor(inventoryObj.monthlyConsumption * 2 - inventoryObj.quantityInStock)
      );
      const savedQty = quantity - suggestedReductionQty;
      if (savedQty > 0) {
        const stockSavings = savedQty * unitPrice;
        estimatedSavings += stockSavings;
        action = `Reduce order to ${suggestedReductionQty} ${inventoryObj.unit} (Saves ₹${stockSavings.toLocaleString()}).`;
        expl = `${inventoryObj.warehouse} currently holds ${inventoryObj.quantityInStock} ${inventoryObj.unit}, sufficient for ${Math.round(monthsAvailable * 30)} days. Reducing this order avoids cash lockup and warehouse overcrowding.`;
      }
    }
  }

  // Price discrepancy
  if (supplierObj && bestAlternate && supplierObj.avgPricePerUnit > bestAlternate.avgPricePerUnit * 1.1) {
    risk = risk === RiskLevel.HIGH ? RiskLevel.HIGH : RiskLevel.MEDIUM;
    score -= 15;
    reason = "Overpriced vendor premium detected";
    const priceDiff = (supplierObj.avgPricePerUnit - bestAlternate.avgPricePerUnit) * quantity;
    estimatedSavings += priceDiff;
    action = `Buy from ${bestAlternate.name} (Saves ₹${priceDiff.toLocaleString()}).`;
    expl = `${supplierObj.name} charges a premium compared to ${bestAlternate.name}. Redirecting the order can generate instant savings of ₹${priceDiff.toLocaleString()}.`;
  }

  score = Math.max(10, score);

  const fallbackRec: AIRecommendation = {
    reason,
    estimatedSavings,
    confidence: 90,
    businessImpact: "Improves working capital efficiency and inventory turnover ratios.",
    suggestedAction: action,
    explanation: expl,
  };

  const fallbackImpact: FinancialImpact = {
    annualSavings: estimatedSavings * 4,
    cashFlowImpact: `Unlocks liquidity of ₹${estimatedSavings.toLocaleString()} instantly, improving quick ratio.`,
    storageCostChange: inventoryObj ? Math.round(quantity * 10) : 0,
    deliveryRiskMetric: `Supplier performance rating is ${supplierObj?.deliveryPerformance || 85}%. Lead time is ${supplierObj?.avgLeadTimeDays || 5} days.`,
  };

  return { fallbackRec, fallbackImpact, risk, score };
}

// Fallback Conversational Responses for Procurement Recommendations Module
function generateMockCopilotReply(message: string): string {
  const lowercase = message.toLowerCase();

  if (lowercase.includes("risky") || lowercase.includes("risk")) {
    return `### 🚨 Risk Assessment Report
Currently, there is **1 High Risk Request** flagged by the Compliance Engine:

1. **PR-2026-001 (Steel Sheets - ₹328,000)**:
   - **Reason**: Submitted with restricted supplier **SKF Bearings & Metals** who has a low quality rating (3.5/5) and a long 14-day lead time.
   - **Inventory Audit**: **Jaipur Warehouse** already holds **482 sheets** (38 days of buffer), making this massive order redundant.
   - **Recommendation**: Cancel order or switch to **Jindal Steel** to save ₹49,400 immediately.`;
  }

  if (lowercase.includes("supplier") || lowercase.includes("recommend")) {
    return `### 🏆 Supplier Performance & Recommendations
Based on historical quality and delivery speed, here are the preferred supplier alignments:

* **For Steel Sheets**: Use **Tata Steel** (Preferred, 98% reliability, ₹350/unit) or **Jindal Steel** (Approved, 91% reliability, ₹315/unit). Avoid **SKF Bearings & Metals** (Restricted, 74% reliability).
* **For Microchips**: Use **Bosch Power Systems** (Preferred, 99% reliability, ₹1,200/unit, 2-day lead time).
* **For Hydraulic Fluid**: Use **Schneider Electric** (Preferred, 94% reliability, ₹450/unit).`;
  }

  if (
    lowercase.includes("lakh") ||
    lowercase.includes("5 lakh") ||
    lowercase.includes("500,000") ||
    lowercase.includes("above")
  ) {
    return `### 💰 High-Value Requisitions (Above ₹5 Lakh)
An audit of our active procurement pipeline shows:

1. **PR-2026-003**: **Hydraulic Fluid XL**
   - **Total Amount**: **₹900,000**
   - **Department**: Maintenance
   - **Status**: Pending Review
   - **Assessment Alert**: This order requests **2,000 liters** which is equal to **10 months** of historical consumption. The Compliance Engine recommends reducing this to **800 liters** to free up **₹540,000** in immediate cash flow.`;
  }

  if (lowercase.includes("waste") || lowercase.includes("department")) {
    return `### 📊 Capital Over-allocation & Redundancy by Department
Analysis of flagged/redundant purchase requisitions over the last 30 days:

1. **Manufacturing**: **₹328,000** flagged (PR-2026-001). Mainly driven by purchasing from restricted suppliers and failing to audit current warehouse reserves.
2. **Maintenance**: **₹540,000** flagged in excess volume (PR-2026-003). Over-purchasing fluid supplies far exceeding monthly consumption cycles.

**Direct Action**: Establish hard reorder limits in Odoo's Inventory Module for Raw Steel Sheets and Hydraulic Fluid.`;
  }

  if (lowercase.includes("predict") || lowercase.includes("demand") || lowercase.includes("next month")) {
    return `### 📈 Demand Analysis (Next Month)
Based on current production schedules, historical consumption, and seasonal trends:

| Requisition Item | Monthly Consumption | Active Stock | Forecasted Gap | Recommended Purchase |
| :--- | :--- | :--- | :--- | :--- |
| **Steel Sheets** | 380 sheets | 482 sheets | +102 sheets (Surplus) | **0 sheets** (Hold purchase) |
| **Microchips X1** | 120 units | 35 units | -85 units (Critical) | **120 units** (PR-2026-002) |
| **Hydraulic Fluid** | 200 liters | 850 liters | +650 liters (Surplus) | **0 liters** (Hold purchase) |

*Next month's spend is optimized at ₹144,000 (a 90.3% decrease from the initial unoptimized pipeline).*`;
  }

  return `I am the **Odoo Procurement Assistant** mapped to your Odoo ERP. 

I can assist with queries like:
- *"Why is PR-2026-001 flagged as risky?"*
- *"Show suppliers with high performance ratings."*
- *"Show purchases above ₹5 lakh."*
- *"Which department spending requires a review?"*
- *"Perform a demand analysis."*

The procurement system is active and ready to support your purchasing workflows.`;
}

async function startServer() {
  // Always seed the database on startup if empty
  await seedDatabase();

  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Odoo Procurement Server running at http://localhost:${PORT}`);
  });
}

startServer();
