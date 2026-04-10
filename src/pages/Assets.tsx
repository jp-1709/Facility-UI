/**
 * Assets.tsx
 * Facility-UI — CFAM Asset module
 * Dynamic data from Frappe REST API, based on cfam_asset.json schema.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, Filter, MapPin, ChevronDown, ChevronRight,
  MoreVertical, Pencil, X, Loader2, AlertCircle, RefreshCw,
  Camera, Zap, Shield, Wrench, Thermometer, Droplets,
  Server, Building2, AlertTriangle, CheckCircle, Clock,
  Activity, Package,
} from "lucide-react";

/* ═══════════════════════════════════════════
   FRAPPE API HELPERS
═══════════════════════════════════════════ */

const FRAPPE_BASE = "";

type FrappeFilters = [string, string, string | number][];

async function frappeGet<T>(doctype: string, fields: string[], filters: FrappeFilters = [], limit = 500): Promise<T[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit),
    order_by: "asset_code asc",
  });
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${doctype} failed: ${res.statusText}`);
  return (await res.json()).data as T[];
}

async function frappeGetDoc<T>(doctype: string, name: string): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${doctype}/${name} failed: ${res.statusText}`);
  return (await res.json()).data as T;
}

async function frappeCreate<T>(doctype: string, payload: Partial<T>): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": getCsrfToken() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { exc_type?: string }).exc_type || "POST failed"); }
  return (await res.json()).data as T;
}

function getCsrfToken() { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */

interface AssetListItem {
  name: string; asset_code: string; asset_name: string;
  asset_master_category?: string; asset_category?: string; asset_sub_category?: string;
  property_code?: string; property_name?: string;
  zone_code?: string; sub_zone_code?: string; base_unit_code?: string;
  asset_status: string; criticality: string;
  client_code?: string; service_group_code?: string;
  make_brand?: string; model?: string; serial_number?: string;
  installation_date?: string; warranty_expiry?: string; purchase_cost?: number;
  asset_image?: string;
}

interface PPMInfo { last_run_date?: string; next_run_date?: string; }

interface WOHistoryItem {
  name: string; subject?: string; description?: string;
  status?: string; scheduled_date?: string; creation?: string;
}

/* ═══════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════ */

function useFrappeList<T>(doctype: string, fields: string[], filters: FrappeFilters, deps: unknown[], skip = false) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch_ = useCallback(async () => {
    if (skip) { setData([]); return; }
    setLoading(true); setError(null);
    try { setData(await frappeGet<T>(doctype, fields, filters)); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, skip]);
  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

function useFrappeDoc<T>(doctype: string, name: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    setLoading(true); setError(null);
    frappeGetDoc<T>(doctype, name)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e: unknown) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [doctype, name]);
  return { data, loading, error };
}

/* ═══════════════════════════════════════════
   COLOUR / ICON MAPS
═══════════════════════════════════════════ */

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  Active:            { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  Inactive:          { bg: "bg-gray-100",    text: "text-gray-500",    dot: "bg-gray-400"    },
  Decommissioned:    { bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-400"     },
  "Under Repair":    { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500"   },
  Scrap:             { bg: "bg-red-50",      text: "text-red-400",     dot: "bg-red-300"     },
};

const CRITICALITY_CFG: Record<string, string> = {
  Critical: "bg-red-100 text-red-700", High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700", Low: "bg-gray-100 text-gray-600",
};

const CAT_ICONS: Record<string, React.ReactNode> = {
  MEP: <Thermometer className="w-5 h-5 text-blue-500" />,
  "Banking Equipment": <Building2 className="w-5 h-5 text-green-500" />,
  "IT Infrastructure": <Server className="w-5 h-5 text-violet-500" />,
  Civil: <Building2 className="w-5 h-5 text-stone-500" />,
  Safety: <Shield className="w-5 h-5 text-red-500" />,
  HVAC: <Thermometer className="w-5 h-5 text-sky-500" />,
  Plumbing: <Droplets className="w-5 h-5 text-blue-500" />,
  Electrical: <Zap className="w-5 h-5 text-amber-500" />,
  Security: <Shield className="w-5 h-5 text-red-500" />,
  Other: <Wrench className="w-5 h-5 text-gray-500" />,
};

function getCatIcon(masterCat?: string, cat?: string): React.ReactNode {
  if (cat) for (const k of Object.keys(CAT_ICONS)) if (cat.toLowerCase().includes(k.toLowerCase())) return CAT_ICONS[k];
  if (masterCat && CAT_ICONS[masterCat]) return CAT_ICONS[masterCat];
  return <Package className="w-5 h-5 text-muted-foreground" />;
}

function isWarrantyExpired(expiry?: string): boolean { return !!expiry && new Date(expiry) < new Date(); }
function formatDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */

function LoadingSpinner() {
  return <div className="flex items-center justify-center py-14"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg m-4">
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="text-xs font-semibold text-destructive underline">Retry</button>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG["Inactive"];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} /> {status}
    </span>
  );
}

