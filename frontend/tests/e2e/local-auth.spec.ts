import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}; run this test through npm run test:e2e:local-auth.`);
  return value;
}

type MailpitAddress = { Address?: string };
type MailpitSummary = { ID: string; To?: MailpitAddress[]; Created?: string };

test("signup confirmation establishes a session and opens onboarding", async ({ page }) => {
  const supabaseUrl = required("E2E_LOCAL_SUPABASE_URL");
  const serviceRoleKey = required("E2E_LOCAL_SERVICE_ROLE_KEY");
  const mailpitUrl = required("E2E_LOCAL_MAILPIT_URL").replace(/\/$/, "");
  const email = `e2e-signup-${Date.now()}@example.test`;
  const password = "Local-E2E-Password-2026!";
  const companyName = `E2E Trial ${Date.now()}`;
  const companySlug = `e2e-trial-${Date.now()}`;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    await page.context().addCookies([{
      name: "PITLANEONE_LOCALE",
      value: "en",
      url: required("E2E_BASE_URL"),
      sameSite: "Lax"
    }]);
    await page.goto("/signup?next=%2Fonboarding%3Fnew%3D1");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator("form").getByRole("button").click();
    await expect(page.getByText("Check your email and confirm your account. Company creation will open next.", { exact: true })).toBeVisible();

    let confirmationUrl: string | null = null;
    await expect.poll(async () => {
      const response = await fetch(`${mailpitUrl}/api/v1/messages`);
      const payload = await response.json() as { messages?: MailpitSummary[] };
      const summary = payload.messages?.find((message) =>
        message.To?.some((recipient) => recipient.Address?.toLowerCase() === email)
      );
      if (!summary) return false;

      const detailResponse = await fetch(`${mailpitUrl}/api/v1/message/${summary.ID}`);
      const detail = await detailResponse.json() as { Text?: string; HTML?: string };
      const content = `${detail.Text ?? ""}\n${detail.HTML ?? ""}`.replaceAll("&amp;", "&");
      confirmationUrl = content.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/)?.[0] ?? null;
      return Boolean(confirmationUrl);
    }, { timeout: 15_000 }).toBe(true);

    if (!confirmationUrl) throw new Error("Confirmation email did not contain a verification URL.");
    await page.goto(confirmationUrl);
    await expect(page).toHaveURL(/\/onboarding\?new=1$/);
    await expect(page.getByRole("heading", { name: "Create your company", exact: true })).toBeVisible();

    await page.goto("/onboarding?new=1");
    await expect(page).toHaveURL(/\/onboarding\?new=1$/);
    await expect(page.getByRole("heading", { name: "Create your company", exact: true })).toBeVisible();

    const companyForm = page.locator("form").filter({ has: page.locator('input[name="slug"]') });
    await companyForm.locator('input[name="name"]').fill(companyName);
    await companyForm.locator('input[name="slug"]').fill(companySlug);
    await Promise.all([
      page.waitForURL(/\/app\/[0-9a-f-]+$/i),
      companyForm.getByRole("button").click()
    ]);
    const companyUrl = page.url();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(companyName);

    await page.goto("/onboarding");
    await expect(page).toHaveURL(companyUrl);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(companyName);
  } finally {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) {
      await admin.from("companies").delete().eq("created_by", user.id);
      await admin.from("billing_accounts").delete().eq("owner_user_id", user.id);
      await admin.auth.admin.deleteUser(user.id);
    }
  }
});
