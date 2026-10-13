/* Transactional email via Gmail (nodemailer) — order confirmations,
   query alerts, and new-coupon announcements.
   Credentials come ONLY from env vars (never committed):
     GMAIL_USER          — the Gmail address (sender)
     GMAIL_APP_PASSWORD  — a Gmail app password (2FA must be on)
     ADMIN_NOTIFY_EMAIL  — where admin copies go (defaults to GMAIL_USER)
   Every send is fire-and-forget and never throws: email must never break
   checkout, the contact form, or coupon creation. */

import nodemailer, { type Transporter } from "nodemailer";
import type { ContactQuery, Coupon, Order } from "./types";
import { absoluteUrl, siteUrl } from "./seo";

/* Sofora theme for email templates. */
const C = {
  forest: "#1f3a32",
  forestDeep: "#2e5247",
  cream: "#f6f1ea",
  peach: "#f4e1d6",
  terra: "#b65a35",
  ink: "#1e2421",
  muted: "#646a63",
  line: "#ddd3c4",
};

interface MailConfig {
  user: string;
  pass: string;
  adminEmail: string;
}

function mailConfig(): MailConfig | null {
  const user = (process.env.GMAIL_USER || "").trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || "").trim();
  if (!user || !pass) return null;
  return { user, pass, adminEmail: (process.env.ADMIN_NOTIFY_EMAIL || "").trim() || user };
}

let transporter: Transporter | null = null;

function getTransporter(cfg: MailConfig): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }
  return transporter;
}

/* Sends one email — resolves false (never rejects) when unconfigured or
   when sending fails, so callers can `void sendEmail(...)` safely. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const cfg = mailConfig();
    if (!cfg) return false;
    await getTransporter(cfg).sendMail({
      from: `Sofora <${cfg.user}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.warn("[email] send failed (non-fatal):", (err as Error)?.message ?? err);
    return false;
  }
}

export function emailConfigured(): boolean {
  return mailConfig() !== null;
}

export function adminNotifyEmail(): string | null {
  return mailConfig()?.adminEmail ?? null;
}

/* ------------------------------------------------------------------ */
/* Shared template shell                                              */
/* ------------------------------------------------------------------ */

function shell(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:Georgia,'Times New Roman',serif;color:${C.ink};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid ${C.line};">
<tr><td style="background:${C.forest};padding:28px 32px;text-align:center;">
<div style="color:#ffffff;font-size:28px;letter-spacing:2px;font-weight:bold;">SOFORA</div>
<div style="color:${C.peach};font-size:13px;letter-spacing:1px;margin-top:4px;">SOFAS WORTH COMING HOME TO</div>
</td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 8px;font-size:24px;color:${C.forest};">${title}</h1>
${body}
</td></tr>
<tr><td style="background:${C.forest};padding:20px 32px;text-align:center;">
<div style="color:#ffffff;font-size:13px;">Pay on delivery · Free UK delivery · 5-year guarantee</div>
<div style="margin-top:8px;"><a href="${siteUrl()}/uk" style="color:${C.peach};font-size:13px;">Visit Sofora</a></div>
</td></tr>
</table>
<div style="color:${C.muted};font-size:12px;margin-top:16px;">You're receiving this because of your recent activity on Sofora.</div>
</td></tr>
</table>
</body></html>`;
}

function cta(label: string, href: string): string {
  return `<div style="margin:24px 0;text-align:center;"><a href="${href}" style="display:inline-block;background:${C.terra};color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:999px;">${label}</a></div>`;
}

function money(n: number): string {
  return `£${n.toFixed(2)}`;
}

function orderItemsTable(order: Order): string {
  const rows = order.items
    .map(
      (i) => `<tr>
<td style="padding:12px 0;border-bottom:1px solid ${C.line};">
<div style="font-weight:bold;color:${C.ink};">${i.name}</div>
<div style="color:${C.muted};font-size:13px;font-family:Arial,Helvetica,sans-serif;">Qty ${i.qty} · ${i.fabric}</div>
</td>
<td align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};font-weight:bold;white-space:nowrap;">${money(i.price * i.qty)}</td>
</tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>`;
}

function orderTotals(order: Order): string {
  const lines: string[] = [];
  lines.push(`<div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:${C.muted};">Subtotal</span><span>${money(order.subtotal)}</span></div>`);
  if (order.discount) {
    lines.push(
      `<div style="display:flex;justify-content:space-between;padding:4px 0;color:${C.terra};"><span>Discount${order.couponCode ? ` (${order.couponCode})` : ""}</span><span>−${money(order.discount)}</span></div>`
    );
  }
  lines.push(
    `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:${C.muted};">Delivery</span><span>${order.deliveryFee === 0 ? "Free" : money(order.deliveryFee)}</span></div>`
  );
  lines.push(
    `<div style="display:flex;justify-content:space-between;padding:12px 0 0;border-top:2px solid ${C.forest};font-size:18px;font-weight:bold;color:${C.forest};"><span>Total due on delivery</span><span>${money(order.total)}</span></div>`
  );
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;">${lines.join("")}</div>`;
}

/* ------------------------------------------------------------------ */
/* Order emails                                                       */
/* ------------------------------------------------------------------ */

