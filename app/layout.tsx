import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { baseMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/db";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

/* Favicon + logo are admin-editable (Admin → Settings → Logo & favicon). */
export async function generateMetadata(): Promise<Metadata> {
  let favicon = "/icon.svg";
  try {
    const s = await getSettings();
    if (s.faviconUrl) favicon = s.faviconUrl;
  } catch {
    /* fall back to the bundled icon */
  }
  return {
    ...baseMetadata(),
    icons: { icon: favicon, apple: favicon },
    manifest: "/manifest.webmanifest",
  };
}

export const viewport: Viewport = {
  themeColor: "#1F3A32",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={bricolage.variable}>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
