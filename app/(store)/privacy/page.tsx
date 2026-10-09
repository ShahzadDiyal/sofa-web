import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Sofora collects and uses your details when you place a pay-on-delivery order.",
  alternates: { canonical: absoluteUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <p className="label-caps mb-3">Privacy policy</p>
      <h1 className="text-[clamp(36px,4.5vw,54px)] leading-tight mb-8">Privacy policy</h1>
      <div className="flex flex-col gap-6 text-[17px] leading-relaxed text-body">
        <p><strong className="text-ink">What we collect.</strong> When you place an order we collect your name, phone number, email (optional), delivery address, and any delivery notes you provide. We do not collect card or bank details — there is nothing to pay online.</p>
        <p><strong className="text-ink">How we use it.</strong> Your details are used to confirm your order by phone or text, deliver your sofa, and collect payment on delivery. We may contact you about your order only.</p>
        <p><strong className="text-ink">Who sees it.</strong> Your details are shared with our delivery team so they can complete your delivery. We never sell your details to third parties.</p>
        <p><strong className="text-ink">How long we keep it.</strong> Order records are kept for accounting and warranty purposes, then deleted on request.</p>
        <p><strong className="text-ink">Your rights.</strong> You can ask for a copy of your details, or for them to be corrected or deleted, at any time — just contact us.</p>
        <p><strong className="text-ink">Cookies.</strong> We use a small amount of local storage in your browser to remember your basket and wishlist. Analytics cookies (if enabled) help us understand how the site is used.</p>
      </div>
    </article>
  );
}
