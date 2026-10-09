import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/storefront";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Sofora's cookie policy: the essential, preference, analytics and marketing cookies we use, why, and how to manage or delete them in your browser.",
  alternates: { canonical: absoluteUrl("/cookies") },
};

const cookieTable: { category: string; purpose: string; examples: string }[] = [
  {
    category: "Strictly necessary",
    purpose:
      "Required for the site to work — remembering your basket, wishlist and checkout progress. The site cannot function without these.",
    examples: "Basket contents, wishlist, checkout session",
  },
  {
    category: "Preferences",
    purpose:
      "Remember choices you make, such as recently viewed sofas, so the site feels familiar on your next visit.",
    examples: "Recently viewed products, display preferences",
  },
  {
    category: "Analytics",
    purpose:
      "Help us understand how visitors use the site — which sofas are popular, where people drop off — so we can improve it. These are only set with your consent where required.",
    examples: "Aggregated page-view statistics",
  },
  {
    category: "Marketing",
    purpose:
      "Used only if we run advertising, to measure whether our adverts lead to visits. Never used to build advertising profiles without your consent.",
    examples: "Ad campaign measurement",
  },
];

export default async function CookiesPage() {
  const s = await getSettings();

  return (
    <article className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Cookie Policy | Sofora",
            url: absoluteUrl("/cookies"),
            description: metadata.description,
          },
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Cookie Policy", url: "/cookies" },
          ]),
        ]}
      />
      <p className="label-caps mb-3">Cookie policy</p>
      <h1 className="text-[clamp(36px,4.5vw,54px)] leading-tight mb-8">Cookie policy</h1>
      <div className="flex flex-col gap-6 text-[17px] leading-relaxed text-body">
        <p>
          This policy explains the cookies and similar browser storage Sofora uses, why we
          use them, and how you can control them. It sits alongside our{" "}
          <a className="underline" href="/privacy">privacy policy</a>.
        </p>

        <h2 className="text-2xl text-ink mt-2">What cookies are</h2>
        <p>
          Cookies are small text files stored on your device by your browser. We also use
          a small amount of local browser storage for the same purposes. Together they let
          the site remember things between pages — like what is in your basket — without
          us needing to identify you personally.
        </p>

        <h2 className="text-2xl text-ink mt-2">Cookies we use</h2>
        <div className="flex flex-col gap-4">
          {cookieTable.map((c) => (
            <div key={c.category} className="rounded-xl bg-cream/60 p-5">
              <p className="font-semibold text-ink mb-1.5">{c.category}</p>
              <p className="mb-1.5">{c.purpose}</p>
              <p className="text-[15px] text-muted">Examples: {c.examples}.</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl text-ink mt-2">Third-party cookies</h2>
        <p>
          If we embed third-party services — such as analytics or review widgets — those
          providers may set their own cookies, governed by their own policies. We keep
          third-party cookies to the minimum needed to run the site well.
        </p>

        <h2 className="text-2xl text-ink mt-2">Managing and deleting cookies</h2>
        <p>You are in control. You can:</p>
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>
            Delete cookies already stored, and block future cookies, in your browser
            settings (usually under Privacy or Settings).
          </li>
          <li>
            Browse in private or incognito mode, which discards cookies when you close
            the window.
          </li>
        </ul>
        <p>
          Blocking strictly necessary cookies will stop parts of the site working — for
          example, your basket will not be remembered between pages.
        </p>

        <h2 className="text-2xl text-ink mt-2">Questions</h2>
        <p>
          If you have questions about our use of cookies, contact us on{" "}
          <a className="underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>{" "}
          or <a className="underline" href={`mailto:${s.email}`}>{s.email}</a>.
        </p>

        <p className="text-[15px] text-muted">Last updated: October 2026.</p>
      </div>
    </article>
  );
}
