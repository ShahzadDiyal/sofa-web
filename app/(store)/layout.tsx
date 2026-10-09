import Script from "next/script";
import { getSettings, listFaqs } from "@/lib/db";
import { AnnouncementBar, Footer, Header } from "@/components/layout";
import { JsonLd } from "@/components/storefront";
import { faqJsonLd, howCodWorksJsonLd, orgJsonLd, websiteJsonLd } from "@/lib/seo";

/* Storefront shell: announcement bar, header, footer + global JSON-LD.
   Content (announcement messages, contact details) comes from settings,
   so it's editable from the admin panel. */

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, faqs] = await Promise.all([getSettings(), listFaqs()]);
  const gaId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  return (
    <>
      <JsonLd data={orgJsonLd(settings)} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={howCodWorksJsonLd()} />
      <JsonLd data={faqJsonLd(faqs)} />
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
      <AnnouncementBar messages={settings.announcementBar} />
      <Header />
      <main>{children}</main>
      <Footer settings={settings} />
    </>
  );
}
