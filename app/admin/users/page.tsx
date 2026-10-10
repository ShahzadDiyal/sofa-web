"use client";

/* Admin → Users: accounts in the Firestore `users` collection.
   Add accounts (email + password + role) and switch any account between
   admin and user. Only accounts with the admin role can sign in at
   /admin/login. The last admin account can't be demoted or deleted. */

import { useEffect, useState } from "react";
import { IconTrash } from "@/components/Icons";
import type { AdminRole, AdminUser } from "@/lib/admin-users";
import {
  Card,
  EmptyState,
  ErrorBox,
  SkeletonTable,
  api,
  btnAdmin,
  btnAdminPrimary,
  fieldClass,
  tdClass,
  thClass,
} from "../_ui";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("user");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    api<{ users: AdminUser[] }>("/api/admin/users")
      .then(({ users }) => {
        setUsers(users);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load users."));
  };
  useEffect(load, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter an email and a password.");
    setAdding(true);
    try {
      await api("/api/admin/users", "POST", { email: email.trim(), password, role });
      setEmail("");
      setPassword("");
      setRole("user");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add user.");
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (userEmail: string, next: AdminRole) => {
    try {
      await api("/api/admin/users", "PATCH", { email: userEmail, role: next });
      setError("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change role.");
    }
  };

  const remove = async (userEmail: string) => {
    if (!window.confirm(`Delete ${userEmail}? They will no longer be able to sign in.`)) return;
    setDeleting(userEmail);
    try {
      await api(`/api/admin/users?email=${encodeURIComponent(userEmail)}`, "DELETE");
      setError("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete user.");
    } finally {
      setDeleting(null);
    }
  };

  const fmtDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[30px]">Users</h1>
        <p className="text-muted text-[14px] mt-1">
          {users === null ? "Loading…" : `${users.length} account${users.length === 1 ? "" : "s"}`}.
          Only accounts with the <strong>admin</strong> role can sign in at /admin/login.
          Accounts can also be added directly in Firestore (collection <code>users</code>).
        </p>
      </div>

      {error && <ErrorBox message={error} />}

      <Card>
        <h2 className="text-[18px] font-semibold mb-4">Add account</h2>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={fieldClass}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink">Password</span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={fieldClass}
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className={fieldClass}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit" disabled={adding} className={btnAdminPrimary}>
            {adding ? "Adding…" : "Add"}
          </button>
        </form>
      </Card>

      <Card>
        {users === null ? (
          <SkeletonTable rows={5} cols={4} />
        ) : users.length === 0 ? (
          <EmptyState title="No accounts yet" hint="Add the first admin account above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Role</th>
                  <th className={thClass}>Added</th>
                  <th className={thClass}> </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email} className="border-t border-line">
                    <td className={tdClass}>
                      <span className="font-medium text-ink">{u.email}</span>
                    </td>
                    <td className={tdClass}>
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.email, e.target.value as AdminRole)}
                        className={`${fieldClass} !w-auto !py-1.5 text-[13px] font-semibold`}
                        aria-label={`Role for ${u.email}`}
                      >
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                      </select>
                    </td>
                    <td className={tdClass}>{fmtDate(u.createdAt)}</td>
                    <td className={`${tdClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => remove(u.email)}
                        disabled={deleting === u.email}
                        className={btnAdmin}
                        aria-label={`Delete ${u.email}`}
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
