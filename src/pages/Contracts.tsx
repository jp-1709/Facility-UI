/**
 * Contracts.tsx
 * Facility-UI — FM Contract module
 * Dynamic data from Frappe REST API, matching fm_contract.json schema.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, Filter, Building2, User, Calendar, Tag,
  CheckCircle2, ChevronDown, ChevronRight, MoreVertical,
  Pencil, X, Loader2, AlertCircle, RefreshCw, FileText,
  DollarSign, Clock, Shield, AlertTriangle, CheckCheck, XCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

/* ═══════════════════════════════════════════
   FRAPPE API HELPERS
═══════════════════════════════════════════ */

const FRAPPE_BASE = "";

type FrappeFilters = [string, string, string | number][];

async function frappeGet<T>(
  doctype: string,
  fields: string[],
  filters: FrappeFilters = [],
  orderBy = "",
  limit = 500
): Promise<T[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit),
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
    throw new Error((err as { exc_type?: string })?.exc_type || `POST ${doctype} failed`);
  }
  const json = await res.json();
  return json.data as T;
}

function getCsrfToken(): string {
  return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || "";
}

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */

interface ContractListItem {
  name: string;
  contract_code: string;
  contract_title: string;
  client_code: string;
  client_name?: string;
  contract_group?: string;
  contract_type?: string;
  start_date: string;
  end_date: string;
  annual_value?: number;
  fixed_monthly?: number;
  billing_model?: string;
  payment_status?: string;
  status: string;
}

interface ContractDetail extends ContractListItem {
  amended_from?: string;
  sla_details?: SLARow[];
}

interface SLARow {
  priority: string;
  response_hours: number;
  resolution_hours: number;
}

interface Client {
  name: string;
  client_name: string;
}

/* ═══════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════ */

