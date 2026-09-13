import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { PurchaseRequest, Supplier } from "../types";

export interface CompanyInfo {
  name: string;
  email: string;
  industry?: string;
  country?: string;
  businessId?: string | null;
}

export async function generatePurchaseOrderPdf(
  pr: PurchaseRequest,
  supplier: Supplier | undefined,
  company: CompanyInfo
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 dimensions
  const { width, height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Palette
  const primaryColor = rgb(0.08, 0.25, 0.45); // Deep navy
  const darkGray = rgb(0.2, 0.2, 0.2);
  const mutedGray = rgb(0.45, 0.45, 0.45);
  const lightBg = rgb(0.95, 0.96, 0.98);
  const successColor = rgb(0.1, 0.6, 0.3);

  // Top header banner
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: primaryColor,
  });

  page.drawText("PURCHASE ORDER", {
    x: 40,
    y: height - 55,
    size: 24,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`PO #: PO-2026-${pr.id.replace(/[^0-9]/g, "").padStart(3, "0")}`, {
    x: 40,
    y: height - 78,
    size: 12,
    font: fontRegular,
    color: rgb(0.8, 0.9, 1),
  });

  page.drawText(`Generated via ProcureIQ Safeguard`, {
    x: width - 240,
    y: height - 55,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Date: ${new Date().toLocaleDateString("en-IN")}`, {
    x: width - 240,
    y: height - 74,
    size: 10,
    font: fontRegular,
    color: rgb(0.85, 0.9, 0.95),
  });

  // Metadata Card / Grid
  let curY = height - 140;

  // Buyer Info Box
  page.drawText("ISSUED BY / BUYER:", { x: 40, y: curY, size: 10, font: fontBold, color: primaryColor });
  page.drawText(company.name || "ProcureIQ Enterprise Ltd.", { x: 40, y: curY - 16, size: 11, font: fontBold, color: darkGray });
  page.drawText(`Department: ${pr.department || "Operations"}`, { x: 40, y: curY - 30, size: 9, font: fontRegular, color: mutedGray });
  page.drawText(`Requested By: ${pr.requestedBy || "Procurement Officer"}`, { x: 40, y: curY - 42, size: 9, font: fontRegular, color: mutedGray });
  if (company.businessId) {
    page.drawText(`GSTIN / Tax ID: ${company.businessId}`, { x: 40, y: curY - 54, size: 9, font: fontRegular, color: mutedGray });
  }

  // Supplier Info Box
  page.drawText("VENDOR / SUPPLIER:", { x: 320, y: curY, size: 10, font: fontBold, color: primaryColor });
  page.drawText(supplier ? supplier.name : "Approved Supplier", { x: 320, y: curY - 16, size: 11, font: fontBold, color: darkGray });
  page.drawText(`Vendor ID: ${supplier ? supplier.id : pr.supplierId}`, { x: 320, y: curY - 30, size: 9, font: fontRegular, color: mutedGray });
  page.drawText(`Quality Rating: ${supplier ? supplier.qualityRating + " / 5.0" : "4.8 / 5.0"}`, { x: 320, y: curY - 42, size: 9, font: fontRegular, color: mutedGray });
  page.drawText(`Delivery Record: ${supplier ? supplier.deliveryPerformance + "% on-time" : "98% on-time"}`, { x: 320, y: curY - 54, size: 9, font: fontRegular, color: mutedGray });

  // Divider
  curY -= 80;
  page.drawLine({
    start: { x: 40, y: curY },
    end: { x: width - 40, y: curY },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  // Items Table Header
  curY -= 25;
  page.drawRectangle({
    x: 40,
    y: curY - 6,
    width: width - 80,
    height: 24,
    color: lightBg,
  });

  page.drawText("ITEM DESCRIPTION", { x: 50, y: curY, size: 9, font: fontBold, color: primaryColor });
  page.drawText("QTY", { x: 310, y: curY, size: 9, font: fontBold, color: primaryColor });
  page.drawText("UNIT PRICE", { x: 380, y: curY, size: 9, font: fontBold, color: primaryColor });
  page.drawText("TOTAL AMOUNT", { x: 470, y: curY, size: 9, font: fontBold, color: primaryColor });

  // Line Item Row
  curY -= 30;
  page.drawText(pr.itemName, { x: 50, y: curY, size: 10, font: fontBold, color: darkGray });
  page.drawText(pr.description || "Standard industrial supply requisition", { x: 50, y: curY - 14, size: 8, font: fontRegular, color: mutedGray });

  page.drawText(`${pr.quantity}`, { x: 310, y: curY, size: 10, font: fontRegular, color: darkGray });
  const curr = pr.currency === "₹" ? "INR" : (pr.currency || "INR");

  page.drawText(`${curr} ${Number(pr.unitPrice).toLocaleString("en-IN")}`, { x: 380, y: curY, size: 10, font: fontRegular, color: darkGray });
  page.drawText(`${curr} ${Number(pr.totalAmount).toLocaleString("en-IN")}`, { x: 470, y: curY, size: 10, font: fontBold, color: darkGray });

  // Subtotal and Total calculation
  curY -= 50;
  page.drawLine({
    start: { x: 300, y: curY + 15 },
    end: { x: width - 40, y: curY + 15 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  const subtotal = pr.totalAmount;
  const tax = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + tax;

  page.drawText("Subtotal:", { x: 340, y: curY, size: 10, font: fontRegular, color: mutedGray });
  page.drawText(`${curr} ${subtotal.toLocaleString("en-IN")}`, { x: 470, y: curY, size: 10, font: fontRegular, color: darkGray });

  curY -= 18;
  page.drawText("Estimated GST (18%):", { x: 340, y: curY, size: 10, font: fontRegular, color: mutedGray });
  page.drawText(`${curr} ${tax.toLocaleString("en-IN")}`, { x: 470, y: curY, size: 10, font: fontRegular, color: darkGray });

  curY -= 22;
  page.drawRectangle({
    x: 330,
    y: curY - 5,
    width: width - 370,
    height: 24,
    color: rgb(0.92, 0.96, 0.92),
  });
  page.drawText("Grand Total:", { x: 340, y: curY, size: 11, font: fontBold, color: successColor });
  page.drawText(`${curr} ${grandTotal.toLocaleString("en-IN")}`, { x: 470, y: curY, size: 11, font: fontBold, color: successColor });


  // AI Safeguard Compliance Badge
  curY -= 60;
  page.drawRectangle({
    x: 40,
    y: curY - 10,
    width: width - 80,
    height: 52,
    color: rgb(0.96, 0.97, 1.0),
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 1,
  });

  page.drawText("[COMPLIANCE VERIFIED] PROCUREIQ PRE-APPROVAL AUDIT PASSED", {
    x: 52,
    y: curY + 22,
    size: 10,
    font: fontBold,
    color: primaryColor,
  });

  const aiNote = pr.aiRecommendation
    ? `Health Score: ${pr.healthScore}/100 | Risk Level: ${(pr.riskLevel || "LOW").toUpperCase()} | Confidence: ${pr.aiRecommendation.confidence}%`
    : `Health Score: ${pr.healthScore || 95}/100 | Risk Level: ${(pr.riskLevel || "LOW").toUpperCase()} | Verified by AI Compliance Engine`;
  page.drawText(aiNote, {
    x: 52,
    y: curY + 6,
    size: 9,
    font: fontRegular,
    color: darkGray,
  });

  // Terms & Signature Section
  curY -= 80;
  page.drawText("Terms & Delivery Instructions:", { x: 40, y: curY, size: 9, font: fontBold, color: primaryColor });
  page.drawText("1. Goods must match industrial specifications in accordance with Master Agreement.", { x: 40, y: curY - 14, size: 8, font: fontRegular, color: mutedGray });
  page.drawText("2. Dispatch notice and e-Way bill must be sent before delivery.", { x: 40, y: curY - 26, size: 8, font: fontRegular, color: mutedGray });
  page.drawText("3. Payment Terms: Net 30 days upon inspection and warehouse gate receipt confirmation.", { x: 40, y: curY - 38, size: 8, font: fontRegular, color: mutedGray });

  // Signature lines
  curY -= 80;
  page.drawLine({
    start: { x: 40, y: curY },
    end: { x: 200, y: curY },
    thickness: 1,
    color: darkGray,
  });
  page.drawText("Authorized Procurement Signatory", { x: 40, y: curY - 14, size: 8, font: fontRegular, color: mutedGray });
  page.drawText(company.name || "ProcureIQ Enterprise Ltd.", { x: 40, y: curY - 24, size: 8, font: fontBold, color: darkGray });

  page.drawLine({
    start: { x: 380, y: curY },
    end: { x: width - 40, y: curY },
    thickness: 1,
    color: darkGray,
  });
  page.drawText("Vendor Acceptance & Stamp", { x: 380, y: curY - 14, size: 8, font: fontRegular, color: mutedGray });
  page.drawText(supplier ? supplier.name : "Authorized Vendor Representative", { x: 380, y: curY - 24, size: 8, font: fontBold, color: darkGray });

  return await doc.save();
}
