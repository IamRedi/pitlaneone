import { headers } from "next/headers";

type StructuredError = {
  name: string;
  code: string | null;
  digest: string | null;
};

function errorShape(error: unknown): StructuredError {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  return {
    name: error instanceof Error ? error.name : "UnknownError",
    code: typeof record.code === "string" ? record.code.slice(0, 48) : null,
    digest: typeof record.digest === "string" ? record.digest.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : null
  };
}

/**
 * Emits a single JSON event for hosting logs. Error messages and user-provided
 * fields are deliberately omitted: they can contain customer or invoice data.
 */
export async function logServerFailure(action: string, error: unknown, context: Record<string, string | number | boolean | null> = {}) {
  const requestHeaders = await headers();
  console.error(JSON.stringify({
    schema: "pitlaneone.observability.v1",
    level: "error",
    event: "server_failure",
    action,
    request_id: requestHeaders.get("x-request-id") ?? null,
    error: errorShape(error),
    context,
    at: new Date().toISOString()
  }));
}
