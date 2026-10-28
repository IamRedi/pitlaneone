import assert from "node:assert/strict";
import { authHashRedirectTarget } from "../lib/auth-redirect";

const inviteHash = "#access_token=test&refresh_token=test&type=invite";
const invitePath = "/accept-invitation?invite=11111111-1111-4111-8111-111111111111";

assert.equal(
  authHashRedirectTarget({
    pathname: "/accept-invitation",
    search: "?invite=11111111-1111-4111-8111-111111111111",
    hash: inviteHash
  }),
  `/reset-password?next=${encodeURIComponent(invitePath)}${inviteHash}`
);

assert.equal(
  authHashRedirectTarget({
    pathname: "/reset-password",
    search: `?next=${encodeURIComponent(invitePath)}`,
    hash: inviteHash
  }),
  null,
  "The password page must consume the invite tokens instead of redirecting to itself."
);

assert.equal(
  authHashRedirectTarget({ pathname: "/reset-password", search: "", hash: "#type=recovery" }),
  null,
  "The recovery password page must not reload itself."
);

assert.equal(
  authHashRedirectTarget({ pathname: "/", search: "", hash: "#type=recovery&access_token=test" }),
  "/reset-password#type=recovery&access_token=test"
);

assert.equal(
  authHashRedirectTarget({ pathname: "/accept-invitation", search: "", hash: "#error_code=otp_expired&type=invite" }),
  "/admin-login?error=Linku%20i%20reset-it%20ka%20skaduar.%20Dergo%20nje%20link%20te%20ri."
);

console.log("Auth invitation/recovery redirect tests passed.");
