import type { Metadata } from "next";
import { getSettings } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Returns & refusals",
  description:
    "Changed your mind at the door? Refuse delivery and pay nothing. Our 5-year frame guarantee covers manufacturing faults.",
  alternates: { canonical: absoluteUrl("/returns") },
};

export default async function ReturnsPage() {
  const s = await getSettings();
  return (
    <article className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <p className="label-caps mb-3">Returns &amp; refusals</p>
      <h1 className="text-[clamp(36px,4.5vw,54px)] leading-tight mb-8">Changed your mind? No problem.</h1>
      <div className="flex flex-col gap-6 text-[17px] leading-relaxed text-body">
        <h2 className="text-2xl text-ink">Refuse at the door</h2>
        <p>{s.refusalPolicy}</p>
        <h2 className="text-2xl text-ink mt-2">5-year frame guarantee</h2>
        <p>
          Many of our ranges carry a 5-year guarantee on the frame against manufacturing faults.
          If something isn&apos;t right with the build of your sofa, contact us and we&apos;ll make it right —
          repair, replacement or refund.
        </p>
        <h2 className="text-2xl text-ink mt-2">After delivery</h2>
        <p>
          If an issue appears after you&apos;ve accepted delivery, tell us within a reasonable time with
          photos of the problem. We&apos;ll arrange an inspection and, where the fault is ours, collect
          and replace the sofa or refund you.
        </p>
        <p>
          To start a return or report a fault:{" "}
          <a className="underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>
          {" "}or <a className="underline" href={`mailto:${s.email}`}>{s.email}</a>.
        </p>
      </div>
    </article>
  );
}
