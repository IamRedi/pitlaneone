import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireCompanyContext, requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

function csv(value: unknown) {
  let rendered = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@]/.test(rendered)) rendered = `'${rendered}`;
  return `"${rendered.replace(/"/g, '""')}"`;
}

function csvFile(rows: Record<string, unknown>[]) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [headers.map(csv).join(",")];
  for (const row of rows) lines.push(headers.map((header) => csv(row[header])).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const context = await requireCompanyContext(companyId);
  if (context.role !== "owner") return NextResponse.json({ error: "Only the company owner can export company data." }, { status: 403 });
  const { supabase } = await requireSaasUser();

  const [customers, vehicles, services, serviceItems, inventory] = await Promise.all([
    supabase.from("clients").select("*").eq("company_id", companyId).order("created_at"),
    supabase.from("vehicles").select("*").eq("company_id", companyId).order("created_at"),
    supabase.from("services").select("*").eq("company_id", companyId).order("created_at"),
    supabase.from("service_items").select("*").eq("company_id", companyId).order("service_id").order("id"),
    supabase.from("company_inventory_items").select("*").eq("company_id", companyId).order("created_at")
  ]);
  const failed = [customers, vehicles, services, serviceItems, inventory].find((result) => result.error);
  if (failed?.error) return NextResponse.json({ error: "Company data could not be exported." }, { status: 500 });

  const zip = new JSZip();
  zip.file("customers.csv", csvFile((customers.data ?? []) as Record<string, unknown>[]));
  zip.file("vehicles.csv", csvFile((vehicles.data ?? []) as Record<string, unknown>[]));
  zip.file("services.csv", csvFile((services.data ?? []) as Record<string, unknown>[]));
  zip.file("service-items.csv", csvFile((serviceItems.data ?? []) as Record<string, unknown>[]));
  zip.file("inventory-items.csv", csvFile((inventory.data ?? []) as Record<string, unknown>[]));
  zip.file("README.txt", "PitlaneOne private company export\r\nContains portable CSV files for customers, vehicles, services, service lines and inventory items.\r\nUse the separate invoice accountant export for immutable invoice PDFs/XML, hashes and payment ledger.\r\nThis export is not a backup replacement; retain a protected copy and test imports before relying on it.\r\n");
  const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const body = new ArrayBuffer(archive.byteLength);
  new Uint8Array(body).set(archive);
  return new NextResponse(body, { headers: {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="pitlaneone-company-export-${companyId.slice(0, 8)}.zip"`,
    "Cache-Control": "private, no-store"
  }});
}
