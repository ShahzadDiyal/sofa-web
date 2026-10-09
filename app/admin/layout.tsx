import type { Metadata } from "next";
import AdminShell from "./_shell";

export const metadata: Metadata = {
  title: "Admin | Sofora",
  robots: { index: false, follow: false },
};

/* NOTE (v1): the admin panel has no auth gate yet. Add Firebase Auth
   (e.g. an admin allow-list on custom claims) before exposing this
   publicly — the API routes already reject all browser writes via
   Firestore rules and serve only through the server. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
