import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = process.env.APPOINTMENT_AUTOMATION_TOKEN;
  const authorization = request.headers.get("authorization");
  if (!token || authorization !== `Bearer ${token}`) return new NextResponse(null, { status: 401 });

  const admin = createAdminSupabase();
  const { data, error } = await admin.rpc("materialize_due_appointment_work_tickets");
  if (error) return NextResponse.json({ error: "Appointment ticket automation failed." }, { status: 500 });
  return NextResponse.json({ created: Number(data ?? 0) });
}
