import type { Metadata } from "next";
import AdminShell from "./_shell";

export const metadata: Metadata = {
  title: "Admin | Sofora",
  robots: { index: false, follow: false },
};

/* NOTE (v3): the admin panel is gated by the Firestore `users` collection.
   - /admin/login is the only public admin page: a plain email + password
     form. The server checks the credentials against `users` (the account
     must have role "admin") and sets a signed httpOnly session cookie
     (see lib/admin-auth.ts).
   - /admin/users manages those accounts (add, change role, delete).
   - Every admin-only API route calls requireAdmin() first. The API goes
     through the Firebase Admin SDK, which bypasses Firestore security
     rules entirely — so the rules are NOT the protection here; the
     session cookie + users collection is.
   Public storefront endpoints that intentionally skip the gate:
   GET /api/products, GET /api/categories, POST /api/orders, and
   GET /api/orders/[id] (buyer token required, PII redacted). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
