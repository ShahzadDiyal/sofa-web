"use client";

/* Content settings: announcement bar, contact details, Trustpilot rating,
   FAQs and reviews — everything customer-facing on the storefront. */

import { useEffect, useState } from "react";
import { IconPlus, IconTrash } from "@/components/Icons";
import type { Faq, FooterLink, FooterMenu, Review, SiteSettings } from "@/lib/types";
import {
  Card,
  CardTitle,
  ErrorBox,
  Skeleton,
  api,
  btnAdmin,
  btnAdminPrimary,
  fieldClass,
  labelClass,
} from "../_ui";

function useSaved() {
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 3500);
  };
  return { msg, flash };
}

export default function ContentSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [announce, setAnnounce] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [trustpilot, setTrustpilot] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [footerTagline, setFooterTagline] = useState("");
  const [copyrightText, setCopyrightText] = useState("");
  const [footerHtml, setFooterHtml] = useState("");
  const [footerMenus, setFooterMenus] = useState<FooterMenu[]>([]);
  const [legalLinks, setLegalLinks] = useState<FooterLink[]>([]);
  const [privacyHtml, setPrivacyHtml] = useState("");
  const [termsHtml, setTermsHtml] = useState("");
  const [cookiesHtml, setCookiesHtml] = useState("");
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { msg, flash } = useSaved();

  const load = () => {
    setError("");
    Promise.all([
      api<{ settings: SiteSettings }>("/api/settings"),
      api<{ faqs: Faq[] }>("/api/faqs"),
      api<{ reviews: Review[] }>("/api/reviews"),
    ])
      .then(([{ settings }, { faqs }, { reviews }]) => {
        setSettings(settings);
        setAnnounce(settings.announcementBar.join("\n"));
        setPhone(settings.phone);
        setEmail(settings.email);
        setAddress(settings.address);
        setTrustpilot(settings.trustpilotRating);
        setLogoUrl(settings.logoUrl ?? "");
        setFaviconUrl(settings.faviconUrl ?? "");
        setFooterTagline(settings.footerTagline ?? "");
        setCopyrightText(settings.copyrightText ?? "");
        setFooterHtml(settings.footerHtml ?? "");
        setFooterMenus(settings.footerMenus ?? []);
        setLegalLinks(settings.legalLinks ?? []);
        setPrivacyHtml(settings.privacyHtml ?? "");
        setTermsHtml(settings.termsHtml ?? "");
        setCookiesHtml(settings.cookiesHtml ?? "");
        setFaqs(faqs);
        setReviews(reviews);
      })
      .catch((e) => setError(e.message || "Could not load settings."));
  };
  useEffect(load, []);

  const saveSettings = async (patch: Partial<SiteSettings>, key: string, doneMsg: string) => {
    setBusy(key);
    try {
      const { settings } = await api<{ settings: SiteSettings }>("/api/settings", "PATCH", patch);
      setSettings(settings);
      flash(doneMsg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  };

  const saveFaqs = async (next: Faq[]) => {
    setBusy("faqs");
    try {
      const { faqs } = await api<{ faqs: Faq[] }>("/api/faqs", "PUT", { faqs: next });
      setFaqs(faqs);
      flash("FAQs saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  };

  const saveReviews = async (next: Review[]) => {
    setBusy("reviews");
    try {
      const { reviews } = await api<{ reviews: Review[] }>("/api/reviews", "PUT", { reviews: next });
      setReviews(reviews);
      flash("Reviews saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  };

  const ready = settings && faqs && reviews;

  return (
    <>
      <div>
        <h1 className="text-[36px] leading-tight">Settings</h1>
        <p className="text-muted mt-1.5">Storefront content, contact details, FAQs and reviews.</p>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {msg && (
        <div className="bg-[#DDEFE3] text-[#2F7D4F] rounded-[16px] px-5 py-3.5 text-[14px] font-semibold">{msg}</div>
      )}

      {!ready ? (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-[220px]" />
          <Skeleton className="h-[320px]" />
        </div>
      ) : (
        <div className="flex flex-col gap-5 max-w-[860px]">
          <Card>
            <CardTitle
              aside={
                <button
                  className={btnAdminPrimary}
                  disabled={busy === "announce"}
                  onClick={() =>
                    saveSettings(
                      { announcementBar: announce.split("\n").map((l) => l.trim()).filter(Boolean) },
                      "announce",
                      "Announcement bar saved."
                    )
                  }
                >
                  {busy === "announce" ? "Saving…" : "Save"}
                </button>
              }
            >
              Announcement bar
            </CardTitle>
            <p className="text-muted text-[14px] -mt-2">One message per line — shown at the top of every storefront page.</p>
            <textarea
              aria-label="Announcement bar messages"
              className={fieldClass + " min-h-[110px]"}
              rows={3}
              value={announce}
              onChange={(e) => setAnnounce(e.target.value)}
            />
          </Card>

          <Card>
            <CardTitle
              aside={
                <button
                  className={btnAdminPrimary}
                  disabled={busy === "contact"}
                  onClick={() => saveSettings({ phone, email, address }, "contact", "Contact details saved.")}
                >
                  {busy === "contact" ? "Saving…" : "Save"}
                </button>
              }
            >
              Contact
            </CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="s-phone">Phone number</label>
                <input id="s-phone" className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="s-email">Email address</label>
                <input id="s-email" className={fieldClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="s-address">Business address</label>
              <input id="s-address" className={fieldClass} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="s-trust">Trustpilot rating text</label>
              <input
                id="s-trust"
                className={fieldClass}
                value={trustpilot}
                onChange={(e) => setTrustpilot(e.target.value)}
                placeholder="e.g. Excellent"
              />
              <div className="mt-3">
                <button
                  className={btnAdmin}
                  disabled={busy === "trust"}
                  onClick={() => saveSettings({ trustpilotRating: trustpilot }, "trust", "Trustpilot rating saved.")}
                >
                  {busy === "trust" ? "Saving…" : "Save rating"}
                </button>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle
              aside={
                <button
                  className={btnAdminPrimary}
                  disabled={busy === "branding"}
                  onClick={() => saveSettings({ logoUrl, faviconUrl }, "branding", "Logo & favicon saved.")}
                >
                  {busy === "branding" ? "Saving…" : "Save"}
                </button>
              }
            >
              Logo & favicon
            </CardTitle>
            <p className="text-muted text-[14px] -mt-2">
              Shown in the navbar, mobile menu and footer (logo), and the browser tab (favicon).
              Leave empty to use the built-in images.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="s-logo">Logo image URL</label>
                <input
                  id="s-logo"
                  className={fieldClass}
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://…"
                />
                {logoUrl && (
                  <img src={logoUrl} alt="Logo preview" className="mt-3 h-12 w-auto rounded-[10px] bg-cream p-1" />
                )}
              </div>
              <div>
                <label className={labelClass} htmlFor="s-favicon">Favicon image URL</label>
                <input
                  id="s-favicon"
                  className={fieldClass}
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://…"
                />
                {faviconUrl && (
                  <img src={faviconUrl} alt="Favicon preview" className="mt-3 h-8 w-8 rounded" />
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle
              aside={
                <button
                  className={btnAdminPrimary}
                  disabled={busy === "footer"}
                  onClick={() =>
                    saveSettings(
                      { footerTagline, copyrightText, footerHtml, footerMenus, legalLinks },
                      "footer",
                      "Footer saved."
                    )
                  }
                >
                  {busy === "footer" ? "Saving…" : "Save"}
                </button>
              }
            >
              Footer
            </CardTitle>
            <p className="text-muted text-[14px] -mt-2">
              Tagline, menu columns, legal links and copyright shown in the site footer.
              The “Shop” column is built automatically from your categories.
            </p>
            <div>
              <label className={labelClass} htmlFor="s-tagline">Tagline under the logo</label>
              <input
                id="s-tagline"
                className={fieldClass}
                value={footerTagline}
                onChange={(e) => setFooterTagline(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="s-copyright">Copyright line</label>
              <input
                id="s-copyright"
                className={fieldClass}
                value={copyrightText}
                onChange={(e) => setCopyrightText(e.target.value)}
                placeholder="Empty = © current year Sofora. All rights reserved."
              />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <span className={labelClass}>Menu columns</span>
                <button
                  className={btnAdmin}
                  onClick={() => setFooterMenus((ms) => [...ms, { title: "New menu", links: [] }])}
                >
                  <IconPlus size={16} /> Add menu
                </button>
              </div>
              {footerMenus.map((menu, mi) => (
                <div key={mi} className="border border-line rounded-[14px] p-4 flex flex-col gap-3">
                  <div className="flex gap-2.5">
                    <input
                      aria-label="Menu title"
                      className={fieldClass}
                      value={menu.title}
                      onChange={(e) =>
                        setFooterMenus((ms) => ms.map((m, i) => (i === mi ? { ...m, title: e.target.value } : m)))
                      }
                      placeholder="Menu title"
                    />
                    <button
                      className={btnAdmin}
                      aria-label="Delete menu"
                      onClick={() => setFooterMenus((ms) => ms.filter((_, i) => i !== mi))}
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                  {menu.links.map((l, li) => (
                    <div key={li} className="grid grid-cols-[1fr_1fr_auto] gap-2.5 items-center">
                      <input
                        aria-label="Link label"
                        className={fieldClass}
                        value={l.label}
                        onChange={(e) =>
                          setFooterMenus((ms) =>
                            ms.map((m, i) =>
                              i === mi
                                ? { ...m, links: m.links.map((x, j) => (j === li ? { ...x, label: e.target.value } : x)) }
                                : m
                            )
                          )
                        }
                        placeholder="Label"
                      />
                      <input
                        aria-label="Link URL"
                        className={fieldClass}
                        value={l.href}
                        onChange={(e) =>
                          setFooterMenus((ms) =>
                            ms.map((m, i) =>
                              i === mi
                                ? { ...m, links: m.links.map((x, j) => (j === li ? { ...x, href: e.target.value } : x)) }
                                : m
                            )
                          )
                        }
                        placeholder="/page-url"
                      />
                      <button
                        className={btnAdmin}
                        aria-label="Delete link"
                        onClick={() =>
                          setFooterMenus((ms) =>
                            ms.map((m, i) =>
                              i === mi ? { ...m, links: m.links.filter((_, j) => j !== li) } : m
                            )
                          )
                        }
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    className={btnAdmin + " self-start"}
                    onClick={() =>
                      setFooterMenus((ms) =>
                        ms.map((m, i) => (i === mi ? { ...m, links: [...m.links, { label: "", href: "" }] } : m))
                      )
                    }
                  >
                    <IconPlus size={16} /> Add link
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <span className={labelClass}>Bottom-bar legal links</span>
                <button
                  className={btnAdmin}
                  onClick={() => setLegalLinks((ls) => [...ls, { label: "", href: "" }])}
                >
                  <IconPlus size={16} /> Add link
                </button>
              </div>
              {legalLinks.map((l, li) => (
                <div key={li} className="grid grid-cols-[1fr_1fr_auto] gap-2.5 items-center">
                  <input
                    aria-label="Legal link label"
                    className={fieldClass}
                    value={l.label}
                    onChange={(e) =>
                      setLegalLinks((ls) => ls.map((x, j) => (j === li ? { ...x, label: e.target.value } : x)))
                    }
                    placeholder="Label"
                  />
                  <input
                    aria-label="Legal link URL"
                    className={fieldClass}
                    value={l.href}
                    onChange={(e) =>
                      setLegalLinks((ls) => ls.map((x, j) => (j === li ? { ...x, href: e.target.value } : x)))
                    }
                    placeholder="/page-url"
                  />
                  <button
                    className={btnAdmin}
                    aria-label="Delete legal link"
                    onClick={() => setLegalLinks((ls) => ls.filter((_, j) => j !== li))}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div>
              <label className={labelClass} htmlFor="s-footerhtml">Extra footer HTML (optional)</label>
              <textarea
                id="s-footerhtml"
                className={fieldClass + " min-h-[110px] font-mono text-[13px]"}
                rows={4}
                value={footerHtml}
                onChange={(e) => setFooterHtml(e.target.value)}
                placeholder="<p>…</p>"
              />
              <p className="text-muted text-[13px] mt-1.5">
                Raw HTML shown under the tagline — e.g. payment-method icons. Only paste code you trust.
              </p>
            </div>
          </Card>

          <Card>
            <CardTitle
              aside={
                <button
                  className={btnAdminPrimary}
                  disabled={busy === "legal"}
                  onClick={() => saveSettings({ privacyHtml, termsHtml, cookiesHtml }, "legal", "Legal pages saved.")}
                >
                  {busy === "legal" ? "Saving…" : "Save"}
                </button>
              }
            >
              Legal pages
            </CardTitle>
            <p className="text-muted text-[14px] -mt-2">
              Paste full HTML for each page — it replaces the built-in content on the site.
              Leave empty to keep the built-in page.
            </p>
            <div>
              <label className={labelClass} htmlFor="s-privacy">Privacy policy HTML</label>
              <textarea
                id="s-privacy"
                className={fieldClass + " min-h-[160px] font-mono text-[13px]"}
                rows={6}
                value={privacyHtml}
                onChange={(e) => setPrivacyHtml(e.target.value)}
                placeholder="<h2>…</h2><p>…</p>"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="s-terms">Terms & conditions HTML</label>
              <textarea
                id="s-terms"
                className={fieldClass + " min-h-[160px] font-mono text-[13px]"}
                rows={6}
                value={termsHtml}
                onChange={(e) => setTermsHtml(e.target.value)}
                placeholder="<h2>…</h2><p>…</p>"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="s-cookies">Cookie policy HTML</label>
              <textarea
                id="s-cookies"
                className={fieldClass + " min-h-[160px] font-mono text-[13px]"}
                rows={6}
                value={cookiesHtml}
                onChange={(e) => setCookiesHtml(e.target.value)}
                placeholder="<h2>…</h2><p>…</p>"
              />
            </div>
          </Card>

          <Card>
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <h2 className="text-[22px]">FAQs</h2>
              <div className="flex gap-2.5">
                <button
                  className={btnAdmin}
                  onClick={() =>
                    setFaqs((f) => [...(f ?? []), { id: `faq-${Date.now()}`, q: "", a: "", order: (f ?? []).length + 1 }])
                  }
                >
                  <IconPlus size={16} /> Add question
                </button>
                <button className={btnAdminPrimary} disabled={busy === "faqs"} onClick={() => saveFaqs(faqs!)}>
                  {busy === "faqs" ? "Saving…" : "Save FAQs"}
                </button>
              </div>
            </div>
            <p className="text-muted text-[14px] -mt-2">Shown on the homepage and product pages, with FAQ structured data for search.</p>
            <div className="flex flex-col gap-4">
              {faqs!.map((f, i) => (
                <div key={f.id} className="border border-line rounded-[14px] p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Question {i + 1}</span>
                    <button
                      aria-label={`Delete question ${i + 1}`}
                      onClick={() => setFaqs((list) => (list ?? []).filter((x) => x.id !== f.id))}
                      className="grid place-items-center w-9 h-9 rounded-full hover:bg-[#F6DDD8] text-[#B3402F] cursor-pointer"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                  <input
                    aria-label={`Question ${i + 1}`}
                    className={fieldClass}
                    value={f.q}
                    onChange={(e) => setFaqs((list) => (list ?? []).map((x) => (x.id === f.id ? { ...x, q: e.target.value } : x)))}
                    placeholder="Question"
                  />
                  <textarea
                    aria-label={`Answer ${i + 1}`}
                    className={fieldClass + " min-h-[80px]"}
                    rows={2}
                    value={f.a}
                    onChange={(e) => setFaqs((list) => (list ?? []).map((x) => (x.id === f.id ? { ...x, a: e.target.value } : x)))}
                    placeholder="Answer"
                  />
                </div>
              ))}
              {faqs!.length === 0 && <p className="text-muted text-[14px]">No FAQs yet — add the first one above.</p>}
            </div>
          </Card>

          <Card>
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <h2 className="text-[22px]">Reviews</h2>
              <div className="flex gap-2.5">
                <button
                  className={btnAdmin}
                  onClick={() =>
                    setReviews((r) => [
                      ...(r ?? []),
                      { id: `rev-${Date.now()}`, quote: "", author: "", location: "", rating: 5, order: (r ?? []).length + 1 },
                    ])
                  }
                >
                  <IconPlus size={16} /> Add review
                </button>
                <button className={btnAdminPrimary} disabled={busy === "reviews"} onClick={() => saveReviews(reviews!)}>
                  {busy === "reviews" ? "Saving…" : "Save reviews"}
                </button>
              </div>
            </div>
            <p className="text-muted text-[14px] -mt-2">Shown in the homepage reviews section. Only publish reviews you have permission to use.</p>
            <div className="flex flex-col gap-4">
              {reviews!.map((r, i) => (
                <div key={r.id} className="border border-line rounded-[14px] p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Review {i + 1}</span>
                    <button
                      aria-label={`Delete review ${i + 1}`}
                      onClick={() => setReviews((list) => (list ?? []).filter((x) => x.id !== r.id))}
                      className="grid place-items-center w-9 h-9 rounded-full hover:bg-[#F6DDD8] text-[#B3402F] cursor-pointer"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                  <textarea
                    aria-label={`Review ${i + 1} quote`}
                    className={fieldClass + " min-h-[80px]"}
                    rows={2}
                    value={r.quote}
                    onChange={(e) => setReviews((list) => (list ?? []).map((x) => (x.id === r.id ? { ...x, quote: e.target.value } : x)))}
                    placeholder="Customer review text"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      aria-label={`Review ${i + 1} author`}
                      className={fieldClass}
                      value={r.author}
                      onChange={(e) => setReviews((list) => (list ?? []).map((x) => (x.id === r.id ? { ...x, author: e.target.value } : x)))}
                      placeholder="First name"
                    />
                    <input
                      aria-label={`Review ${i + 1} location`}
                      className={fieldClass}
                      value={r.location}
                      onChange={(e) => setReviews((list) => (list ?? []).map((x) => (x.id === r.id ? { ...x, location: e.target.value } : x)))}
                      placeholder="Town"
                    />
                    <select
                      aria-label={`Review ${i + 1} rating`}
                      className={fieldClass}
                      value={r.rating}
                      onChange={(e) => setReviews((list) => (list ?? []).map((x) => (x.id === r.id ? { ...x, rating: Number(e.target.value) } : x)))}
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} stars
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {reviews!.length === 0 && <p className="text-muted text-[14px]">No reviews yet — add the first one above.</p>}
            </div>
          </Card>

          <DatabaseCard />
        </div>
      )}
    </>
  );
}

function DatabaseCard() {
  const [status, setStatus] = useState<null | {
    configured: boolean;
    message?: string;
    firestore?: Record<string, number>;
    settingsExists?: boolean;
    local?: Record<string, number>;
  }>(null);
  const [result, setResult] = useState<null | { ok: boolean; migrated?: Record<string, number>; error?: string }>(null);
  const [working, setWorking] = useState(false);

  const check = async () => {
    try {
      setStatus(await api<any>("/api/admin/migrate"));
    } catch (e) {
      setStatus({ configured: false, message: e instanceof Error ? e.message : "Check failed." });
    }
  };
  useEffect(() => { check(); }, []);

  const migrate = async () => {
    if (!confirm("Copy all local products, categories, FAQs, reviews, orders and settings into Firestore? Collections that already have data will be skipped.")) return;
    setWorking(true);
    setResult(null);
    try {
      setResult(await api<any>("/api/admin/migrate", "POST"));
      check();
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Migration failed." });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h2 className="text-[22px]">Database</h2>
        <button className={btnAdmin} onClick={check}>Refresh status</button>
      </div>
      <p className="text-muted text-[14px] -mt-2">
        The site currently runs on its built-in local database. Connect Firestore with the service-account key,
        then migrate everything over with one click.
      </p>
      {!status ? (
        <Skeleton className="h-[90px]" />
      ) : !status.configured ? (
        <div className="bg-[#F8EAC8] text-[#9A6A12] rounded-[14px] px-5 py-4 text-[14px] font-medium leading-relaxed">
          Firestore is not connected yet. {status.message ?? "Add the service-account key to the server env, then refresh."}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2.5 flex-wrap text-[13px]">
            {Object.entries(status.local ?? {}).map(([k, v]) => (
              <span key={k} className="bg-cream rounded-full px-3.5 py-1.5 font-medium">
                Local {k}: <strong>{v}</strong>
              </span>
            ))}
          </div>
          <div className="flex gap-2.5 flex-wrap text-[13px]">
            {Object.entries(status.firestore ?? {}).map(([k, v]) => (
              <span key={k} className="bg-cream rounded-full px-3.5 py-1.5 font-medium">
                Firestore {k}: <strong>{v === -1 ? "has data" : "empty"}</strong>
              </span>
            ))}
            <span className="bg-cream rounded-full px-3.5 py-1.5 font-medium">
              Settings: <strong>{status.settingsExists ? "has data" : "empty"}</strong>
            </span>
          </div>
          <div>
            <button className={btnAdminPrimary} onClick={migrate} disabled={working}>
              {working ? "Migrating…" : "Migrate local data to Firestore"}
            </button>
          </div>
          {result?.ok && result.migrated && (
            <div className="bg-[#DDEFE3] text-[#2F7D4F] rounded-[14px] px-5 py-4 text-[14px] font-medium">
              Migrated: {Object.entries(result.migrated).map(([k, v]) => `${k} (${v})`).join(", ")}. The site now reads from Firestore.
            </div>
          )}
          {result && !result.ok && (
            <div className="bg-[#F6DDD8] text-[#B3402F] rounded-[14px] px-5 py-4 text-[14px] font-medium">
              {result.error}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
