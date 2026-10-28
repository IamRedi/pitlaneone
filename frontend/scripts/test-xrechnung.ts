import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createXRechnungXml, type XRechnungInvoice } from "../lib/xrechnung";

const fixture: XRechnungInvoice = {
  id: "11111111-1111-4111-8111-111111111111",
  invoice_number: "F-2026-000001",
  invoice_kind: "invoice",
  currency: "EUR",
  issued_at: "2026-08-05",
  due_date: "2026-08-19",
  net_amount: 100,
  tax_rate: 19,
  tax_amount: 19,
  total_amount: 119,
  invoice_snapshot: {
    accounting: {
      service_date: "2026-08-05",
      seller: {
        legal_name: "PitlaneOne Testwerkstatt GmbH",
        vat_id: "DE123456789",
        street: "Teststraße 1",
        postal_code: "10115",
        city: "Berlin",
        country_code: "DE",
        email: "rechnung@example.de",
        contact_name: "Max Mustermann",
        phone: "+49 30 1234567",
        iban: "DE02120300000000202051",
        payment_terms: "Zahlbar innerhalb von 14 Tagen."
      },
      buyer: {
        name: "Beispielkunde GmbH",
        street: "Kundenweg 2",
        postal_code: "20095",
        city: "Hamburg",
        country_code: "DE",
        customer_type: "business",
        electronic_address: "buchhaltung@example.com",
        electronic_address_scheme: "EM",
        buyer_reference: "BESTELLUNG-4711"
      }
    },
    service: { date: "2026-08-05" },
    items: [
      { name: "Bremsenservice", quantity: 1, line_total: 59.5 },
      { name: "Motoröl & Filter", quantity: 1, line_total: 59.5 }
    ]
  }
};

const generated = createXRechnungXml(fixture);
const rendered = new TextDecoder().decode(generated.bytes);
assert.match(rendered, /xrechnung_3\.0/);
assert.match(rendered, /<cbc:TaxExclusiveAmount currencyID="EUR">100\.00<\/cbc:TaxExclusiveAmount>/);
assert.match(rendered, /<cbc:TaxAmount currencyID="EUR">19\.00<\/cbc:TaxAmount>/);
assert.equal((rendered.match(/<cac:InvoiceLine>/g) ?? []).length, 2);
assert.equal((rendered.match(/<cbc:LineExtensionAmount currencyID="EUR">50\.00/g) ?? []).length, 2);
assert.equal(generated.report.validationStatus, "preflight_passed");

assert.throws(() => createXRechnungXml({
  ...fixture,
  invoice_snapshot: { accounting: { seller: {}, buyer: {} }, items: [] }
}), /data is incomplete/);

const output = process.argv[2];
if (output) {
  writeFileSync(output, generated.bytes);
  const credit = createXRechnungXml({
    ...fixture,
    invoice_number: "S-2026-000002",
    invoice_kind: "storno",
    invoice_snapshot: {
      ...(fixture.invoice_snapshot as Record<string, unknown>),
      related_invoice_number: "F-2026-000001"
    }
  });
  writeFileSync(output.replace(/\.xml$/i, "-credit.xml"), credit.bytes);
}
console.log("XRechnung generator preflight tests passed.");