function Field({ label, value, link, warn }: { label: string; value?: string | null; link?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      {link
        ? <span className="text-sm text-primary font-medium cursor-pointer hover:underline">{value || "—"}</span>
        : <span className={`text-sm font-medium ${warn ? "text-red-500 font-semibold" : "text-foreground"}`}>{value || "—"}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ASSET CARD
═══════════════════════════════════════════ */

function AssetCard({
  a, selected, onClick, ppm,
}: { a: AssetListItem; selected: boolean; onClick: () => void; ppm?: PPMInfo }) {
  return (
    <button onClick={onClick}
      className={`list-item-hover w-full text-left px-4 py-3.5 border-b border-border flex gap-3 transition-colors
        ${selected ? "selected bg-primary/5 border-l-2 border-l-primary" : ""}`}>
      {/* icon */}
      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
        {a.asset_image
          ? <img src={a.asset_image} className="w-11 h-11 rounded-xl object-cover" alt="" />
          : getCatIcon(a.asset_master_category, a.asset_category)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{a.asset_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">#{a.asset_code}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          {[a.property_name || a.property_code, a.zone_code].filter(Boolean).join(" · ")}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <StatusBadge status={a.asset_status} />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0 text-right">
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${CRITICALITY_CFG[a.criticality] || "bg-muted text-muted-foreground"}`}>
          {a.criticality}
        </span>
        {ppm?.last_run_date && (
          <span className="text-[11px] text-muted-foreground mt-1">
            Last PM: {formatDate(ppm.last_run_date)}
          </span>
        )}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   NEW ASSET FORM
═══════════════════════════════════════════ */

interface NewAssetForm {
  asset_code: string; asset_name: string;
  asset_master_category: string; asset_category: string; asset_sub_category: string;
  make_brand: string; model: string; serial_number: string;
  property_code: string; zone_code: string; sub_zone_code: string; base_unit_code: string;
  installation_date: string; warranty_expiry: string; purchase_cost: string; criticality: string;
  client_code: string; asset_status: string; service_group_code: string;
}

const BLANK: NewAssetForm = {
  asset_code: "", asset_name: "", asset_master_category: "", asset_category: "",
  asset_sub_category: "", make_brand: "", model: "", serial_number: "",
  property_code: "", zone_code: "", sub_zone_code: "", base_unit_code: "",
  installation_date: "", warranty_expiry: "", purchase_cost: "", criticality: "",
  client_code: "", asset_status: "Active", service_group_code: "",
};

function NewAssetForm({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) {
  const [form, setForm] = useState<NewAssetForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const set = (k: keyof NewAssetForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: properties } = useFrappeList<{ name: string; property_code: string; property_name: string }>(
    "Property", ["name", "property_code", "property_name"], [["is_active", "=", 1]], []);
  const { data: zones } = useFrappeList<{ name: string; zone_code: string; zone_name: string }>(
    "Zone", ["name", "zone_code", "zone_name"],
    form.property_code ? [["property_code", "=", form.property_code]] : [],
    [form.property_code], !form.property_code);
  const { data: subZones } = useFrappeList<{ name: string; sub_zone_code: string; sub_zone_name: string }>(
    "Sub Zone", ["name", "sub_zone_code", "sub_zone_name"],
    form.zone_code ? [["zone_code", "=", form.zone_code]] : [],
    [form.zone_code], !form.zone_code);
  const { data: clients } = useFrappeList<{ name: string; client_name: string }>("Client", ["name", "client_name"], [], []);

  const handleSubmit = async () => {
    if (!form.asset_name || !form.asset_master_category || !form.asset_category || !form.property_code || !form.criticality || !form.client_code) {
      setSaveError("Name, Master Category, Category, Property, Criticality, and Client are required."); return;
    }
    setSaving(true); setSaveError(null);
    try {
      const doc = await frappeCreate<AssetListItem>("CFAM Asset", {
        ...form,
        purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : undefined,
      });
      onCreated(doc.name);
    } catch (e: unknown) { setSaveError((e as Error).message); }
    finally { setSaving(false); }
  };

  const Inp = ({ label, fk, type = "text", placeholder, required }: {
    label: string; fk: keyof NewAssetForm; type?: string; placeholder?: string; required?: boolean;
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      <input type={type} value={form[fk]} onChange={(e) => set(fk)(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );

  const Sel = ({ label, fk, opts, required }: {
    label: string; fk: keyof NewAssetForm; opts: { v: string; l: string }[]; required?: boolean;
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      <select value={form[fk]} onChange={(e) => set(fk)(e.target.value)}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
        <option value="">Select…</option>
        {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">New Asset</h2>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
      </div>
      {saveError && <ErrorBanner message={saveError} onRetry={() => setSaveError(null)} />}

      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Identity</p>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Asset Code" fk="asset_code" placeholder="AST-001" required />
        <Inp label="Asset Name" fk="asset_name" placeholder="Chiller Unit A" required />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Classification</p>
      <Sel label="Master Category" fk="asset_master_category" required
        opts={["MEP", "Banking Equipment", "IT Infrastructure", "Civil", "Safety", "Other"].map((v) => ({ v, l: v }))} />
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Asset Category" fk="asset_category" placeholder="HVAC" required />
        <Inp label="Asset Sub-Category" fk="asset_sub_category" placeholder="Chiller" />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Make & Model</p>
      <div className="grid grid-cols-3 gap-3">
        <Inp label="Make / Brand" fk="make_brand" placeholder="Carrier" />
        <Inp label="Model" fk="model" placeholder="30XA-200" />
        <Inp label="Serial Number" fk="serial_number" placeholder="CRR-2019-88821" />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Location</p>
      <Sel label="Property" fk="property_code" required
        opts={properties.map((p) => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))} />
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Zone" fk="zone_code"
          opts={zones.map((z) => ({ v: z.name, l: `${z.zone_code} — ${z.zone_name}` }))} />
        <Sel label="Sub Zone" fk="sub_zone_code"
          opts={subZones.map((s) => ({ v: s.name, l: `${s.sub_zone_code} — ${s.sub_zone_name}` }))} />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Lifecycle</p>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Installation Date" fk="installation_date" type="date" />
        <Inp label="Warranty Expiry" fk="warranty_expiry" type="date" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Purchase Cost (OMR)" fk="purchase_cost" type="number" placeholder="25000" />
        <Sel label="Criticality" fk="criticality" required
          opts={["Critical", "High", "Medium", "Low"].map((v) => ({ v, l: v }))} />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Client & Contract</p>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Client" fk="client_code" required
          opts={clients.map((c) => ({ v: c.name, l: c.client_name }))} />
        <Sel label="Asset Status" fk="asset_status" required
          opts={["Active", "Inactive", "Decommissioned", "Under Repair", "Scrap"].map((v) => ({ v, l: v }))} />
      </div>
      <Inp label="Service Group" fk="service_group_code" placeholder="MEP, Civil, IT…" />

      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Asset Photo</p>
      <div className="mb-6 border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 cursor-pointer transition-colors">
        <Camera className="w-6 h-6" />
        <span className="text-sm">Attach or drag photo here</span>
      </div>

      <button onClick={handleSubmit} disabled={saving}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Create Asset</>}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DETAIL VIEW
═══════════════════════════════════════════ */

function DetailView({ assetName }: { assetName: string }) {
  const { data: a, loading, error } = useFrappeDoc<AssetListItem>("CFAM Asset", assetName);
  const { data: ppms } = useFrappeList<PPMInfo>(
    "PPM Schedule", ["next_run_date", "last_run_date"],
    assetName ? [["cafm_asset", "=", assetName]] : [], [assetName], !assetName
  );
  const { data: workOrders } = useFrappeList<WOHistoryItem>(
    "Work Order", ["name", "subject", "status", "scheduled_date", "creation"],
    assetName ? [["asset", "=", assetName]] : [], [assetName], !assetName
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!a) return null;

  const ppm = ppms[0];
  const warrantyExpired = isWarrantyExpired(a.warranty_expiry);

  const WO_STATUS_COLOR: Record<string, string> = {
    Open: "bg-emerald-100 text-emerald-700", "In Progress": "bg-blue-100 text-blue-700",
    Completed: "bg-muted text-muted-foreground", Cancelled: "bg-red-100 text-red-600",
  };

  return (
    <div className="fade-in">
      {/* header */}
      <div className="px-6 pt-6 pb-4 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
              {a.asset_image
                ? <img src={a.asset_image} className="w-14 h-14 rounded-xl object-cover" alt="" />
                : <span className="text-2xl">{getCatIcon(a.asset_master_category, a.asset_category)}</span>}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{a.asset_name}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <StatusBadge status={a.asset_status} />
                {a.asset_master_category && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{a.asset_master_category}</span>
                )}
                {a.asset_category && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">{a.asset_category}</span>
                )}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CRITICALITY_CFG[a.criticality] || "bg-muted text-muted-foreground"}`}>
                  {a.criticality}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button className="p-1.5 rounded-lg hover:bg-muted">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Core Details */}
        <div className="mb-6">
          <Field label="Asset Tag" value={a.asset_code} />
          <Field label="Property" value={a.property_name || a.property_code} link />
          <Field label="Zone" value={a.zone_code} />
          <Field label="Sub Zone" value={a.sub_zone_code} />
          <Field label="Base Unit" value={a.base_unit_code} />
          <Field label="Unit" value={a.base_unit_code ? a.base_unit_code : "N/A (Building Asset)"} />
        </div>

        {/* Make & Model */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Make & Model</p>
        <div className="mb-6">
          <Field label="Manufacturer" value={a.make_brand} />
          <Field label="Model" value={a.model} />
          <Field label="Serial No" value={a.serial_number} />
        </div>

        {/* Lifecycle */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Lifecycle</p>
        <div className="mb-6">
          <Field label="Install Date" value={formatDate(a.installation_date)} />
          <Field
            label="Warranty Expiry"
            value={warrantyExpired ? `${formatDate(a.warranty_expiry)} (expired)` : formatDate(a.warranty_expiry)}
            warn={warrantyExpired}
          />
          <Field label="Purchase Cost" value={a.purchase_cost ? `OMR ${a.purchase_cost.toLocaleString()}` : "—"} />
          <Field label="Service Group" value={a.service_group_code} />
          <Field label="Client" value={a.client_code} link />
        </div>

        {/* PPM */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Maintenance</p>
        <div className="mb-6">
          <Field label="Last PPM" value={ppm?.last_run_date ? formatDate(ppm.last_run_date) : "—"} />
          <Field label="Next PPM" value={ppm?.next_run_date ? formatDate(ppm.next_run_date) : "—"} />
        </div>

        {/* Work Order History */}
        <div>
          <p className="text-base font-bold text-foreground mb-3">Work Order History</p>
          {workOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No work orders found.</p>
          ) : (
            <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-border">
              {workOrders.map((wo, i) => (
                <div key={wo.name} className={`flex items-center justify-between px-4 py-3 ${i < workOrders.length - 1 ? "border-b border-border" : ""} hover:bg-muted/40 transition-colors`}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-primary cursor-pointer hover:underline">{wo.name}</span>
                    <span className="text-sm text-foreground">{wo.subject || wo.description || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}
                    </span>
                    {wo.status && (
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${WO_STATUS_COLOR[wo.status] || "bg-muted text-muted-foreground"}`}>
                        {wo.status}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

type AssetTab = "All Assets" | "Building Assets" | "Unit Assets";

export default function Assets() {
  const [tab, setTab] = useState<AssetTab>("All Assets");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedProp, setExpandedProp] = useState<string | null>("All Properties");

  const tabFilters: FrappeFilters =
    tab === "Building Assets" ? [] : // would need a specific field to distinguish
    tab === "Unit Assets" ? [] : [];

  const { data: assets, loading, error, refetch } = useFrappeList<AssetListItem>(
    "CFAM Asset",
    ["name", "asset_code", "asset_name", "asset_master_category", "asset_category",
      "property_code", "property_name", "zone_code", "sub_zone_code", "base_unit_code",
      "asset_status", "criticality", "client_code", "make_brand", "model",
      "installation_date", "warranty_expiry", "asset_image", "service_group_code"],
    tabFilters, [tab]
  );

  const { data: ppms } = useFrappeList<{ cafm_asset: string; last_run_date?: string; next_run_date?: string }>(
    "PPM Schedule", ["cafm_asset", "last_run_date", "next_run_date"], [], []
  );

  const ppmMap: Record<string, PPMInfo> = {};
  ppms.forEach((p) => { if (p.cafm_asset) ppmMap[p.cafm_asset] = p; });

  /* search */
  const filtered = assets.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.asset_name?.toLowerCase().includes(q) ||
      a.asset_code?.toLowerCase().includes(q) ||
      a.asset_category?.toLowerCase().includes(q) ||
      a.property_name?.toLowerCase().includes(q) ||
      a.serial_number?.toLowerCase().includes(q);
  });

  /* group by property */
  const grouped: Record<string, AssetListItem[]> = {};
  filtered.forEach((a) => {
    const key = a.property_name || a.property_code || "Unknown Property";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });
  const allKey = "All Properties";

  useEffect(() => {
    if (filtered.length > 0 && !selectedName && !showNewForm) setSelectedName(filtered[0].name);
  }, [filtered, selectedName, showNewForm]);

  return (
    <div className="flex flex-col h-full">
      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-full focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search Assets…" />
          </div>
          <span className="filter-chip"><Filter className="w-3.5 h-3.5" /> Asset Type</span>
          <span className="filter-chip"><Building2 className="w-3.5 h-3.5" /> Property</span>
          <span className="filter-chip"><Activity className="w-3.5 h-3.5" /> Status</span>
          <span className="filter-chip"><Package className="w-3.5 h-3.5" /> Category</span>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => { setShowNewForm(true); setSelectedName(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Asset
          </button>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL ── */}
        <div className="w-[380px] min-w-[380px] border-r border-border flex flex-col bg-card overflow-hidden">
          {/* tabs */}
          <div className="flex border-b border-border">
            {(["All Assets", "Building Assets", "Unit Assets"] as AssetTab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap px-1
                  ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && <LoadingSpinner />}
            {error && <ErrorBanner message={error} onRetry={refetch} />}

            {!loading && !error && (
              <>
                {/* All Properties group header */}
                <button onClick={() => setExpandedProp(expandedProp === allKey ? null : allKey)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-muted/40 text-xs font-bold text-foreground uppercase tracking-wide border-b border-border">
                  <span>{allKey}</span>
                  {expandedProp === allKey
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {expandedProp === allKey && Object.keys(grouped).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Package className="w-8 h-8" />
                    <p className="text-sm">No assets found</p>
                  </div>
                )}

                {expandedProp === allKey && Object.entries(grouped).map(([propName, propAssets]) => (
                  <div key={propName}>
                    {Object.keys(grouped).length > 1 && (
                      <div className="px-4 py-1.5 bg-muted/20 border-b border-border text-xs text-muted-foreground font-semibold flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {propName} ({propAssets.length})
                      </div>
                    )}
                    {propAssets.map((a) => (
                      <AssetCard key={a.name} a={a}
                        selected={selectedName === a.name && !showNewForm}
                        ppm={ppmMap[a.name]}
                        onClick={() => { setSelectedName(a.name); setShowNewForm(false); }} />
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-y-auto bg-background">
          {showNewForm ? (
            <NewAssetForm onClose={() => setShowNewForm(false)}
              onCreated={(name) => { setShowNewForm(false); setSelectedName(name); refetch(); }} />
          ) : selectedName ? (
            <DetailView assetName={selectedName} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Package className="w-10 h-10" />
              <p className="text-sm">Select an asset to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
