"use client";

/* Shared add/edit sofa form (SPEC 13). Core Product fields persist to the API;
   dimensions, extra colourways and COD notes round-trip through details[]. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconPlus, IconTrash } from "@/components/Icons";
import SofaIllustration from "@/components/SofaIllustration";
import type { Category, Color, Product, SofaType } from "@/lib/types";
import ImageUploadField from "../_image-upload";
import {
  Card,
  CardTitle,
  ErrorBox,
  Toggle,
  api,
  btnAdmin,
  btnAdminPrimary,
  fieldClass,
  labelClass,
  uploadImage,
} from "../_ui";

const TYPE_OPTIONS: { label: string; value: SofaType }[] = [
  { label: "3 seater", value: "three" },
  { label: "2 seater", value: "three" },
  { label: "Corner sofa", value: "corner" },
  { label: "3+2 set", value: "three" },
  { label: "Armchair", value: "chair" },
  { label: "Sofa bed", value: "sofa-bed" },
];

const FABRIC_TYPES = ["Easy-clean weave", "Velvet", "Jumbo cord", "Bouclé"];

interface ColourRow {
  hex: string;
  name: string;
  sku: string;
  photo?: string; // per-colourway photo (device upload → Cloudinary)
}

const DIM_LABELS = ["Width", "Depth", "Height", "Seat height", "Weight", "Boxes", "Min doorway"] as const;
const DIM_UNITS: Record<string, string> = {
  Width: "cm",
  Depth: "cm",
  Height: "cm",
  "Seat height": "cm",
  Weight: "kg",
  Boxes: "",
  "Min doorway": "cm",
};

interface Parsed {
  dims: Record<string, string>;
  extraColours: ColourRow[];
  codAvailable: boolean;
  phoneVerification: boolean;
  maxCod: string;
  rest: string[];
}

function parseDetails(details: string[] | undefined): Parsed {
  const out: Parsed = { dims: {}, extraColours: [], codAvailable: false, phoneVerification: false, maxCod: "", rest: [] };
  for (const line of details ?? []) {
    let matched = false;
    for (const k of DIM_LABELS) {
      if (line.startsWith(`${k}:`)) {
        out.dims[k] = line.slice(k.length + 1).trim().replace(/(cm|kg)$/, "");
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const m = /^Also available:\s*(.+?)\s*\((.+)\)$/.exec(line);
    if (m) {
      out.extraColours.push({ name: m[1], sku: m[2], hex: "#D8CBB4" });
      continue;
    }
    if (line === "Pay on delivery available") {
      out.codAvailable = true;
      continue;
    }
    if (line === "Phone verification required at checkout") {
      out.phoneVerification = true;
      continue;
    }
    const mc = /^Max COD order value:\s*£?(.+)$/.exec(line);
    if (mc) {
      out.maxCod = mc[1];
      continue;
    }
    out.rest.push(line);
  }
  return out;
}

/* Compact per-colourway photo uploader for the colours table. */
function ColourPhotoButton({ photo, onChange }: { photo?: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      onChange(await uploadImage(file, "products"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 h-10 rounded-[10px] overflow-hidden bg-cream border border-line flex-none grid place-items-center">
        {uploading ? (
          <span className="w-full h-full skeleton" aria-label="Uploading…" />
        ) : photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-muted text-[10px]">—</span>
        )}
      </span>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="text-[12px] font-semibold underline underline-offset-2 whitespace-nowrap disabled:opacity-50"
        >
          {uploading ? "Uploading…" : photo ? "Replace" : "Upload"}
        </button>
        {photo && !uploading && (
          <button type="button" onClick={() => onChange("")} className="text-[12px] text-muted hover:text-ink whitespace-nowrap">
            Remove
          </button>
        )}
      </div>
      {error && <span className="text-[11px] text-[#B3402F]">{error}</span>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" aria-label="Upload colour photo" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

export default function SofaForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseDetails(product?.details), [product]);

  const [name, setName] = useState(product?.name ?? "");
  const [sub, setSub] = useState(product?.sub ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [type, setType] = useState<SofaType>(product?.type ?? "three");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [fabricType, setFabricType] = useState(product?.fabricType ?? FABRIC_TYPES[0]);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [category, setCategory] = useState(product?.category ?? "3-seater-sofas");
  const [colorLib, setColorLib] = useState<Color[]>([]);
  const [colours, setColours] = useState<ColourRow[]>(() => {
    const photoFor = (name: string) => product?.colorImages?.[name];
    if (product) {
      return [
        { hex: product.fabric, name: product.fabricName || "Main", sku: product.sku || "", photo: photoFor(product.fabricName || "Main") },
        ...parsed.extraColours.map((c) => ({ ...c, photo: photoFor(c.name) })),
      ];
    }
    return [{ hex: "#D8CBB4", name: "Oat", sku: "" }];
  });
  // Inline "new colour" creator: which row is creating one, plus its draft fields.
  const [newColorRow, setNewColorRow] = useState<number | null>(null);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#D8CBB4");
  const [newColorImage, setNewColorImage] = useState("");
  const [newColorSaving, setNewColorSaving] = useState(false);
  const [dims, setDims] = useState<Record<string, string>>(parsed.dims);
  const [inStock, setInStock] = useState(product?.inStock ?? false);
  const [isNew, setIsNew] = useState(product?.tag === "New");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [wasPrice, setWasPrice] = useState(product?.wasPrice ? String(product.wasPrice) : "");
  const [codAvailable, setCodAvailable] = useState(parsed.codAvailable || !product);
  const [phoneVerification, setPhoneVerification] = useState(parsed.phoneVerification || !product);
  const [maxCod, setMaxCod] = useState(parsed.maxCod);

  useEffect(() => {
    api<{ categories: Category[] }>("/api/categories")
      .then(({ categories }) => {
        setCategories(categories);
        if (!product && categories.length > 0) setCategory(categories[0].slug);
      })
      .catch(() => {});
    api<{ colors: Color[] }>("/api/colors")
      .then(({ colors }) => setColorLib(colors))
      .catch(() => {});
  }, [product]);

  const setColour = (i: number, patch: Partial<ColourRow>) =>
    setColours((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const addColour = () => setColours((cs) => [...cs, { hex: "#8B7B6B", name: "", sku: "" }]);
  const removeColour = (i: number) => setColours((cs) => (cs.length > 1 ? cs.filter((_, j) => j !== i) : cs));
  const makeMain = (i: number) =>
    setColours((cs) => (i === 0 ? cs : [cs[i], ...cs.slice(0, i), ...cs.slice(i + 1)]));

  /** Pick a library colour into row i (syncs name + hex). */
  const pickLibraryColor = (i: number, colorId: string) => {
    if (colorId === "__new__") {
      setNewColorRow(i);
      setNewColorName(colours[i]?.name && !colorLib.some((c) => c.name === colours[i].name) ? colours[i].name : "");
      setNewColorHex(colours[i]?.hex || "#D8CBB4");
      setNewColorImage("");
      return;
    }
    const lib = colorLib.find((c) => c.id === colorId);
    if (lib) setColour(i, { name: lib.name, hex: lib.hex || colours[i].hex });
  };

  /** Create the inline-drafted colour in the library, then pick it into its row. */
  const createInlineColor = async () => {
    if (newColorRow === null || !newColorName.trim()) return;
    setNewColorSaving(true);
    try {
      const { color } = await api<{ color: Color }>("/api/colors", "POST", {
        name: newColorName.trim(),
        hex: newColorHex,
        imageUrl: newColorImage.trim() || undefined,
      });
      setColorLib((cs) => [...cs, color].sort((a, b) => a.name.localeCompare(b.name)));
      setColour(newColorRow, { name: color.name, hex: color.hex || newColorHex });
      setNewColorRow(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create colour.");
    } finally {
      setNewColorSaving(false);
    }
  };

  const save = async (publish: boolean) => {
    setError("");
    if (!name.trim()) {
      setError("Give the sofa a name first.");
      return;
    }
    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum < 0) {
      setError("Enter a valid price in £.");
      return;
    }
    if (!colours[0].hex) {
      setError("Add at least one fabric colour.");
      return;
    }
    setSaving(true);
    try {
      const details: string[] = [...parsed.rest];
      for (const k of DIM_LABELS) {
        const v = (dims[k] ?? "").trim();
        if (v) details.push(`${k}: ${v}${DIM_UNITS[k]}`);
      }
      for (const c of colours.slice(1)) {
        if (c.name.trim()) details.push(`Also available: ${c.name.trim()} (${c.sku.trim() || "no SKU"})`);
      }
      if (codAvailable) details.push("Pay on delivery available");
      if (phoneVerification) details.push("Phone verification required at checkout");
      if (maxCod.trim()) details.push(`Max COD order value: £${maxCod.trim()}`);

      const mainName = colours[0].name.trim() || "Main";
      const colorImages: Record<string, string> = {};
      for (const c of colours) {
        const n = c.name.trim();
        if (n && c.photo) colorImages[n] = c.photo;
      }
      const payload = {
        name: name.trim(),
        sub: sub.trim(),
        description: description.trim(),
        type,
        sku: sku.trim(),
        fabricType,
        fabric: colours[0].hex,
        fabricName: mainName,
        colourName: mainName,
        bg: product?.bg ?? "#EFE8DC",
        accent: product?.accent ?? "#B65A35",
        price: priceNum,
        wasPrice: wasPrice.trim() ? Number(wasPrice) : undefined,
        inStock: publish,
        tag: isNew ? "New" : product?.tag === "New" ? undefined : product?.tag,
        category,
        imageUrl: imageUrl.trim() || colours[0].photo || (product ? null : undefined),
        colorImages: Object.keys(colorImages).length ? colorImages : product ? null : undefined,
        details,
      };
      if (product) {
        await api(`/api/products/${product.id}`, "PATCH", payload);
      } else {
        await api("/api/products", "POST", payload);
      }
      router.push("/admin/products");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      setSaving(false);
    }
  };

  const cover = colours[0];

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex gap-2 text-muted text-[14px]">
        <Link href="/admin/products" className="underline">
          Sofas
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">{product ? product.name : "Add sofa"}</span>
      </nav>

      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-[36px] leading-tight">{product ? "Edit sofa" : "Add sofa"}</h1>
        <div className="flex gap-2.5 flex-wrap">
          <Link href="/admin/products" className={btnAdmin}>
            Discard
          </Link>
          <button className={btnAdmin} disabled={saving} onClick={() => save(false)}>
            {saving ? "Saving…" : "Save as draft"}
          </button>
          <button className={btnAdminPrimary} disabled={saving} onClick={() => save(true)}>
            {saving ? "Saving…" : "Publish sofa"}
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="flex flex-wrap gap-5 items-start">
        <div className="flex-[3_1_520px] min-w-0 flex flex-col gap-5">
          <Card>
            <CardTitle>Basics</CardTitle>
            <div>
              <label className={labelClass} htmlFor="f-name">Sofa name</label>
              <input id="f-name" className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arco Curved 5-Seater Corner Sofa" />
            </div>
            <div>
              <label className={labelClass} htmlFor="f-sub">Short tagline</label>
              <input id="f-sub" className={fieldClass} value={sub} onChange={(e) => setSub(e.target.value)} placeholder="e.g. Easy-clean oat weave" />
            </div>
            <div>
              <label className={labelClass} htmlFor="f-desc">Description</label>
              <textarea id="f-desc" className={fieldClass + " min-h-[110px]"} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass} htmlFor="f-type">Type</label>
                <select id="f-type" className={fieldClass} value={type} onChange={(e) => setType(e.target.value as SofaType)}>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="f-sku">SKU</label>
                <input id="f-sku" className={fieldClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. OSL-3" />
              </div>
              <div>
                <label className={labelClass} htmlFor="f-fabric">Fabric type</label>
                <select id="f-fabric" className={fieldClass} value={fabricType} onChange={(e) => setFabricType(e.target.value)}>
                  {FABRIC_TYPES.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <h2 className="text-[22px]">Photos</h2>
              <span className="text-muted text-[14px]">First colour is the cover</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {colours.map((c, i) => (
                <div key={i} className="relative">
                  <div
                    className="rounded-[14px] overflow-hidden"
                    style={i === 0 ? { outline: "2px solid #1F3A32", outlineOffset: "-2px" } : undefined}
                  >
                    <SofaIllustration type={type} fabric={c.hex} bg={product?.bg ?? "#EFE8DC"} title={`${name || "Sofa"} in ${c.name || "fabric"}`} className="w-full aspect-square" />
                  </div>
                  {i === 0 && (
                    <span className="absolute left-2 top-2 bg-forest text-cream text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      Cover
                    </span>
                  )}
                  <p className="text-[12px] text-muted mt-1.5 truncate">{c.name || "Unnamed colour"}</p>
                </div>
              ))}
            </div>
            <ImageUploadField
              label="Main photo"
              hint="Upload from your device — it goes to Cloudinary automatically. Or paste a URL below."
              folder="products"
              value={imageUrl}
              onChange={setImageUrl}
            />
            <div>
              <label className={labelClass} htmlFor="f-img">Photo URL <span className="text-muted font-normal">(optional — paste instead of uploading; illustration is used when empty)</span></label>
              <input id="f-img" className={fieldClass} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" inputMode="url" />
            </div>
          </Card>

          <Card>
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <CardTitle>Fabric colours & stock</CardTitle>
              <button className={btnAdmin + " min-h-[40px]! py-1.5!"} onClick={addColour}>
                <IconPlus size={16} /> Add colour
              </button>
            </div>
            <p className="text-muted text-[13px] -mt-2">The first colour is the live product fabric. Others are listed as “Also available”. Pick from the colour library or create a new one inline.</p>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr>
                    <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-2 py-2">Colour</th>
                    <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-2 py-2">Name (library)</th>
                    <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-2 py-2">Photo</th>
                    <th className="text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-muted px-2 py-2">SKU</th>
                    <th className="w-[110px]" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {colours.map((c, i) => {
                    const libMatch = colorLib.find((l) => l.name === c.name);
                    return (
                    <tr key={i} className="border-t border-sand">
                      <td className="px-2 py-2.5">
                        <input
                          type="color"
                          aria-label={`Colour ${i + 1} swatch`}
                          value={c.hex}
                          onChange={(e) => setColour(i, { hex: e.target.value })}
                          className="w-10 h-10 rounded-full cursor-pointer bg-transparent border border-line p-0"
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <select
                          aria-label={`Colour ${i + 1} name`}
                          className={fieldClass + " min-h-[44px]!"}
                          value={libMatch ? libMatch.id : ""}
                          onChange={(e) => pickLibraryColor(i, e.target.value)}
                        >
                          <option value="" disabled>{colorLib.length ? "Choose a colour…" : "Loading colours…"}</option>
                          {colorLib.map((l) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                          <option value="__new__">＋ New colour…</option>
                        </select>
                        {!libMatch && c.name && (
                          <p className="text-[12px] text-muted mt-1">Custom: “{c.name}” — pick “New colour…” to save it to the library.</p>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <ColourPhotoButton photo={c.photo} onChange={(url) => setColour(i, { photo: url || undefined })} />
                      </td>
                      <td className="px-2 py-2.5">
                        <input
                          aria-label={`Colour ${i + 1} SKU`}
                          className={fieldClass + " min-h-[44px]!"}
                          value={c.sku}
                          onChange={(e) => setColour(i, { sku: e.target.value })}
                          placeholder="e.g. OSL-3-OAT"
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex gap-1 justify-end">
                          {i > 0 && (
                            <button className="text-[12px] font-semibold underline px-2 min-h-[36px]" onClick={() => makeMain(i)}>
                              Set as main
                            </button>
                          )}
                          <button
                            aria-label={`Remove colour ${i + 1}`}
                            onClick={() => removeColour(i)}
                            disabled={colours.length === 1}
                            className="grid place-items-center w-9 h-9 rounded-full hover:bg-[#F6DDD8] text-[#B3402F] disabled:opacity-30 cursor-pointer"
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {newColorRow !== null && (
              <div className="mt-4 rounded-[16px] border-[1.5px] border-line bg-cream/60 p-4 flex flex-col gap-4">
                <p className="font-semibold text-[15px]">New colour for row {newColorRow + 1} <span className="font-normal text-muted">— saved to the colour library</span></p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} htmlFor="nc-name">Name</label>
                    <input
                      id="nc-name"
                      className={fieldClass}
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      placeholder="e.g. Burnt Orange"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="nc-hex">Colour code</label>
                    <div className="flex gap-3 items-center">
                      <input
                        id="nc-hex"
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="w-11 h-11 rounded-full cursor-pointer bg-transparent border border-line p-0 flex-none"
                        aria-label="Pick a colour"
                      />
                      <input
                        className={fieldClass}
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        placeholder="#C27B5A"
                        aria-label="Hex code"
                      />
                    </div>
                  </div>
                </div>
                <ImageUploadField
                  label="Swatch image (optional)"
                  hint="Upload a fabric swatch from your device."
                  folder="colors"
                  value={newColorImage}
                  onChange={setNewColorImage}
                />
                <div className="flex gap-3 justify-end">
                  <button type="button" className={btnAdmin} onClick={() => setNewColorRow(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={btnAdminPrimary}
                    onClick={createInlineColor}
                    disabled={newColorSaving || !newColorName.trim()}
                  >
                    {newColorSaving ? "Creating…" : "Create & use colour"}
                  </button>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>Size & delivery</CardTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {DIM_LABELS.slice(0, 4).map((k) => (
                <div key={k}>
                  <label className={labelClass} htmlFor={`dim-${k}`}>{k} (cm)</label>
                  <input
                    id={`dim-${k}`}
                    className={fieldClass}
                    inputMode="decimal"
                    value={dims[k] ?? ""}
                    onChange={(e) => setDims((d) => ({ ...d, [k]: e.target.value }))}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass} htmlFor="dim-Weight">Weight (kg)</label>
                <input id="dim-Weight" className={fieldClass} inputMode="decimal" value={dims["Weight"] ?? ""} onChange={(e) => setDims((d) => ({ ...d, Weight: e.target.value }))} placeholder="—" />
              </div>
              <div>
                <label className={labelClass} htmlFor="dim-Boxes">Boxes / pieces</label>
                <input id="dim-Boxes" className={fieldClass} inputMode="numeric" value={dims["Boxes"] ?? ""} onChange={(e) => setDims((d) => ({ ...d, Boxes: e.target.value }))} placeholder="—" />
              </div>
              <div>
                <label className={labelClass} htmlFor="dim-Min doorway">Min. doorway width (cm)</label>
                <input id="dim-Min doorway" className={fieldClass} inputMode="decimal" value={dims["Min doorway"] ?? ""} onChange={(e) => setDims((d) => ({ ...d, "Min doorway": e.target.value }))} placeholder="—" />
                <p className="text-[12px] text-muted mt-1.5">Shown to customers and drivers.</p>
              </div>
            </div>
          </Card>
        </div>

        <aside className="flex-[2_1_300px] min-w-0 flex flex-col gap-5">
          <Card>
            <CardTitle>Status</CardTitle>
            <div className="flex justify-between items-center min-h-[44px] gap-3">
              <span className="font-medium text-[15px]">Live on storefront</span>
              <Toggle on={inStock} onChange={setInStock} label="Live on storefront" />
            </div>
            <div className="flex justify-between items-center min-h-[44px] gap-3">
              <span className="font-medium text-[15px]">Show “New” badge</span>
              <Toggle on={isNew} onChange={setIsNew} label="Show New badge" />
            </div>
            <div className="rounded-[14px] overflow-hidden">
              <SofaIllustration type={type} fabric={cover.hex} bg={product?.bg ?? "#EFE8DC"} title="Live preview" className="w-full aspect-square" />
            </div>
          </Card>

          <Card>
            <CardTitle>Pricing</CardTitle>
            <div>
              <label className={labelClass} htmlFor="f-price">Price (£)</label>
              <input id="f-price" className={fieldClass} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 649" />
            </div>
            <div>
              <label className={labelClass} htmlFor="f-was">Compare-at price (£)</label>
              <input id="f-was" className={fieldClass} inputMode="decimal" value={wasPrice} onChange={(e) => setWasPrice(e.target.value)} placeholder="e.g. 899" />
              <p className="text-[12px] text-muted mt-1.5">Shown as the crossed-out price.</p>
            </div>
          </Card>

          <Card>
            <CardTitle>Pay on delivery</CardTitle>
            <div className="flex justify-between items-center min-h-[44px] gap-3">
              <span className="font-medium text-[15px]">Available as COD</span>
              <Toggle on={codAvailable} onChange={setCodAvailable} label="Available as COD" />
            </div>
            <div className="flex justify-between items-center min-h-[44px] gap-3">
              <span className="font-medium text-[15px]">Require phone verification</span>
              <Toggle on={phoneVerification} onChange={setPhoneVerification} label="Require phone verification" />
            </div>
            <div>
              <label className={labelClass} htmlFor="f-maxcod">Max COD order value (£)</label>
              <input id="f-maxcod" className={fieldClass} inputMode="decimal" value={maxCod} onChange={(e) => setMaxCod(e.target.value)} placeholder="No limit" />
            </div>
          </Card>

          <Card>
            <CardTitle>Organisation</CardTitle>
            <div>
              <label className={labelClass} htmlFor="f-cat">Category</label>
              <select id="f-cat" className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
                {categories.length === 0 && <option value={category}>{category}</option>}
              </select>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
