/**
 * Requests.tsx
 * Facility-UI — Service Request module
 * All list/link data is fetched dynamically from Frappe REST API.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, Filter, MapPin, Zap, CheckCircle2, ChevronDown, ChevronUp,
  MoreVertical, Pencil, Camera, Send, Link2, QrCode, Copy, X,
  Clock, Mail, Smartphone, MessageSquare, FileText, ChevronRight,
  RefreshCw, AlertCircle, Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

/* ═══════════════════════════════════════════
   FRAPPE API HELPERS
═══════════════════════════════════════════ */

const FRAPPE_BASE = ""; // same-origin; set to "https://your-site.com" if cross-origin

type FrappeFilters = [string, string, string | number | boolean][];

async function frappeGet<T>(
  doctype: string,
  fields: string[],
  filters: FrappeFilters = [],
  orderBy = "",
  limit = 0
): Promise<T[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit || 500),
    ...(orderBy ? { order_by: orderBy } : {}),
  });
  const res = await fetch(
    `${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}?${params}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error(`GET ${doctype} failed: ${res.statusText}`);
  const json = await res.json();
  return json.data as T[];
}

async function frappeGetDoc<T>(doctype: string, name: string): Promise<T> {
  const res = await fetch(
    `${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error(`GET ${doctype}/${name} failed: ${res.statusText}`);
  const json = await res.json();
  return json.data as T;
}

async function frappeCreate<T>(doctype: string, payload: Partial<T>): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Frappe-CSRF-Token": getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.exc_type || `POST ${doctype} failed`);
  }
  const json = await res.json();
  return json.data as T;
}

function getCsrfToken(): string {
  return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || "";
}

/* ═══════════════════════════════════════════
   TYPES — mirrors Frappe doctypes
═══════════════════════════════════════════ */

interface SRListItem {
  name: string;
  sr_number: string;
  sr_title: string;
  status: string;
  priority_actual: string;
  property_code: string;
  property_name?: string;
  zone_code?: string;
  client_code: string;
  client_name?: string;
  raised_date: string;
  raised_time?: string;
  wo_source: string;
  response_sla_status?: string;
  resolution_sla_status?: string;
  converted_to_wo?: 0 | 1;
}

interface SRDetail extends SRListItem {
  sr_number: string;
  contract_code?: string;
  contract_group?: string;
  sub_zone_code?: string;
  base_unit_code?: string;
  asset_code?: string;
  service_group?: string;
  fault_category?: string;
  fault_code?: string;
  priority_default?: string;
  priority_change_reason?: string;
  approval_criticality?: string;
  reported_by?: string;
  contact_phone?: string;
  requester_email?: string;
  notification_email?: 0 | 1;
  notification_sms?: 0 | 1;
  special_instructions?: string;
  work_description?: string;
  appointment_date?: string;
  preferred_datetime?: string;
  response_sla_target?: string;
  response_sla_actual?: string;
  resolution_sla_target?: string;
  resolution_sla_actual?: string;
  customer_rating?: string;
  remarks?: string;
  initiator_type?: string;
  reporting_level?: string;
  location_full_path?: string;
  business_type?: string;
  amended_from?: string;
}

interface FrappeOption { value: string; label: string; }

/* ═══════════════════════════════════════════
   REUSABLE HOOKS
═══════════════════════════════════════════ */

function useFrappeList<T>(
  doctype: string,
  fields: string[],
  filters: FrappeFilters,
  deps: unknown[],
  skip = false
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (skip) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await frappeGet<T>(doctype, fields, filters);
      setData(rows);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

function useFrappeDoc<T>(doctype: string, name: string, skip = false) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name || skip) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    frappeGetDoc<T>(doctype, name)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e: unknown) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [doctype, name, skip]);

  return { data, loading, error };
}

/* ═══════════════════════════════════════════
   COLOUR / BADGE MAPS
═══════════════════════════════════════════ */

