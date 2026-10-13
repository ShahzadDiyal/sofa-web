import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

/* Plain-text site summary for LLM crawlers, served at /llms.txt (domain root). */

export async function GET() {
  const lines = [
    `# ${SITE_NAME}`,
    ``,
    `> ${SITE_TAGLINE}`,
    ``,
    SITE_DESCRIPTION,
    ``,
    `## Key pages`,
    ``,
    `- Homepage: ${absoluteUrl("/")}`,
    `- Shop all sofas: ${absoluteUrl("/sofas")}`,
    `- Discount codes & offers: ${absoluteUrl("/coupons")}`,
    `- Delivery & cash-on-delivery info: ${absoluteUrl("/delivery")}`,
    `- Returns: ${absoluteUrl("/returns")}`,
    `- FAQs: ${absoluteUrl("/faqs")}`,
    `- Contact: ${absoluteUrl("/contact")}`,
    `- Blog: ${absoluteUrl("/blog")}`,
    ``,
    `## How ordering works`,
    ``,
    `- Customers order online with their details only — no online payment.`,
    `- Sofora confirms every order by phone.`,
    `- Delivery is by a two-person team to the customer's room of choice.`,
    `- The customer inspects the sofa at the doorstep, then pays the driver`,
    `  by cash, card, or bank transfer.`,
    ``,
    `## Sitemap`,
    ``,
    `- ${absoluteUrl("/sitemap.xml")}`,
    ``,
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
