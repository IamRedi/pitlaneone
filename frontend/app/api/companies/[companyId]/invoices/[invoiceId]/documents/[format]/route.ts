import { NextResponse } from "next/server";
import { requireCompanyContext, requireSaasUser } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string; invoiceId: string; format: string }> }
) {
  const { companyId, invoiceId, format } = await params;
  await requireCompanyContext(companyId);
  const { supabase } = await requireSaasUser();
  if (format !== "pdf" && format !== "xml") return NextResponse.json({ error: "Unsupported format." }, { status: 400 });

  const { data: document, error } = await supabase.from("invoice_documents")
    .select("storage_path, mime_type, original_filename, sha256")
    .eq("company_id", companyId).eq("invoice_id", invoiceId).eq("document_format", format).maybeSingle();
  if (error || !document) return NextResponse.json({ error: "Archived document not found." }, { status: 404 });

  const { data: file, error: downloadError } = await supabase.storage.from("invoice-archive").download(document.storage_path);
  if (downloadError || !file) return NextResponse.json({ error: "Archived file could not be read." }, { status: 404 });
  const bytes = await file.arrayBuffer();
  const filename = document.original_filename.replace(/["\r\n]/g, "-");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": document.mime_type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Invoice-SHA256": document.sha256
    }
  });
}