const statusColor: Record<string, string> = {
  Open: "text-emerald-600", "In Progress": "text-blue-600",
  "Pending Approval": "text-amber-600", Converted: "text-violet-600",
  Closed: "text-muted-foreground", Cancelled: "text-red-500",
};
const statusDot: Record<string, string> = {
  Open: "bg-emerald-500", "In Progress": "bg-blue-500",
  "Pending Approval": "bg-amber-500", Converted: "bg-violet-500",
  Closed: "bg-gray-400", Cancelled: "bg-red-400",
};
const statusBadge: Record<string, string> = {
  Open: "bg-emerald-100 text-emerald-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "Pending Approval": "bg-amber-100 text-amber-700",
  Converted: "bg-violet-100 text-violet-700",
  Closed: "bg-muted text-muted-foreground",
  Cancelled: "bg-red-100 text-red-700",
};
const priorityClass: Record<string, string> = {
  "P1 - Critical": "badge-critical", "P2 - High": "badge-high",
  "P3 - Medium": "badge-medium", "P4 - Low": "badge-low",
};
const priorityShort: Record<string, string> = {
  "P1 - Critical": "Critical", "P2 - High": "High",
  "P3 - Medium": "Medium", "P4 - Low": "Low",
};
const slaBadge: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Met: "bg-emerald-100 text-emerald-700",
  Breached: "bg-red-100 text-red-700",
};

/* ═══════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════ */

