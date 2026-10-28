import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { businessSiteImportedDraftSchema, businessSiteImportRequestSchema } from "../lib/business-site-import-contract";

const request = businessSiteImportRequestSchema.parse({ sourceUrl: " https://example.test/workshop " });
assert.equal(request.sourceUrl, "https://example.test/workshop");
assert.equal(request.preferredLocale, "de");
assert.equal(businessSiteImportRequestSchema.safeParse({}).success, false);
assert.equal(businessSiteImportRequestSchema.safeParse({ sourceUrl: "invalid" }).success, false);
assert.equal(businessSiteImportRequestSchema.safeParse({ sourceUrl: "https://example.test", preferredLocale: "unknown" }).success, false);

const minimumDraft = { name: "Demo workshop", sources: ["https://example.test/source"] };
const draft = businessSiteImportedDraftSchema.parse(minimumDraft);
assert.equal(draft.confidence, 0);
assert.equal(draft.description, "");
assert.deepEqual(draft.services, []);
assert.deepEqual(draft.imageUrls, []);
assert.equal(businessSiteImportedDraftSchema.safeParse({ ...minimumDraft, sources: [] }).success, false);
assert.equal(businessSiteImportedDraftSchema.safeParse({ ...minimumDraft, confidence: 2 }).success, false);
assert.equal(businessSiteImportedDraftSchema.safeParse({ ...minimumDraft, services: ["One", "Two", "Three", "Four"] }).success, false);
assert.equal(businessSiteImportedDraftSchema.safeParse({ ...minimumDraft, imageUrls: Array(13).fill("https://example.test/image.png") }).success, false);
assert.equal(z.string().uuid().safeParse(randomUUID()).success, true);
assert.equal(z.string().uuid().safeParse("not-a-uuid").success, false);

console.log("Validation upgrade regressions passed: input/defaults, bounded drafts and identifiers.");
