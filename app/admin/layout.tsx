import type { Metadata } from "next";
import AdminShell from "./_shell";

export const metadata: Metadata = {
  title: "Admin | Sofora",
  robots: { index: false, follow: false },
};

/* NOTE (v2): the admin panel is gated by Firebase Auth.
   - /admin/login is the only public admin page. After sign-in, the server
     sets an httpOnly session cookie and checks it against the ADMIN_EMAILS
     allow-list (see lib/admin-auth.ts).
   - Every admin-only API route calls requireAdmin() first. The API goes
     through the Firebase Admin SDK, which bypasses Firestore security
     rules entirely — so the rules are NOT the protection here; the
     session cookie + allow-list is.
   Public storefront endpoints that intentionally skip the gate:
   GET /api/products, GET /api/categories, POST /api/orders, and
   GET /api/orders/[id] (buyer token required, PII redacted). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
