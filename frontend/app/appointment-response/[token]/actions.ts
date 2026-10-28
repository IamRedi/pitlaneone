"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createServerSupabase } from "@/lib/supabase/server";

const responseSchema = z.object({
  token: z.string().uuid(),
  response: z.enum(["accepted", "declined", "cancelled"]),
});

export async function respondToAppointmentProposal(formData: FormData) {
  const parsed = responseSchema.safeParse({
    token: formData.get("token"),
    response: formData.get("response"),
  });

  if (!parsed.success) redirect("/" as Route);

  const supabase = await createServerSupabase();
  const { data: rawProposal } = await supabase
    .rpc("get_public_appointment_proposal", {
      input_token: parsed.data.token,
    })
    .maybeSingle();
  const proposal = rawProposal as { website_locale: string } | null;
  const { error } = parsed.data.response === "cancelled"
    ? await supabase.rpc("cancel_public_appointment_proposal", {
        input_token: parsed.data.token,
      })
    : await supabase.rpc("respond_public_appointment_proposal", {
        input_token: parsed.data.token,
        input_response: parsed.data.response,
      });
  const result = error ? "error" : parsed.data.response;
  const locale = proposal?.website_locale ?? "en";
  redirect(
    `/appointment-response/${parsed.data.token}?result=${result}&locale=${encodeURIComponent(locale)}` as Route,
  );
}
