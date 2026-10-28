# Evaluation security boundaries

This is source for reading and isolated evaluation. Do not connect it to an existing customer database or deploy it as a production workshop service without a separate release/security review.

Supabase Auth is verified server-side; company membership, capabilities, database RLS and guarded RPCs enforce different layers. The service-role credential bypasses RLS and must remain server-only. There are no supplied credentials or tenant records. Invoices/documents, uploads, XML/export surfaces and administrator paths require deployment-specific review.

Stripe live mode is not configured or certified. Use isolated test-mode products and explicitly approved test flows only. Source contract tests do not prove replay ordering, schema parity, every tenant/role boundary or payment behavior. Known source findings are listed in [KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

Do not put credentials, customer documents or database dumps into public issues. Existing private provider resources and internal runbooks are intentionally not included.
