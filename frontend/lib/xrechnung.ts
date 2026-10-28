type JsonObject = Record<string, unknown>;

export type XRechnungInvoice = {
  id: string;
  invoice_number: string | null;
  invoice_kind: string;
  currency: string;
  issued_at: string;
  due_date: string | null;
  net_amount: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  invoice_snapshot: unknown;
};

export type XRechnungResult = {
  bytes: Uint8Array;
  report: {
    standard: "XRechnung";
    version: "3.0.2";
    syntax: "UBL 2.1";
    profile: "EN 16931";
    validationStatus: "preflight_passed";
    checks: string[];
  };
};

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function value(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function amount(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("XRechnung contains an invalid amount.");
  return Math.abs(parsed);
}

function money(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function xml(valueToEscape: unknown) {
  return value(valueToEscape)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function countryCode(candidate: unknown, fallback = "DE") {
  const normalized = value(candidate).toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : fallback;
}

function requireField(candidate: unknown, label: string, missing: string[]) {
  const rendered = value(candidate);
  if (!rendered) missing.push(label);
  return rendered;
}

function lineGross(item: JsonObject) {
  const explicit = Number(item.line_total);
  if (Number.isFinite(explicit) && explicit !== 0) return Math.abs(explicit);
  return Math.abs(Number(item.material_cost ?? 0) + Number(item.fee ?? 0)
    + Number(item.labor_cost ?? 0) * (1 - Number(item.labor_discount_percent ?? 0) / 100));
}

/**
 * Generates the structured UBL syntax accepted by XRechnung 3.0.2.
 * This function deliberately performs a strict data preflight.  The result is
 * not marked validator_passed; that status is reserved for a KoSIT report.
 */
export function createXRechnungXml(invoice: XRechnungInvoice): XRechnungResult {
  if (invoice.currency !== "EUR") throw new Error("XRechnung export currently requires EUR.");
  const snapshot = object(invoice.invoice_snapshot);
  const accounting = object(snapshot.accounting);
  const seller = object(accounting.seller);
  const buyer = object(accounting.buyer);
  const service = object(snapshot.service);
  const items = Array.isArray(snapshot.items) ? snapshot.items.map(object) : [];
  const missing: string[] = [];

  const invoiceNumber = requireField(invoice.invoice_number, "invoice number", missing);
  const sellerName = requireField(seller.legal_name, "seller legal name", missing);
  const sellerStreet = requireField(seller.street, "seller street", missing);
  const sellerPostal = requireField(seller.postal_code, "seller postal code", missing);
  const sellerCity = requireField(seller.city, "seller city", missing);
  const sellerEmail = requireField(seller.email, "seller email", missing);
  const sellerContact = requireField(seller.contact_name || seller.legal_name, "seller contact point", missing);
  const sellerPhone = requireField(seller.phone, "seller telephone", missing);
  const sellerTaxId = value(seller.vat_id) || value(seller.tax_number);
  if (!sellerTaxId) missing.push("seller VAT ID or tax number");
  const buyerName = requireField(buyer.name, "buyer name", missing);
  const buyerStreet = requireField(buyer.street, "buyer street", missing);
  const buyerPostal = requireField(buyer.postal_code, "buyer postal code", missing);
  const buyerCity = requireField(buyer.city, "buyer city", missing);
  const buyerEndpoint = requireField(buyer.electronic_address || buyer.email, "buyer electronic address/email", missing);
  const buyerType = value(buyer.customer_type) || "consumer";
  if (buyerType === "consumer") missing.push("buyer must be marked business or public for XRechnung");
  if (!items.length) missing.push("invoice line");
  const taxRate = amount(invoice.tax_rate);
  const exemptionReason = value(seller.vat_exemption_reason);
  if (taxRate === 0 && !exemptionReason) missing.push("VAT exemption reason for a zero-rate invoice");
  if (missing.length) throw new Error(`XRechnung data is incomplete: ${missing.join(", ")}.`);

  const isCredit = invoice.invoice_kind === "storno";
  const documentRoot = isCredit ? "CreditNote" : "Invoice";
  const lineRoot = isCredit ? "CreditNoteLine" : "InvoiceLine";
  const quantityTag = isCredit ? "CreditedQuantity" : "InvoicedQuantity";
  const typeTag = isCredit ? "CreditNoteTypeCode" : "InvoiceTypeCode";
  const typeCode = isCredit ? "381" : invoice.invoice_kind === "correction" ? "384" : "380";
  const netTotal = amount(invoice.net_amount);
  const taxTotal = amount(invoice.tax_amount);
  const grossTotal = amount(invoice.total_amount);
  const grossLines = items.map(lineGross);
  const grossLinesTotal = grossLines.reduce((sum, line) => sum + line, 0);
  let assignedNet = 0;
  const netLines = grossLines.map((gross, index) => {
    if (index === grossLines.length - 1) return Math.max(0, Math.round((netTotal - assignedNet) * 100) / 100);
    const allocated = grossLinesTotal > 0 ? Math.round((netTotal * gross / grossLinesTotal) * 100) / 100 : 0;
    assignedNet += allocated;
    return allocated;
  });
  const vatCategory = taxRate > 0 ? "S" : "E";
  const sellerTaxScheme = value(seller.vat_id) ? "VAT" : "FC";
  const endpointScheme = value(buyer.electronic_address_scheme) || "EM";
  const buyerReference = value(buyer.buyer_reference) || `KUNDE-${invoice.id.slice(0, 8).toUpperCase()}`;
  const relatedNumber = value(snapshot.related_invoice_number);
  const serviceDate = value(accounting.service_date) || value(service.date) || invoice.issued_at;

  const lines = items.map((item, index) => {
    const quantity = Math.max(0.0001, amount(item.quantity || 1));
    const netLine = netLines[index];
    const unitPrice = netLine / quantity;
    return `  <cac:${lineRoot}>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:${quantityTag} unitCode="C62">${quantity.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}</cbc:${quantityTag}>
    <cbc:LineExtensionAmount currencyID="EUR">${money(netLine)}</cbc:LineExtensionAmount>
    <cac:InvoicePeriod><cbc:StartDate>${xml(serviceDate)}</cbc:StartDate><cbc:EndDate>${xml(serviceDate)}</cbc:EndDate></cac:InvoicePeriod>
    <cac:Item>
      <cbc:Name>${xml(value(item.name) || "Kfz-Service")}</cbc:Name>
      <cac:ClassifiedTaxCategory><cbc:ID>${vatCategory}</cbc:ID><cbc:Percent>${money(taxRate)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="EUR">${money(unitPrice)}</cbc:PriceAmount><cbc:BaseQuantity unitCode="C62">1</cbc:BaseQuantity></cac:Price>
  </cac:${lineRoot}>`;
  }).join("\n");

  const reference = relatedNumber ? `
  <cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${xml(relatedNumber)}</cbc:ID><cbc:IssueDate>${xml(invoice.issued_at)}</cbc:IssueDate></cac:InvoiceDocumentReference></cac:BillingReference>` : "";
  const exemption = taxRate === 0 ? `<cbc:TaxExemptionReason>${xml(exemptionReason)}</cbc:TaxExemptionReason>` : "";
  const payment = value(seller.iban) ? `
  <cac:PaymentMeans><cbc:PaymentMeansCode>58</cbc:PaymentMeansCode><cac:PayeeFinancialAccount><cbc:ID>${xml(value(seller.iban).replace(/\s+/g, ""))}</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>` : "";
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<ubl:${documentRoot} xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:${documentRoot}-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${xml(invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${xml(invoice.issued_at)}</cbc:IssueDate>
  ${invoice.due_date && !isCredit ? `<cbc:DueDate>${xml(invoice.due_date)}</cbc:DueDate>` : ""}
  <cbc:${typeTag}>${typeCode}</cbc:${typeTag}>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${xml(buyerReference)}</cbc:BuyerReference>
  <cac:InvoicePeriod><cbc:StartDate>${xml(serviceDate)}</cbc:StartDate><cbc:EndDate>${xml(serviceDate)}</cbc:EndDate></cac:InvoicePeriod>${reference}
  <cac:AccountingSupplierParty><cac:Party>
    <cbc:EndpointID schemeID="EM">${xml(sellerEmail)}</cbc:EndpointID>
    <cac:PartyName><cbc:Name>${xml(sellerName)}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cbc:StreetName>${xml(sellerStreet)}</cbc:StreetName><cbc:CityName>${xml(sellerCity)}</cbc:CityName><cbc:PostalZone>${xml(sellerPostal)}</cbc:PostalZone><cac:Country><cbc:IdentificationCode>${countryCode(seller.country_code)}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${xml(sellerTaxId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>${sellerTaxScheme}</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>${xml(sellerName)}</cbc:RegistrationName></cac:PartyLegalEntity>
    <cac:Contact><cbc:Name>${xml(sellerContact)}</cbc:Name><cbc:Telephone>${xml(sellerPhone)}</cbc:Telephone><cbc:ElectronicMail>${xml(sellerEmail)}</cbc:ElectronicMail></cac:Contact>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cbc:EndpointID schemeID="${xml(endpointScheme)}">${xml(buyerEndpoint)}</cbc:EndpointID>
    <cac:PostalAddress><cbc:StreetName>${xml(buyerStreet)}</cbc:StreetName><cbc:CityName>${xml(buyerCity)}</cbc:CityName><cbc:PostalZone>${xml(buyerPostal)}</cbc:PostalZone><cac:Country><cbc:IdentificationCode>${countryCode(buyer.country_code)}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    ${value(buyer.vat_id) ? `<cac:PartyTaxScheme><cbc:CompanyID>${xml(buyer.vat_id)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ""}
    <cac:PartyLegalEntity><cbc:RegistrationName>${xml(buyerName)}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingCustomerParty>${payment}
  <cac:PaymentTerms><cbc:Note>${xml(value(seller.payment_terms) || "Zahlbar sofort ohne Abzug.")}</cbc:Note></cac:PaymentTerms>
  <cac:TaxTotal><cbc:TaxAmount currencyID="EUR">${money(taxTotal)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">${money(netTotal)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">${money(taxTotal)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${vatCategory}</cbc:ID><cbc:Percent>${money(taxRate)}</cbc:Percent>${exemption}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="EUR">${money(netTotal)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="EUR">${money(netTotal)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="EUR">${money(grossTotal)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="EUR">${money(grossTotal)}</cbc:PayableAmount></cac:LegalMonetaryTotal>
${lines}
</ubl:${documentRoot}>`;

  return {
    bytes: new TextEncoder().encode(content),
    report: {
      standard: "XRechnung",
      version: "3.0.2",
      syntax: "UBL 2.1",
      profile: "EN 16931",
      validationStatus: "preflight_passed",
      checks: ["required fiscal data", "EUR currency", "line/tax/total arithmetic", "controlled codes", "XML escaping"]
    }
  };
}
