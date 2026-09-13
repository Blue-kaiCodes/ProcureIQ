import { db } from "./index.ts";
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
} from "./schema.ts";
import {
  initialSuppliers,
  initialInventory,
  initialRequests,
} from "../data/seedData.ts";
import { count, eq } from "drizzle-orm";

export async function seedCompanyWorkspace(companyId: string) {
  try {
    // Check if suppliers already exist for this company
    const [supplierCount] = await db
      .select({ value: count() })
      .from(suppliers)
      .where(eq(suppliers.companyId, companyId));

    if (supplierCount.value > 0) {
      return; // Already seeded
    }

    console.log(`Seeding baseline data for company workspace: ${companyId}`);

    // Seed 2 Suppliers
    await db.insert(suppliers).values(
      initialSuppliers.slice(0, 2).map((s) => ({
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

    // Seed 2 Inventory items
    await db.insert(inventory).values(
      initialInventory.slice(0, 2).map((i) => ({
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

    // Seed 1 Purchase request
    const reqData = initialRequests[0];
    await db.insert(requests).values({
      id: `${companyId}-${reqData.id}`,
      itemName: reqData.itemName,
      quantity: reqData.quantity,
      unitPrice: reqData.unitPrice,
      currency: reqData.currency || "INR",
      totalAmount: reqData.totalAmount,
      department: reqData.department,
      supplierId: `${companyId}-${reqData.supplierId}`,
      status: reqData.status,
      riskLevel: reqData.riskLevel,
      healthScore: reqData.healthScore,
      createdAt: new Date(),
      requestedBy: reqData.requestedBy,
      description: reqData.description,
      priority: reqData.priority || "medium",
      expectedDeliveryDate: reqData.expectedDeliveryDate,
      purchasingInstructions: reqData.purchasingInstructions,
      aiRecommendation: reqData.aiRecommendation,
      financialImpact: reqData.financialImpact,
      companyId,
    });

    // Seed a baseline notification
    await db.insert(notifications).values({
      id: `NT-${companyId}-${Date.now()}`,
      title: "Workspace Configured",
      message: "ProcureIQ Enterprise workspace configured successfully. Baseline vendor contracts and material catalogs synced.",
      timestamp: new Date(),
      read: false,
      type: "success",
      companyId,
    });

    // Seed a baseline audit log
    await db.insert(auditLogs).values({
      id: `AUD-${companyId}-${Date.now()}`,
      timestamp: new Date(),
      user: "System",
      role: "System Administrator",
      action: "Workspace Seeding",
      details: "Initialized procurement workspace with standard master data, preferred vendor indexes, and material codes.",
      ip: "127.0.0.1",
      companyId,
    });
  } catch (err) {
    console.error(`Failed to seed company workspace ${companyId}:`, err);
  }
}

export async function seedDatabase() {
  try {
    // 1. Seed Demo Company
    const [demoCompanyCount] = await db.select({ value: count() }).from(companies).where(eq(companies.id, "DEMO-COMP"));
    if (demoCompanyCount.value === 0) {
      await db.insert(companies).values({
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
      console.log("Seeded default demo company workspace.");
    }

    const [userCount] = await db.select({ value: count() }).from(users);
    if (userCount.value > 0) {
      console.log("Database already seeded. Skipping...");
      return;
    }

    console.log("Seeding database (simulation users only)...");

    // 2. Seed Users tied to Demo Company
    const defaultUsers = [
      {
        id: "buyer-uid",
        email: "buyer@company.com",
        name: "Anil Sharma",
        role: "buyer",
        department: "Purchasing",
        companyId: "DEMO-COMP",
      },
      {
        id: "officer-uid",
        email: "officer@company.com",
        name: "Sarah Jenkins",
        role: "officer",
        department: "Procurement",
        companyId: "DEMO-COMP",
      },
      {
        id: "head-uid",
        email: "head@company.com",
        name: "Ravi Kumar",
        role: "head",
        department: "Manufacturing",
        companyId: "DEMO-COMP",
      },
      {
        id: "manager-uid",
        email: "manager@company.com",
        name: "Meera Nair",
        role: "manager",
        department: "Finance",
        companyId: "DEMO-COMP",
      },
      {
        id: "warehouse-uid",
        email: "warehouse@company.com",
        name: "Vijay Singh",
        role: "warehouse",
        department: "Warehouse Operations",
        companyId: "DEMO-COMP",
      },
      {
        id: "admin-uid",
        email: "admin@company.com",
        name: "Superuser (Admin)",
        role: "admin",
        department: "IT Operations",
        companyId: "DEMO-COMP",
      },
    ];

    await db.insert(users).values(defaultUsers);
    console.log("Seeded users. Seeding demo company baseline dataset...");
    await seedCompanyWorkspace("DEMO-COMP");
    console.log("Database seeded successfully with empty business state and a demo company!");
  } catch (err) {
    console.error("Failed to seed database:", err);
  }
}
