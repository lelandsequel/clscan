import { createObjectCsvWriter } from "csv-writer";
import PDFDocument from "pdfkit";
import { Readable } from "stream";
import * as db from "./db";

/**
 * Export scan data to CSV format
 */
export async function exportScansToCSV(chainId: number): Promise<string> {
  const chain = await db.getQrChainById(chainId);
  if (!chain) {
    throw new Error("Chain not found");
  }

  const scans = await db.getChainScans(chainId, 10000); // Get all scans
  const filePath = `/tmp/scans-${chainId}-${Date.now()}.csv`;
  
  // Create CSV in memory
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: "id", title: "Scan ID" },
      { id: "hashValue", title: "Hash Value" },
      { id: "chainIndex", title: "Chain Index" },
      { id: "isValid", title: "Valid" },
      { id: "scannedBy", title: "Scanned By User ID" },
      { id: "ipAddress", title: "IP Address" },
      { id: "userAgent", title: "User Agent" },
      { id: "errorMessage", title: "Error Message" },
      { id: "scannedAt", title: "Scanned At" },
    ],
  });

  await csvWriter.writeRecords(scans);
  return filePath;
}

/**
 * Export scan data to PDF format
 */
export async function exportScansToPDF(chainId: number): Promise<Buffer> {
  const chain = await db.getQrChainById(chainId);
  if (!chain) {
    throw new Error("Chain not found");
  }

  const scans = await db.getChainScans(chainId, 10000);
  const stats = await db.getChainStats(chainId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Header
    doc.fontSize(20).text("Morphing QR Code Report", { align: "center" });
    doc.moveDown();

    // Chain Information
    doc.fontSize(14).text("Chain Information", { underline: true });
    doc.fontSize(10);
    doc.text(`Name: ${chain.name}`);
    doc.text(`Description: ${chain.description || "N/A"}`);
    doc.text(`Chain Length: ${chain.chainLength}`);
    doc.text(`Current Index: ${chain.currentIndex}`);
    doc.text(`Remaining: ${chain.currentIndex + 1}`);
    doc.text(`Status: ${chain.isActive ? "Active" : "Inactive"}`);
    doc.text(`Created: ${chain.createdAt.toISOString()}`);
    doc.moveDown();

    // Statistics
    doc.fontSize(14).text("Statistics", { underline: true });
    doc.fontSize(10);
    doc.text(`Total Scans: ${stats.totalScans}`);
    doc.text(`Valid Scans: ${stats.validScans}`);
    doc.text(`Invalid Scans: ${stats.invalidScans}`);
    doc.text(`Success Rate: ${stats.totalScans > 0 ? ((stats.validScans / stats.totalScans) * 100).toFixed(1) : 0}%`);
    doc.moveDown();

    // Scan History
    doc.fontSize(14).text("Scan History", { underline: true });
    doc.fontSize(8);
    doc.moveDown(0.5);

    if (scans.length === 0) {
      doc.text("No scans recorded yet.");
    } else {
      // Table header
      const tableTop = doc.y;
      const col1X = 50;
      const col2X = 150;
      const col3X = 250;
      const col4X = 350;
      const col5X = 450;

      doc.font("Helvetica-Bold");
      doc.text("Time", col1X, tableTop);
      doc.text("Index", col2X, tableTop);
      doc.text("Valid", col3X, tableTop);
      doc.text("IP Address", col4X, tableTop);
      doc.text("Status", col5X, tableTop);

      doc.font("Helvetica");
      let y = tableTop + 20;

      // Limit to first 100 scans in PDF
      const displayScans = scans.slice(0, 100);

      for (const scan of displayScans) {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        const time = new Date(scan.scannedAt).toLocaleString();
        doc.text(time.substring(0, 16), col1X, y);
        doc.text(scan.chainIndex.toString(), col2X, y);
        doc.text(scan.isValid ? "✓" : "✗", col3X, y);
        doc.text(scan.ipAddress || "N/A", col4X, y);
        doc.text(scan.errorMessage || "Success", col5X, y, { width: 100 });

        y += 20;
      }

      if (scans.length > 100) {
        doc.moveDown();
        doc.fontSize(8).text(`... and ${scans.length - 100} more scans`, { align: "center" });
      }
    }

    // Footer
    doc.fontSize(8).text(
      `Generated on ${new Date().toISOString()}`,
      50,
      doc.page.height - 50,
      { align: "center" }
    );

    doc.end();
  });
}

/**
 * Generate CSV string from scan data (for API responses)
 */
export async function generateScanCSVString(chainId: number): Promise<string> {
  const scans = await db.getChainScans(chainId, 10000);
  
  const headers = ["Scan ID", "Hash Value", "Chain Index", "Valid", "Scanned By User ID", "IP Address", "User Agent", "Error Message", "Scanned At"];
  const rows = scans.map(scan => [
    scan.id,
    scan.hashValue,
    scan.chainIndex,
    scan.isValid,
    scan.scannedBy || "",
    scan.ipAddress || "",
    scan.userAgent || "",
    scan.errorMessage || "",
    new Date(scan.scannedAt).toISOString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return csvContent;
}
