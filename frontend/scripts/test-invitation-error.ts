import assert from "node:assert/strict";
import { companyInvitationDeliveryError, safeInvitationErrorSignature } from "../lib/invitation-error";

assert.match(companyInvitationDeliveryError(new Error("email rate limit exceeded")), /kufizuar perkohesisht/);
assert.match(companyInvitationDeliveryError(new Error("User already registered")), /Add member/);
assert.match(companyInvitationDeliveryError(new Error("invalid email address")), /nuk u pranua/);
assert.equal(
  safeInvitationErrorSignature(new Error("Failed for person@example.com and 11111111-1111-4111-8111-111111111111")),
  "Failed for <email> and <uuid>"
);

console.log("Company invitation error mapping tests passed.");
