"use client";

/* Admin → Fabrics: the managed fabric library.
   Products pick a fabric from this library when being created (see the sofa form). */

import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconSearch, IconTrash, IconX } from "@/components/Icons";
import { useToast } from "@/components/toast";
import type { Fabric, Product } from "@/lib/types";
import {
  Card,
  EmptyState,
  ErrorBox,
  SkeletonTable,
  api,
  btnAdmin,
  btnAdminPrimary,
  fieldClass,
  labelClass,
  tdClass,
  thClass,
} from "../_ui";
import { AdminPagination, usePagination } from "../_ui";

type Dialog = { mode: "add" } | { mode: "edit"; fabric: Fabric };

export default function FabricsPage() {
  const [fabrics, setFabrics] = useState<Fabric[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const toast = useToast();
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Fabric | null>(null);

  const load = () => {
    api<{ fabrics: Fabric[] }>("/api/fabrics")
      .then(({ fabrics }) => setFabrics(fabrics))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load fabrics."));
    api<{ products: Product[] }>("/api/products")
      .then(({ products }) => setProducts(products))
      .catch(() => {});
  };
  useEffect(load, []);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      if (p.fabricType) m.set(p.fabricType, (m.get(p.fabricType) ?? 0) + 1);
    }
    return m;
  }, [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return fabrics ?? [];
    return (fabrics ?? []).filter((f) => f.name.toLowerCase().includes(needle));
  }, [fabrics, q]);
  const pg = usePagination(filtered);

  const openNew = () => {
    setName("");
    setDialog({ mode: "add" });
  };
  const openEdit = (fabric: Fabric) => {
    setName(fabric.name);
    setDialog({ mode: "edit", fabric });
  };
  const closeDialog = () => {
    setDialog(null);
    setName("");
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Give the fabric a name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (dialog?.mode === "edit") await api(`/api/fabrics/${dialog.fabric.id}`, "PATCH", { name: name.trim() });
      else await api("/api/fabrics", "POST", { name: name.trim() });
      toast.success(dialog?.mode === "edit" ? "Fabric updated" : "Fabric added", `“${name.trim()}” was saved.`);
      closeDialog();
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      setError(msg);
      toast.error("Could not save fabric", msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/api/fabrics/${deleting.id}`, "DELETE");
      toast.success("Fabric deleted", `“${deleting.name}” was removed.`);
      setDeleting(null);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed.";
      setError(msg);
      toast.error("Could not delete fabric", msg);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-[30px]">Fabrics</h1>
          <p className="text-muted text-[14px] mt-1">
            The shared fabric library — pick these when creating sofas. Anything you add here shows up in the sofa form.
          </p>
        </div>
        <button className={btnAdminPrimary} onClick={openNew}>
          <IconPlus size={16} /> Add fabric
        </button>
      </div>

      {error && <ErrorBox message={error} />}

      <Card>
        <label className="flex items-center gap-2.5 bg-cream border-[1.5px] border-line rounded-full px-4 min-h-[44px] max-w-[380px]">
          <IconSearch size={17} className="text-muted flex-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search fabrics…"
            aria-label="Search fabrics"
            className="border-0 outline-0 bg-transparent flex-1 min-w-0 text-[14px]"
          />
        </label>
      </Card>

      {fabrics === null ? (
        <SkeletonTable rows={6} cols={3} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No fabrics found" hint="Add your first fabric to start the library." />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Used by</th>
                  <th className={thClass + " text-right"}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pg.pageItems.map((f) => (
                  <tr key={f.id} className="border-t border-sand">
                    <td className={tdClass}>
                      <span className="font-semibold">{f.name}</span>
                    </td>
                    <td className={tdClass}>{usage.get(f.name) ?? 0} sofas</td>
                    <td className={tdClass + " text-right"}>
                      <div className="inline-flex gap-2">
                        <button className={btnAdmin} onClick={() => openEdit(f)}>
                          Edit
                        </button>
                        <button
                          className={btnAdmin + " text-[#B3402F]"}
                          onClick={() => setDeleting(f)}
                          aria-label={`Delete ${f.name}`}
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-5">
            <AdminPagination
              page={pg.page}
              pageCount={pg.pageCount}
              perPage={pg.perPage}
              onPage={pg.setPage}
              onPerPage={pg.setPerPage}
              total={pg.total}
              from={pg.from}
              to={pg.to}
            />
          </div>
        </Card>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={closeDialog} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[520px] flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="text-[26px]">{dialog.mode === "edit" ? "Edit fabric" : "Add fabric"}</h2>
              <button className="w-10 h-10 grid place-items-center rounded-full hover:bg-cream" onClick={closeDialog} aria-label="Close">
                <IconX size={20} />
              </button>
            </div>
            <div>
              <label className={labelClass} htmlFor="fabric-name">Name</label>
              <input
                id="fabric-name"
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Velvet"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button className={btnAdmin} onClick={closeDialog}>
                Cancel
              </button>
              <button className={btnAdminPrimary} onClick={save} disabled={saving}>
                {saving ? "Saving…" : dialog.mode === "edit" ? "Save changes" : "Add fabric"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDeleting(null)} aria-hidden />
          <div className="relative bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-[440px] flex flex-col gap-5">
            <h2 className="text-[24px]">Delete “{deleting.name}”?</h2>
            <p className="text-muted text-[14px]">
              {(usage.get(deleting.name) ?? 0) > 0
                ? `This fabric is used by ${usage.get(deleting.name)} sofa(s). Those sofas keep their fabric name, but it will no longer appear in the library.`
                : "It is not used by any sofa yet."}{" "}
              This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button className={btnAdmin} onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button className={btnAdminPrimary + " bg-[#B3402F]!"} onClick={remove}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