export async function sendOrderEmails(order: Order): Promise<void> {
  const cfg = mailConfig();
  if (!cfg) return;
  const cust = order.customer;
  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);

  // 1) Customer confirmation — pay on delivery.
  if (cust.email) {
    const body = `
<p style="color:${C.muted};font-size:15px;">Hi ${cust.name},</p>
<p style="font-size:15px;">Thanks for your order — it's reserved and we're preparing it. There's <strong>nothing to pay online</strong>: you pay the driver by cash, card or bank transfer after inspecting your sofa at the doorstep.</p>
<div style="background:${C.cream};border:1px solid ${C.line};border-radius:14px;padding:16px 20px;margin:16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
<div><strong>Order:</strong> ${order.number}</div>
<div><strong>Delivery:</strong> ${order.deliverySlot ?? "We'll call to arrange your slot"}</div>
<div><strong>Address:</strong> ${cust.address}, ${cust.city} ${cust.postcode}</div>
</div>
${orderItemsTable(order)}
${orderTotals(order)}
<p style="color:${C.muted};font-size:14px;">We'll call <strong>${cust.phone}</strong> shortly to confirm your delivery slot.</p>
${cta("Browse more sofas", absoluteUrl("/sofas"))}`;
    void sendEmail(cust.email, `Your Sofora order ${order.number} is confirmed`, shell(`Order ${order.number} confirmed`, `Your sofa is reserved — pay on delivery.`, body));
  }

  // 2) Admin alert.
  const adminBody = `
<p style="font-size:15px;"><strong>New order ${order.number}</strong> — ${itemCount} item${itemCount === 1 ? "" : "s"}, ${money(order.total)} due on delivery.</p>
${orderItemsTable(order)}
${orderTotals(order)}
<div style="background:${C.cream};border:1px solid ${C.line};border-radius:14px;padding:16px 20px;margin:16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
<div><strong>${cust.name}</strong> · ${cust.phone} · ${cust.email}</div>
<div>${cust.address}, ${cust.city} ${cust.postcode}</div>
<div><strong>Slot:</strong> ${order.deliverySlot ?? "—"} · <strong>Payment:</strong> ${order.paymentMethod}</div>
</div>
${cta("Open in admin", absoluteUrl(`/admin/orders/${order.id}`))}`;
  void sendEmail(
    cfg.adminEmail,
    `New order ${order.number} — ${money(order.total)}`,
    shell(`New order ${order.number}`, `${cust.name} — ${money(order.total)} due on delivery.`, adminBody)
  );
}

/* ------------------------------------------------------------------ */
/* Query emails                                                       */
/* ------------------------------------------------------------------ */

export async function sendQueryEmail(query: ContactQuery): Promise<void> {
  const cfg = mailConfig();
  if (!cfg) return;
  const body = `
<p style="font-size:15px;"><strong>${query.name}</strong> sent a new enquiry${query.subject && query.subject !== "Chat enquiry" ? ` about <strong>${query.subject}</strong>` : ""}.</p>
<div style="background:${C.cream};border:1px solid ${C.line};border-radius:14px;padding:16px 20px;margin:16px 0;font-size:15px;">
${query.message.replace(/\n/g, "<br>")}
</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${C.muted};">
<div><strong>Name:</strong> ${query.name}</div>
<div><strong>Email:</strong> <a href="mailto:${query.email}">${query.email}</a></div>
${query.phone ? `<div><strong>Phone/WhatsApp:</strong> ${query.phone}</div>` : ""}
</div>
${cta("Reply in admin", absoluteUrl("/admin/queries"))}`;
  void sendEmail(
    cfg.adminEmail,
    `New query from ${query.name}${query.subject && query.subject !== "Chat enquiry" ? `: ${query.subject}` : ""}`,
    shell("New customer query", `${query.name}: ${query.subject}`, body)
  );
}

/* ------------------------------------------------------------------ */
/* New-coupon announcement                                            */
/* ------------------------------------------------------------------ */

function couponDescription(coupon: Coupon): string {
  const value = coupon.type === "percent" ? `${coupon.value}% off` : `${money(coupon.value)} off`;
  const bits = [value];
  if (coupon.minSubtotal) bits.push(`on orders over ${money(coupon.minSubtotal)}`);
  if (coupon.productIds && coupon.productIds.length > 0) bits.push("on selected sofas");
  else bits.push("on all sofas");
  return bits.join(" ");
}

export async function sendNewCouponEmails(coupon: Coupon, recipients: { name?: string; email: string }[]): Promise<void> {
  const cfg = mailConfig();
  if (!cfg || recipients.length === 0) return;
  const subject = `New Sofora coupon: ${coupon.code} — ${couponDescription(coupon)}`;
  // Sequential sends with a small gap to stay friendly to Gmail's limits.
  for (const r of recipients) {
    const body = `
<p style="color:${C.muted};font-size:15px;">Hi${r.name ? ` ${r.name.split(" ")[0]}` : ""},</p>
<p style="font-size:15px;">We've just released a new discount code for you:</p>
<div style="text-align:center;margin:20px 0;">
<span style="display:inline-block;background:${C.peach};border:2px dashed ${C.terra};color:${C.forest};font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:22px;letter-spacing:3px;padding:14px 32px;border-radius:14px;">${coupon.code}</span>
</div>
<p style="font-size:16px;text-align:center;"><strong>${couponDescription(coupon)}</strong></p>
${coupon.endsAt ? `<p style="color:${C.muted};font-size:14px;text-align:center;">Hurry — ends ${new Date(coupon.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.</p>` : ""}
<p style="color:${C.muted};font-size:14px;">Enter the code at checkout and the discount applies automatically.</p>
${cta("Shop sofas", absoluteUrl("/coupons"))}`;
    void sendEmail(r.email, subject, shell("A new coupon just for you", `Use code ${coupon.code} — ${couponDescription(coupon)}.`, body));
    await new Promise((res) => setTimeout(res, 400));
  }
}