function Field({
  label, value, link, badge, badgeClass,
}: { label: string; value?: string | null; link?: boolean; badge?: boolean; badgeClass?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      {badge ? (
        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${badgeClass}`}>{value || "—"}</span>
      ) : link ? (
        <span className="text-sm text-primary font-medium cursor-pointer hover:underline">{value || "—"}</span>
      ) : (
        <span className="text-sm text-foreground font-medium">{value || "—"}</span>
      )}
    </div>
  );
}

function FrappeSelect({
  label, value, onChange, options, placeholder, required, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: FrappeOption[]; placeholder?: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      >
        <option value="">{placeholder || `Select ${label}…`}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function FrappeInput({
  label, value, onChange, placeholder, required, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg mx-4 my-3">
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-semibold text-destructive underline">Retry</button>
      )}
    </div>
  );
}

/* time-ago helper */
function timeAgo(dateStr: string, timeStr?: string): string {
  const base = timeStr ? `${dateStr}T${timeStr}` : dateStr;
  const diff = Date.now() - new Date(base).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

/* ═══════════════════════════════════════════
   NEW REQUEST FORM
═══════════════════════════════════════════ */

interface NewSRForm {
  sr_title: string;
  wo_source: string;
  initiator_type: string;
  raised_date: string;
  raised_time: string;
  client_code: string;
  contract_code: string;
  property_code: string;
  zone_code: string;
  sub_zone_code: string;
  base_unit_code: string;
  reporting_level: string;
  asset_code: string;
  service_group: string;
  fault_category: string;
  fault_code: string;
  priority_actual: string;
  approval_criticality: string;
  reported_by: string;
  contact_phone: string;
  requester_email: string;
  special_instructions: string;
  notification_email: boolean;
  notification_sms: boolean;
  appointment_date: string;
  preferred_datetime: string;
}

const BLANK_FORM: NewSRForm = {
  sr_title: "", wo_source: "", initiator_type: "", raised_date: new Date().toISOString().split("T")[0],
  raised_time: "", client_code: "", contract_code: "", property_code: "",
  zone_code: "", sub_zone_code: "", base_unit_code: "", reporting_level: "",
  asset_code: "", service_group: "", fault_category: "", fault_code: "",
  priority_actual: "", approval_criticality: "", reported_by: "", contact_phone: "",
  requester_email: "", special_instructions: "", notification_email: true,
  notification_sms: false, appointment_date: "", preferred_datetime: "",
};

function NewRequestForm({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (name: string) => void }) {
  const [form, setForm] = useState<NewSRForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const set = (key: keyof NewSRForm) => (val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  /* ── linked list data ── */
  const { data: clients } = useFrappeList<{ name: string; client_name: string }>(
    "Client", ["name", "client_name"], [], []
  );
  const { data: contracts } = useFrappeList<{ name: string; contract_title: string }>(
    "FM Contract", ["name", "contract_title"],
    form.client_code ? [["client_code", "=", form.client_code], ["status", "=", "Active"]] : [["status", "=", "Active"]],
    [form.client_code]
  );
  const { data: properties } = useFrappeList<{ name: string; property_name: string }>(
    "Property", ["name", "property_name"],
    [
      ...(form.client_code ? [["client_code", "=", form.client_code] as [string, string, string]] : []),
      ["is_active", "=", "1"],
    ],
    [form.client_code]
  );
  const { data: zones } = useFrappeList<{ name: string; zone_name: string }>(
    "Zone", ["name", "zone_name"],
    [
      ...(form.property_code ? [["property_code", "=", form.property_code] as [string, string, string]] : []),
      ["is_active", "=", "1"],
    ],
    [form.property_code],
    !form.property_code
  );
  const { data: subZones } = useFrappeList<{ name: string; sub_zone_name: string }>(
    "Sub Zone", ["name", "sub_zone_name"],
    [
      ...(form.zone_code ? [["zone_code", "=", form.zone_code] as [string, string, string]] : []),
      ["is_active", "=", "1"],
    ],
    [form.zone_code],
    !form.zone_code
  );
  const { data: baseUnits } = useFrappeList<{ name: string; base_unit_name: string }>(
    "Base Unit", ["name", "base_unit_name"],
    [
      ...(form.sub_zone_code ? [["sub_zone_code", "=", form.sub_zone_code] as [string, string, string]] : []),
      ["is_active", "=", "1"],
    ],
    [form.sub_zone_code],
    !form.sub_zone_code
  );
  const { data: assets } = useFrappeList<{ name: string; asset_name: string; asset_code: string }>(
    "CFAM Asset", ["name", "asset_code", "asset_name"],
    [
      ...(form.property_code ? [["property_code", "=", form.property_code] as [string, string, string]] : []),
      ["asset_status", "=", "Active"],
    ],
    [form.property_code],
    !form.property_code
  );
  const { data: faultCodes } = useFrappeList<{ name: string }>(
    "Fault Code", ["name"], [], []
  );

  /* cascade resets */
  const handleClientChange = (v: string) => {
    setForm((f) => ({ ...f, client_code: v, contract_code: "", property_code: "", zone_code: "", sub_zone_code: "", base_unit_code: "", asset_code: "" }));
  };
  const handlePropertyChange = (v: string) => {
    setForm((f) => ({ ...f, property_code: v, zone_code: "", sub_zone_code: "", base_unit_code: "", asset_code: "" }));
  };
  const handleZoneChange = (v: string) => {
    setForm((f) => ({ ...f, zone_code: v, sub_zone_code: "", base_unit_code: "" }));
  };
  const handleSubZoneChange = (v: string) => {
    setForm((f) => ({ ...f, sub_zone_code: v, base_unit_code: "" }));
  };

  const handleSubmit = async () => {
    if (!form.sr_title || !form.client_code || !form.property_code || !form.priority_actual || !form.wo_source) {
      setSaveError("Please fill all required fields (Title, Client, Property, Priority, Request Mode).");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...form,
        notification_email: form.notification_email ? 1 : 0,
        notification_sms: form.notification_sms ? 1 : 0,
        status: "Open",
      };
      const doc = await frappeCreate<SRDetail>("Service Request", payload);
      onCreated(doc.name);
    } catch (e: unknown) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toOpts = (arr: { name: string; label?: string }[], labelKey?: string): FrappeOption[] =>
    arr.map((r) => ({ value: r.name, label: (r as Record<string, string>)[labelKey || ""] || r.name }));

  return (
    <div className="max-w-2xl mx-auto py-6 px-6 fade-in">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">New Service Request</h2>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {saveError && <ErrorBanner message={saveError} onRetry={() => setSaveError(null)} />}

      {/* ── Section: Request Details ── */}
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-4">Request Details</p>

      <FrappeInput label="Subject / Title" value={form.sr_title} onChange={set("sr_title")} placeholder="Enter request subject…" required />

      <div className="grid grid-cols-2 gap-3">
        <FrappeSelect
          label="Request Mode" value={form.wo_source} onChange={set("wo_source")} required
          options={["Portal", "Phone", "Email", "Mobile App", "On-Site", "System"].map((v) => ({ value: v, label: v }))}
        />
        <FrappeSelect
          label="Initiator Type" value={form.initiator_type} onChange={set("initiator_type")}
          options={["Helpdesk", "Client", "Technician", "System", "Inspection"].map((v) => ({ value: v, label: v }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FrappeInput label="Raised Date" value={form.raised_date} onChange={set("raised_date")} type="date" required />
        <FrappeInput label="Raised Time" value={form.raised_time} onChange={set("raised_time")} type="time" />
      </div>

      {/* ── Section: Priority ── */}
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Priority</p>
      <div className="mb-4 flex gap-2">
        {["P1 - Critical", "P2 - High", "P3 - Medium", "P4 - Low"].map((p) => (
          <button key={p} onClick={() => set("priority_actual")(p)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all flex-1 ${form.priority_actual === p ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary"}`}>
            {priorityShort[p]}
          </button>
        ))}
      </div>
      <FrappeSelect
        label="Approval Criticality" value={form.approval_criticality} onChange={set("approval_criticality")}
        options={["Normal", "High", "Critical", "Emergency"].map((v) => ({ value: v, label: v }))}
      />

      {/* ── Section: Client & Contract ── */}
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Client & Contract</p>
      <FrappeSelect
        label="Client" value={form.client_code} onChange={handleClientChange} required
        options={toOpts(clients as { name: string; label?: string }[], "client_name")}
        placeholder="Search client…"
      />
      <FrappeSelect
        label="Contract" value={form.contract_code} onChange={set("contract_code")}
        options={toOpts(contracts as { name: string; label?: string }[], "contract_title")}
        placeholder="Select active contract…" disabled={!form.client_code}
      />

      {/* ── Section: Location Hierarchy ── */}
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Location</p>
      <FrappeSelect
        label="Property" value={form.property_code} onChange={handlePropertyChange} required
        options={toOpts(properties as { name: string; label?: string }[], "property_name")}
        placeholder="Select property…" disabled={!form.client_code}
      />
      <div className="grid grid-cols-2 gap-3">
        <FrappeSelect
          label="Zone" value={form.zone_code} onChange={handleZoneChange}
          options={toOpts(zones as { name: string; label?: string }[], "zone_name")}
          placeholder="Select zone…" disabled={!form.property_code}
        />
        <FrappeSelect
          label="Sub Zone" value={form.sub_zone_code} onChange={handleSubZoneChange}
          options={toOpts(subZones as { name: string; label?: string }[], "sub_zone_name")}
          placeholder="Select sub zone…" disabled={!form.zone_code}
        />
      </div>
      <FrappeSelect
        label="Base Unit" value={form.base_unit_code} onChange={set("base_unit_code")}
        options={toOpts(baseUnits as { name: string; label?: string }[], "base_unit_name")}
        placeholder="Select base unit…" disabled={!form.sub_zone_code}
      />
      <FrappeSelect
        label="Reporting Level" value={form.reporting_level} onChange={set("reporting_level")}
        options={["Property", "Zone", "Sub Zone", "Base Unit", "Asset"].map((v) => ({ value: v, label: v }))}
      />
      {/* live location path */}
      {form.property_code && (
        <div className="mb-4 flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          <MapPin className="w-3 h-3 shrink-0" />
          {[
            properties.find((p) => p.name === form.property_code)?.property_name,
            zones.find((z) => z.name === form.zone_code)?.zone_name,
            subZones.find((s) => s.name === form.sub_zone_code)?.sub_zone_name,
            baseUnits.find((b) => b.name === form.base_unit_code)?.base_unit_name,
          ].filter(Boolean).join(" › ")}
        </div>
      )}

      {/* ── Section: Asset & Fault ── */}
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Asset & Fault</p>
      <FrappeSelect
        label="Asset" value={form.asset_code} onChange={set("asset_code")}
        options={(assets as { name: string; asset_code: string; asset_name: string }[]).map((a) => ({
          value: a.name, label: `${a.asset_code} — ${a.asset_name}`,
        }))}
        placeholder="Search asset…" disabled={!form.property_code}
      />
      <FrappeInput label="Service Group" value={form.service_group} onChange={set("service_group")} placeholder="e.g. MEP, Civil, IT…" />
      <FrappeInput label="Fault Category" value={form.fault_category} onChange={set("fault_category")} placeholder="e.g. HVAC, Plumbing…" />
      <FrappeSelect
        label="Fault Code" value={form.fault_code} onChange={set("fault_code")}
        options={faultCodes.map((f) => ({ value: f.name, label: f.name }))}
        placeholder="Search fault code…"
      />

      {/* ── Section: Reporter ── */}
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Reporter</p>
      <div className="grid grid-cols-2 gap-3">
        <FrappeInput label="Reported By" value={form.reported_by} onChange={set("reported_by")} placeholder="Name…" />
        <FrappeInput label="Contact Phone" value={form.contact_phone} onChange={set("contact_phone")} placeholder="+968-XXXX-XXXX" type="tel" />
      </div>
      <FrappeInput label="Requester Email" value={form.requester_email} onChange={set("requester_email")} placeholder="email@domain.com" type="email" />
      <div className="mb-4">
        <label className="block text-sm font-semibold text-foreground mb-1.5">Special Instructions</label>
        <textarea
          value={form.special_instructions}
          onChange={(e) => set("special_instructions")(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
          placeholder="Any special access requirements, safety notes…"
        />
      </div>

      {/* ── Section: Scheduling ── */}
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Scheduling</p>
      <div className="grid grid-cols-2 gap-3">
        <FrappeInput label="Appointment Date" value={form.appointment_date} onChange={set("appointment_date")} type="date" />
        <FrappeInput label="Preferred Date & Time" value={form.preferred_datetime} onChange={set("preferred_datetime")} type="datetime-local" />
      </div>

      {/* ── Notifications ── */}
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Notifications</p>
      <div className="mb-4 flex flex-col gap-3">
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input type="checkbox" checked={form.notification_email} onChange={(e) => set("notification_email")(e.target.checked)}
            className="rounded border-border w-4 h-4" />
          <Mail className="w-4 h-4 text-muted-foreground" /> Send Email Notification
        </label>
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input type="checkbox" checked={form.notification_sms} onChange={(e) => set("notification_sms")(e.target.checked)}
            className="rounded border-border w-4 h-4" />
          <Smartphone className="w-4 h-4 text-muted-foreground" /> Send SMS Notification
        </label>
      </div>

      {/* photo upload */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-foreground mb-1.5">Photo</label>
        <div className="border-2 border-dashed border-border rounded-lg py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer">
          <Camera className="w-6 h-6" />
          <span className="text-sm">Attach photo or drag here</span>
        </div>
      </div>

      {/* submit */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Send className="w-4 h-4" /> Submit Request</>}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DETAIL VIEW
═══════════════════════════════════════════ */

function DetailView({ srName, onClose }: { srName: string; onClose: () => void }) {
  const { data: sr, loading, error } = useFrappeDoc<SRDetail>("Service Request", srName);
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});
  const togglePanel = (key: string) =>
    setCollapsedPanels((p) => ({ ...p, [key]: !p[key] }));

  const CollapsibleSection = ({ title, id, children }: { title: string; id: string; children: React.ReactNode }) => (
    <div className="border-b border-border">
      <button onClick={() => togglePanel(id)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors -mx-5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {collapsedPanels[id] ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {!collapsedPanels[id] && <div className="pb-4 fade-in">{children}</div>}
    </div>
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!sr) return null;

  return (
    <div className="fade-in">
      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
        <div>
          <h2 className="text-xl font-bold text-foreground">{sr.sr_title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{sr.sr_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button className="p-1.5 rounded-lg hover:bg-muted">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {/* Status & Details */}
        <CollapsibleSection title="Status & Details" id="status">
          <Field label="Status" value={sr.status} badge badgeClass={statusBadge[sr.status] || "bg-muted text-muted-foreground"} />
          <Field label="Response SLA" value={sr.response_sla_status} badge badgeClass={slaBadge[sr.response_sla_status || ""] || "bg-muted text-muted-foreground"} />
          <Field label="Resolution SLA" value={sr.resolution_sla_status} badge badgeClass={slaBadge[sr.resolution_sla_status || ""] || "bg-muted text-muted-foreground"} />
          <Field label="Priority" value={priorityShort[sr.priority_actual] || sr.priority_actual} badge badgeClass={priorityClass[sr.priority_actual]} />
          <Field label="Approval Criticality" value={sr.approval_criticality} />
          <Field label="Request Mode" value={sr.wo_source} />
          <Field label="Initiator Type" value={sr.initiator_type} />
          <Field label="Raised Date" value={sr.raised_date} />
          <Field label="Raised Time" value={sr.raised_time} />
          <Field label="Converted to WO" value={sr.converted_to_wo ? "Yes" : "No"} />
        </CollapsibleSection>

        {/* Client & Contract */}
        <CollapsibleSection title="Client & Contract" id="client">
          <Field label="Client" value={sr.client_name || sr.client_code} link />
          <Field label="Contract" value={sr.contract_code} link />
          <Field label="Contract Group" value={sr.contract_group} />
        </CollapsibleSection>

        {/* Location */}
        <CollapsibleSection title="Location & Routing" id="location">
          <Field label="Property" value={sr.property_name || sr.property_code} link />
          <Field label="Zone" value={sr.zone_code} />
          <Field label="Sub Zone" value={sr.sub_zone_code} />
          <Field label="Base Unit" value={sr.base_unit_code} />
          <Field label="Reporting Level" value={sr.reporting_level} />
          <Field label="Business Type" value={sr.business_type} />
          {sr.location_full_path && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <MapPin className="w-3 h-3" /> {sr.location_full_path}
            </div>
          )}
        </CollapsibleSection>

        {/* Asset & Fault */}
        <CollapsibleSection title="Asset & Fault" id="asset">
          <Field label="Asset" value={sr.asset_code} link />
          <Field label="Service Group" value={sr.service_group} />
          <Field label="Fault Category" value={sr.fault_category} />
          <Field label="Fault Code" value={sr.fault_code} />
          <Field label="Priority (Default)" value={sr.priority_default} />
          {sr.priority_change_reason && (
            <Field label="Priority Change Reason" value={sr.priority_change_reason} />
          )}
        </CollapsibleSection>

        {/* Reporter */}
        <CollapsibleSection title="Reporter & Contact" id="reporter">
          <Field label="Reported By" value={sr.reported_by} />
          <Field label="Contact Phone" value={sr.contact_phone} />
          <Field label="Email" value={sr.requester_email} />
          {sr.special_instructions && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground font-medium mb-1">Special Instructions</p>
              <p className="text-sm text-foreground leading-relaxed">{sr.special_instructions}</p>
            </div>
          )}
        </CollapsibleSection>

        {/* Description (auto-generated) */}
        {sr.work_description && (
          <CollapsibleSection title="Work Description" id="desc">
            <p className="text-sm text-foreground leading-relaxed">{sr.work_description}</p>
          </CollapsibleSection>
        )}

        {/* SLA */}
        <CollapsibleSection title="SLA & Scheduling" id="sla">
          <Field label="Appointment Date" value={sr.appointment_date} />
          <Field label="Preferred Date & Time" value={sr.preferred_datetime} />
          <Field label="Response SLA Target" value={sr.response_sla_target} />
          <Field label="Response SLA Actual" value={sr.response_sla_actual} />
          <Field label="Resolution SLA Target" value={sr.resolution_sla_target} />
          <Field label="Resolution SLA Actual" value={sr.resolution_sla_actual} />
        </CollapsibleSection>

        {/* Notifications */}
        <div className="border-b border-border py-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Notifications</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" /> Email Notification
              </span>
              <Switch checked={!!sr.notification_email} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" /> SMS Notification
              </span>
              <Switch checked={!!sr.notification_sms} />
            </div>
          </div>
        </div>

        {/* Internal notes */}
        <div className="border-b border-border py-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Internal Notes</h3>
          <textarea
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
            placeholder="Add internal notes…"
          />
        </div>

        {/* Closure */}
        {(sr.customer_rating || sr.remarks) && (
          <CollapsibleSection title="Closure & Feedback" id="closure">
            <Field label="Customer Rating" value={sr.customer_rating} />
            <Field label="Remarks" value={sr.remarks} />
          </CollapsibleSection>
        )}

        {/* Convert to WO */}
        {!sr.converted_to_wo && (
          <div className="py-5">
            <button className="w-full py-3 border-2 border-primary text-primary rounded-lg text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2">
              <ChevronRight className="w-4 h-4" /> Convert to Work Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

export default function Requests() {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [showNewForm, setShowNewForm] = useState(false);
  const [showPortals, setShowPortals] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSection = (key: string) =>
    setCollapsedSections((p) => ({ ...p, [key]: !p[key] }));

  /* ── fetch SR list ── */
  const openStatuses = ["Open", "In Progress", "Pending Approval"];
  const closedStatuses = ["Converted", "Closed", "Cancelled"];
  const statusFilter = tab === "open" ? openStatuses : closedStatuses;

  const { data: srList, loading: listLoading, error: listError, refetch } = useFrappeList<SRListItem>(
    "Service Request",
    ["name", "sr_number", "sr_title", "status", "priority_actual",
      "property_code", "property_name", "client_code", "client_name",
      "raised_date", "raised_time", "wo_source", "zone_code",
      "response_sla_status", "resolution_sla_status", "converted_to_wo"],
    [["status", "in", statusFilter.join(",")]],
    [tab]
  );

  /* filter by search */
  const filtered = srList.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.sr_title?.toLowerCase().includes(q) ||
      r.sr_number?.toLowerCase().includes(q) ||
      r.client_name?.toLowerCase().includes(q) ||
      r.property_name?.toLowerCase().includes(q)
    );
  });

  /* select first on load */
  useEffect(() => {
    if (filtered.length > 0 && !selectedName && !showNewForm) {
      setSelectedName(filtered[0].name);
    }
  }, [filtered, selectedName, showNewForm]);

  /* ── request card ── */
  const RequestCard = ({ r }: { r: SRListItem }) => (
    <button
      onClick={() => { setSelectedName(r.name); setShowNewForm(false); }}
      className={`list-item-hover w-full text-left px-4 py-3 border-b border-border flex gap-3 ${selectedName === r.name && !showNewForm ? "selected" : ""}`}
    >
      <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Camera className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{r.sr_title}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3" />
          {[r.property_name || r.property_code, r.zone_code].filter(Boolean).join(" · ")}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`flex items-center gap-1 text-xs font-medium ${statusColor[r.status] || "text-muted-foreground"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[r.status] || "bg-gray-400"}`} />
            {r.status}
          </span>
          <span className="text-xs text-muted-foreground">{r.sr_number}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={priorityClass[r.priority_actual] || "badge-low"}>
          {priorityShort[r.priority_actual] || r.priority_actual}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {r.raised_date ? timeAgo(r.raised_date, r.raised_time) : "—"}
        </span>
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <h1 className="text-2xl font-bold text-foreground">Requests</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPortals(true)}
            className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
          >
            <Link2 className="w-3.5 h-3.5" /> Request Portals
          </button>
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${listLoading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-56 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search Requests…"
            />
          </div>
          <button
            onClick={() => { setShowNewForm(true); setSelectedName(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>
      </div>

      {/* filter row */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-card">
        <span className="filter-chip"><Filter className="w-3.5 h-3.5" /> Filter</span>
        <span className="filter-chip">🏗 Asset</span>
        <span className="filter-chip"><MapPin className="w-3.5 h-3.5" /> Location</span>
        <span className="filter-chip"><Zap className="w-3.5 h-3.5" /> Priority</span>
        <span className="filter-chip"><CheckCircle2 className="w-3.5 h-3.5" /> Status</span>
        <span className="filter-chip"><Plus className="w-3 h-3" /> Add Filter</span>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL ── */}
        <div className="w-[380px] min-w-[380px] border-r border-border flex flex-col bg-card overflow-hidden">
          {/* tabs */}
          <div className="flex border-b border-border">
            {(["open", "closed"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "open" ? "Open" : "Closed"}
              </button>
            ))}
          </div>

          {/* sort hint */}
          <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-1">
            Sort By: <span className="font-medium text-foreground">Raised Date: Newest First</span> <ChevronDown className="w-3 h-3" />
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto">
            {listLoading && <LoadingSpinner />}
            {listError && <ErrorBanner message={listError} onRetry={refetch} />}
            {!listLoading && !listError && (
              <>
                {/* Assigned to Me — filtered as records where wo_source = "Portal" or any heuristic;
                    in production wire this to the logged-in user's assigned requests */}
                <button
                  onClick={() => toggleSection("me")}
                  className="w-full flex items-center justify-between px-4 py-2 bg-muted/60 text-xs font-bold text-foreground uppercase tracking-wide"
                >
                  <span>Assigned to Me ({filtered.filter((_, i) => i % 2 === 0).length})</span>
                  {collapsedSections.me
                    ? <ChevronRight className="w-3.5 h-3.5" />
                    : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                {!collapsedSections.me &&
                  filtered.filter((_, i) => i % 2 === 0).map((r) => <RequestCard key={r.name} r={r} />)}

                <button
                  onClick={() => toggleSection("other")}
                  className="w-full flex items-center justify-between px-4 py-2 bg-muted/60 text-xs font-bold text-foreground uppercase tracking-wide"
                >
                  <span>Other Teams ({filtered.filter((_, i) => i % 2 !== 0).length})</span>
                  {collapsedSections.other
                    ? <ChevronRight className="w-3.5 h-3.5" />
                    : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                {!collapsedSections.other &&
                  filtered.filter((_, i) => i % 2 !== 0).map((r) => <RequestCard key={r.name} r={r} />)}

                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                    <FileText className="w-8 h-8" />
                    <p className="text-sm">No requests found</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-border py-3 text-center">
            <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer underline">
              All {tab === "open" ? "Open" : "Closed"} Requests ({filtered.length})
            </span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-y-auto bg-background">
          {showNewForm ? (
            <NewRequestForm
              onClose={() => setShowNewForm(false)}
              onCreated={(name) => { setShowNewForm(false); setSelectedName(name); refetch(); }}
            />
          ) : selectedName ? (
            <DetailView srName={selectedName} onClose={() => setSelectedName(null)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <MessageSquare className="w-10 h-10" />
              <p className="text-sm">Select a request to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ REQUEST PORTALS DRAWER ═══ */}
      {showPortals && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowPortals(false)} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-card border-l border-border z-50 shadow-xl flex flex-col fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Request Portals</h2>
              <button onClick={() => setShowPortals(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Request Portals are customizable web-based forms where anyone can submit a Request for your facility — no app or login required.
              </p>
              <div className="flex flex-col gap-3 mb-6 text-sm text-foreground">
                <span className="flex items-center gap-2 italic"><ChevronRight className="w-4 h-4 text-primary" /> Shared via link or QR code</span>
                <span className="flex items-center gap-2 italic"><Link2 className="w-4 h-4 text-primary" /> Linked to a preset Asset or Location</span>
                <span className="flex items-center gap-2 italic"><Mail className="w-4 h-4 text-primary" /> Receive email notifications only</span>
              </div>
              <button className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mb-6">
                <Plus className="w-4 h-4" /> Create Request Portal
              </button>
              <div className="border border-border rounded-xl p-4 flex gap-3">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Lobby Request Portal</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sample Portal</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
                      <Copy className="w-3 h-3" /> Copy Link
                    </button>
                    <button className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}