function useFrappeList<T>(doctype: string, fields: string[], filters: FrappeFilters, deps: unknown[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await frappeGet<T>(doctype, fields, filters)); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

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
   COLOUR MAPS
═══════════════════════════════════════════ */

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  Active:     { label: "Active",      bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", icon: <CheckCheck className="w-3 h-3" /> },
  Draft:      { label: "Draft",       bg: "bg-gray-100",    text: "text-gray-600",    dot: "bg-gray-400",    icon: <FileText className="w-3 h-3" /> },
  Expired:    { label: "Expired",     bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-400",     icon: <XCircle className="w-3 h-3" /> },
  Terminated: { label: "Terminated",  bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-600",     icon: <XCircle className="w-3 h-3" /> },
  "On Hold":  { label: "On Hold",     bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500",   icon: <AlertTriangle className="w-3 h-3" /> },
};

const GROUP_COLORS: Record<string, string> = {
  IFM: "bg-blue-100 text-blue-700", "DC Ops": "bg-violet-100 text-violet-700",
  "Soft FM": "bg-teal-100 text-teal-700", "Hard FM": "bg-orange-100 text-orange-700",
  "MEP Only": "bg-sky-100 text-sky-700", Other: "bg-gray-100 text-gray-600",
  AMC: "bg-indigo-100 text-indigo-700", AdHoc: "bg-pink-100 text-pink-700",
  PMC: "bg-cyan-100 text-cyan-700", FM: "bg-emerald-100 text-emerald-700",
};

const PAYMENT_CONFIG: Record<string, string> = {
  Current: "bg-emerald-100 text-emerald-700", Overdue: "bg-red-100 text-red-700",
  Disputed: "bg-amber-100 text-amber-700", Settled: "bg-gray-100 text-gray-600",
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function formatDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatOMR(v?: number): string {
  if (!v) return "—";
  return `OMR ${v.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

/* ═══════════════════════════════════════════
   SMALL HELPERS
═══════════════════════════════════════════ */

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG["Draft"];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.icon} {c.label}
    </span>
  );
}

function GroupBadge({ group }: { group?: string }) {
  if (!group) return null;
  const cls = GROUP_COLORS[group] || GROUP_COLORS["Other"];
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cls}`}>{group}</span>;
}

function Field({ label, value, link, mono }: { label: string; value?: string | null; link?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground font-medium w-40 shrink-0">{label}</span>
      {link
        ? <span className="text-sm text-primary font-medium cursor-pointer hover:underline text-right">{value || "—"}</span>
        : <span className={`text-sm text-foreground font-medium text-right ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
      }
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-6 mb-1">{children}</h3>
  );
}

function LoadingSpinner() {
  return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
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

/* ═══════════════════════════════════════════
   CONTRACT CARD (left list)
═══════════════════════════════════════════ */

const GROUP_ICONS: Record<string, string> = {
  "IFM": "🏢", "DC Ops": "🖥️", "Soft FM": "🧹", "Hard FM": "🔧",
  "MEP Only": "⚡", "AMC": "🔵", "PMC": "🟢", "FM": "🏗️", "Other": "📄",
};

function ContractCard({
  c, selected, onClick,
}: { c: ContractListItem; selected: boolean; onClick: () => void }) {
  const days = daysUntil(c.end_date);
  const expiring = days >= 0 && days <= 60;
  const expired = days < 0;

  return (
    <button
      onClick={onClick}
      className={`list-item-hover w-full text-left px-4 py-3.5 border-b border-border flex gap-3 transition-colors
        ${selected ? "selected bg-primary/5 border-l-2 border-l-primary" : ""}`}
    >
      {/* icon */}
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 text-lg">
        {GROUP_ICONS[c.contract_group || ""] || GROUP_ICONS["Other"]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{c.contract_title}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.client_name || c.client_code}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {/* property placeholder badge */}
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
            {c.contract_code}
          </span>
          <GroupBadge group={c.contract_group} />
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs font-semibold text-foreground">
          {c.annual_value ? `OMR ${(c.annual_value / 1000).toFixed(0)}K/yr` : "—"}
        </span>
        <span className={`text-[11px] font-medium ${expiring ? "text-amber-600" : expired ? "text-red-500" : "text-muted-foreground"}`}>
          {expired ? `Exp ${formatDate(c.end_date)}` : expiring ? `Exp ${formatDate(c.end_date)} ⚠️` : `Exp ${formatDate(c.end_date)}`}
        </span>
        <StatusBadge status={c.status} />
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   NEW CONTRACT FORM
═══════════════════════════════════════════ */

interface NewContractForm {
  contract_code: string;
  contract_title: string;
  client_code: string;
  contract_group: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  annual_value: string;
  billing_model: string;
  fixed_monthly: string;
  payment_status: string;
  status: string;
}

const BLANK: NewContractForm = {
  contract_code: "", contract_title: "", client_code: "",
  contract_group: "", contract_type: "", start_date: "", end_date: "",
  annual_value: "", billing_model: "", fixed_monthly: "", payment_status: "", status: "Draft",
};

function NewContractForm({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) {
  const [form, setForm] = useState<NewContractForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const set = (k: keyof NewContractForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: clients } = useFrappeList<Client>("Client", ["name", "client_name"], [], []);

  const handleSubmit = async () => {
    if (!form.contract_title || !form.client_code || !form.start_date || !form.end_date) {
      setSaveError("Title, Client, Start Date and End Date are required."); return;
    }
    setSaving(true); setSaveError(null);
    try {
      const doc = await frappeCreate<ContractDetail>("FM Contract", {
        ...form,
        annual_value: form.annual_value ? Number(form.annual_value) : undefined,
        fixed_monthly: form.fixed_monthly ? Number(form.fixed_monthly) : undefined,
      });
      onCreated(doc.name);
    } catch (e: unknown) { setSaveError((e as Error).message); }
    finally { setSaving(false); }
  };

  const LabeledInput = ({ label, field, type = "text", placeholder, required }: {
    label: string; field: keyof NewContractForm; type?: string; placeholder?: string; required?: boolean;
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input type={type} value={form[field]} onChange={(e) => set(field)(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );

  const LabeledSelect = ({ label, field, options, required }: {
    label: string; field: keyof NewContractForm; options: string[]; required?: boolean;
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select value={form[field]} onChange={(e) => set(field)(e.target.value)}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">New Contract</h2>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
      </div>

      {saveError && <ErrorBanner message={saveError} onRetry={() => setSaveError(null)} />}

      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">General Details</p>
      <LabeledInput label="Contract Code" field="contract_code" placeholder="e.g. CON-2026-001" required />
      <LabeledInput label="Contract Title" field="contract_title" placeholder="e.g. HVAC AMC – Tower A" required />

      <div className="mb-4">
        <label className="block text-sm font-semibold text-foreground mb-1.5">Client <span className="text-destructive">*</span></label>
        <select value={form.client_code} onChange={(e) => set("client_code")(e.target.value)}
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Select client…</option>
          {clients.map((c) => <option key={c.name} value={c.name}>{c.client_name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <LabeledSelect label="Contract Group" field="contract_group" options={["IFM", "DC Ops", "Soft FM", "Hard FM", "MEP Only", "Other"]} />
        <LabeledSelect label="Contract Type" field="contract_type" options={["Annual AMC", "Multi-Year AMC", "Spot", "Call-Out", "Project Based", "Other"]} />
      </div>

      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Contract Period</p>
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput label="Start Date" field="start_date" type="date" required />
        <LabeledInput label="End Date" field="end_date" type="date" required />
      </div>

      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Financial Terms</p>
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput label="Annual Value (OMR)" field="annual_value" type="number" placeholder="96000" />
        <LabeledInput label="Fixed Monthly (OMR)" field="fixed_monthly" type="number" placeholder="8000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LabeledSelect label="Billing Model" field="billing_model" options={["Fixed Monthly", "Fixed+Variable", "Unit Rate", "Lump Sum", "Other"]} />
        <LabeledSelect label="Payment Status" field="payment_status" options={["Current", "Overdue", "Disputed", "Settled"]} />
      </div>

      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Status</p>
      <div className="mb-6 flex gap-2">
        {["Draft", "Active", "On Hold"].map((s) => (
          <button key={s} onClick={() => set("status")(s)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${form.status === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary"}`}>
            {s}
          </button>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={saving}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Create Contract</>}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DETAIL VIEW
═══════════════════════════════════════════ */

function DetailView({ contractName }: { contractName: string }) {
  const { data: c, loading, error } = useFrappeDoc<ContractDetail>("FM Contract", contractName);
  const [autoRenew, setAutoRenew] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setCollapsed((p) => ({ ...p, [k]: !p[k] }));

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!c) return null;

  const days = daysUntil(c.end_date);
  const expiryWarning = days >= 0 && days <= 60;

  const Section = ({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="mb-2">
      <button onClick={() => toggle(id)}
        className="w-full flex items-center justify-between py-3 hover:bg-muted/40 rounded-lg px-1 -mx-1 transition-colors">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {icon} {title}
        </span>
        {collapsed[id] ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {!collapsed[id] && <div className="fade-in">{children}</div>}
    </div>
  );

  return (
    <div className="fade-in">
      {/* header */}
      <div className="px-6 pt-6 pb-4 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground leading-tight">{c.contract_title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{c.contract_code}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={c.status} />
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button className="p-1.5 rounded-lg hover:bg-muted">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* quick pills */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <GroupBadge group={c.contract_group} />
          {c.contract_type && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">{c.contract_type}</span>
          )}
          {expiryWarning && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Expiring in {days}d
            </span>
          )}
          {c.payment_status && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${PAYMENT_CONFIG[c.payment_status] || "bg-muted text-muted-foreground"}`}>
              {c.payment_status}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-4">
        {/* General */}
        <Section id="general" title="Contract Details" icon={<FileText className="w-3.5 h-3.5" />}>
          <Field label="Contract ID" value={c.contract_code} mono />
          <Field label="Contract Type" value={c.contract_type} />
          <Field label="Contract Group" value={c.contract_group} />
          <Field label="Client" value={c.client_name || c.client_code} link />
          {c.amended_from && <Field label="Amended From" value={c.amended_from} link />}
        </Section>

        {/* Scope & Duration */}
        <Section id="scope" title="Scope & Duration" icon={<Calendar className="w-3.5 h-3.5" />}>
          <Field label="Start Date" value={formatDate(c.start_date)} />
          <Field label="End Date" value={formatDate(c.end_date)} />
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium w-40 shrink-0">Auto-Renew</span>
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
          </div>
          <Field label="Days Until Expiry" value={days >= 0 ? `${days} days` : "Expired"} />
        </Section>

        {/* Financial */}
        <Section id="financial" title="Financial" icon={<DollarSign className="w-3.5 h-3.5" />}>
          <Field label="Annual Value (OMR)" value={formatOMR(c.annual_value)} />
          <Field label="Billing Model" value={c.billing_model} />
          <Field label="Fixed Monthly (OMR)" value={formatOMR(c.fixed_monthly)} />
          <Field label="Payment Status" value={c.payment_status} />
        </Section>

        {/* SLA */}
        {c.sla_details && c.sla_details.length > 0 && (
          <Section id="sla" title="SLA Configuration" icon={<Shield className="w-3.5 h-3.5" />}>
            <div className="mt-2 rounded-lg overflow-hidden border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Priority</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Response (hrs)</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Resolution (hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {c.sla_details.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-medium text-foreground">{row.priority}</td>
                      <td className="px-3 py-2 text-right text-foreground">{row.response_hours}h</td>
                      <td className="px-3 py-2 text-right text-foreground">{row.resolution_hours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Status tracking */}
        <Section id="status" title="Status & Tracking" icon={<Clock className="w-3.5 h-3.5" />}>
          <Field label="Contract Status" value={c.status} />
        </Section>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

type TabType = "Active" | "Expired" | "All";

export default function Contracts() {
  const [activeTab, setActiveTab] = useState<TabType>("Active");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");

  /* determine filters */
  const listFilters: FrappeFilters = activeTab === "Active"
    ? [["status", "=", "Active"]]
    : activeTab === "Expired"
    ? [["status", "in", "Expired,Terminated"]]
    : [];

  const { data: contracts, loading, error, refetch } = useFrappeList<ContractListItem>(
    "FM Contract",
    ["name", "contract_code", "contract_title", "client_code", "client_name",
      "contract_group", "contract_type", "start_date", "end_date",
      "annual_value", "fixed_monthly", "billing_model", "payment_status", "status"],
    listFilters,
    [activeTab]
  );

  /* search filter */
  const filtered = contracts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.contract_title?.toLowerCase().includes(q) ||
      c.contract_code?.toLowerCase().includes(q) ||
      c.client_name?.toLowerCase().includes(q);
  });

  /* auto-select first */
  useEffect(() => {
    if (filtered.length > 0 && !selectedName && !showNewForm) setSelectedName(filtered[0].name);
  }, [filtered, selectedName, showNewForm]);

  return (
    <div className="flex flex-col h-full">
      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <h1 className="text-2xl font-bold text-foreground">Contracts</h1>
        <div className="flex items-center gap-3">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-64 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search Contracts…" />
          </div>
          <button onClick={() => { setShowNewForm(true); setSelectedName(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Contract
          </button>
        </div>
      </div>

      {/* filter chips */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-card flex-wrap">
        {[
          { icon: <Building2 className="w-3.5 h-3.5" />, label: "Property" },
          { icon: <User className="w-3.5 h-3.5" />, label: "Contractor" },
          { icon: <Calendar className="w-3.5 h-3.5" />, label: "Expiry Date" },
          { icon: <Tag className="w-3.5 h-3.5" />, label: "Contract Type" },
          { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Status" },
          { icon: <Plus className="w-3 h-3" />, label: "Add Filter" },
        ].map(({ icon, label }) => (
          <span key={label} className="filter-chip">{icon} {label}</span>
        ))}
      </div>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL ── */}
        <div className="w-[400px] min-w-[400px] border-r border-border flex flex-col bg-card overflow-hidden">
          {/* tabs */}
          <div className="flex border-b border-border">
            {(["Active", "Expired", "All"] as TabType[]).map((t) => (
              <button key={t} onClick={() => { setActiveTab(t); setSelectedName(null); }}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${activeTab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>

          {/* sort */}
          <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-1">
            Sort By: <span className="font-medium text-foreground">Expiry Date: Soonest First</span>
            <ChevronDown className="w-3 h-3" />
          </div>

          {/* count */}
          <div className="px-4 pb-2 text-xs text-muted-foreground font-medium">
            All Contracts ({filtered.length})
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto">
            {loading && <LoadingSpinner />}
            {error && <ErrorBanner message={error} onRetry={refetch} />}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <FileText className="w-8 h-8" />
                <p className="text-sm">No contracts found</p>
              </div>
            )}
            {!loading && !error && filtered.map((c) => (
              <ContractCard key={c.name} c={c} selected={selectedName === c.name && !showNewForm}
                onClick={() => { setSelectedName(c.name); setShowNewForm(false); }} />
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-y-auto bg-background">
          {showNewForm ? (
            <NewContractForm onClose={() => setShowNewForm(false)}
              onCreated={(name) => { setShowNewForm(false); setSelectedName(name); refetch(); }} />
          ) : selectedName ? (
            <DetailView contractName={selectedName} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <FileText className="w-10 h-10" />
              <p className="text-sm">Select a contract to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
