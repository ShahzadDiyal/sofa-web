import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { IconMail, IconPhone, IconPin } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Contact Sofora — WhatsApp, phone or email. We confirm every order by phone before dispatch, then deliver anywhere in the UK with a two-person team.",
  alternates: { canonical: absoluteUrl("/contact") },
};

export default async function ContactPage() {
  const s = await getSettings();
  const wa = `https://wa.me/${s.phone.replace(/[^0-9]/g, "")}`;
  return (
    <div className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <p className="label-caps mb-3">Contact</p>
      <h1 className="text-[clamp(36px,4.5vw,54px)] leading-tight mb-4">Talk to a human</h1>
      <p className="text-body text-[17px] leading-relaxed mb-10 max-w-[52ch]">
        Questions about a sofa, your order, or pay on delivery? Message us on WhatsApp and
        we&apos;ll walk you through it.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <a href={wa} className="bg-white rounded-[20px] p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
          <span className="w-11 h-11 rounded-full bg-mint grid place-items-center text-forest"><IconPhone size={20} /></span>
          <span className="font-semibold">WhatsApp</span>
          <span className="text-sm text-muted">Fastest reply</span>
        </a>
        <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="bg-white rounded-[20px] p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
          <span className="w-11 h-11 rounded-full bg-mint grid place-items-center text-forest"><IconPhone size={20} /></span>
          <span className="font-semibold">Phone</span>
          <span className="text-sm text-muted">{s.phone}</span>
        </a>
        <a href={`mailto:${s.email}`} className="bg-white rounded-[20px] p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
          <span className="w-11 h-11 rounded-full bg-mint grid place-items-center text-forest"><IconMail size={20} /></span>
          <span className="font-semibold">Email</span>
          <span className="text-sm text-muted break-all">{s.email}</span>
        </a>
      </div>
      <div className="mt-8 bg-forest text-cream rounded-[20px] p-6 flex gap-4 items-start">
        <span className="w-11 h-11 rounded-full bg-forest-deep grid place-items-center flex-none"><IconPin size={20} /></span>
        <div>
          <div className="font-semibold">Visit / write</div>
          <p className="text-mint text-sm mt-1">{s.address}</p>
        </div>
      </div>
    </div>
  );
}
