import { Resend } from "resend";

type LeadPayload = {
  email?: unknown;
  restaurant?: unknown;
  googleUrl?: unknown;
  problem?: unknown;
  locale?: unknown;
  website?: unknown;
};

type ValidLead = {
  email: string;
  restaurant: string;
  googleUrl: string;
  problem: string;
  locale: "pl" | "en";
};

type LeadDelivery = (lead: ValidLead) => Promise<{ accepted: boolean }>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function createLeadHandler(deliver: LeadDelivery) {
  return async function POST(request: Request) {
  let payload: LeadPayload;

  try {
    payload = (await request.json()) as LeadPayload;
  } catch {
    return Response.json({ outcome: "malformed" }, { status: 400 });
  }

  if (typeof payload.website === "string" && payload.website.trim()) {
    return Response.json({ outcome: "honeypot" });
  }

  const email = readText(payload.email, 254);
  const restaurant = readText(payload.restaurant, 160);
  const googleUrl = readText(payload.googleUrl, 2_000);
  const problem = readText(payload.problem, 3_000);
  const locale = payload.locale === "en" ? "en" : "pl";

  if (
    !email ||
    !EMAIL_PATTERN.test(email) ||
    !restaurant ||
    !googleUrl ||
    !isValidUrl(googleUrl) ||
    !problem
  ) {
    return Response.json({ outcome: "malformed" }, { status: 400 });
  }

  try {
    const delivery = await deliver({ email, restaurant, googleUrl, problem, locale });
    if (!delivery.accepted) {
      return Response.json({ outcome: "delivery_failed" }, { status: 502 });
    }
    return Response.json({ outcome: "accepted" });
  } catch {
    return Response.json({ outcome: "delivery_failed" }, { status: 502 });
  }
  };
}

async function deliverNotification({
  email,
  restaurant,
  googleUrl,
  problem,
  locale,
}: ValidLead): Promise<{ accepted: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.LEAD_NOTIFICATION_EMAIL;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "ReviewGuard <onboarding@resend.dev>";

  if (!apiKey || !notificationEmail) {
    console.error("Brakuje konfiguracji RESEND_API_KEY lub LEAD_NOTIFICATION_EMAIL.");
    return { accepted: false };
  }

  const resend = new Resend(apiKey);
  const message = [
    "New ReviewGuard pilot enquiry",
    "",
    `Language: ${locale.toUpperCase()}`,
    `Email: ${email}`,
    `Restaurant: ${restaurant}`,
    `Google Business Profile: ${googleUrl}`,
    "",
    "Current review workflow:",
    problem,
  ].join("\n");

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: notificationEmail,
      replyTo: email,
      subject: `ReviewGuard pilot (${locale.toUpperCase()}) - ${restaurant}`,
      text: message,
    });

    if (error) {
      console.error("Resend nie wysłał zgłoszenia:", error);
      return { accepted: false };
    }

    return { accepted: true };
  } catch (error) {
    console.error("Błąd wysyłki zgłoszenia:", error);
    return { accepted: false };
  }
}

export const POST = createLeadHandler(deliverNotification);
