import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isValidSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const supplied = signature.replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const actual = Buffer.from(supplied, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function email(value: unknown): string | null {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? value.trim().toLowerCase()
    : null;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CAL_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get("x-cal-signature-256"), webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: Record<string, unknown> | null;
  try {
    body = record(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const payload = record(body?.payload);
  const event = typeof body?.triggerEvent === "string" ? body.triggerEvent : "";
  const bookingUid = typeof payload?.uid === "string" ? payload.uid : "";
  if (!payload || !bookingUid || !["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"].includes(event)) {
    // Acknowledge unrelated webhook triggers without retrying them.
    return NextResponse.json({ received: true, ignored: true });
  }

  const organizer = record(payload.organizer);
  const hostEmail = email(organizer?.email);
  const attendees = Array.isArray(payload.attendees) ? payload.attendees : [];
  const attendee = attendees.map(record).find((item) => email(item?.email));
  const patientEmail = email(attendee?.email);
  const scheduledAt = typeof payload.startTime === "string" ? payload.startTime : "";
  if (event !== "BOOKING_CANCELLED" && (!hostEmail || !patientEmail || !Number.isFinite(Date.parse(scheduledAt)))) {
    return NextResponse.json({ error: "Booking is missing a patient, host, or valid start time." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc("sync_cal_patient_appointment", {
    p_trigger_event: event,
    p_booking_uid: bookingUid,
    p_rescheduled_from_uid: typeof payload.rescheduledFromUid === "string" ? payload.rescheduledFromUid : null,
    p_patient_email: patientEmail,
    p_nutritionist_email: hostEmail,
    p_scheduled_at: scheduledAt || null,
    p_appointment_link: typeof payload.meetingUrl === "string" && payload.meetingUrl.startsWith("https://") ? payload.meetingUrl : null,
  });
  if (error) {
    console.error("[cal-webhook] Appointment sync failed:", error.message);
    return NextResponse.json({ error: "Appointment sync failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true, result: data });
}
