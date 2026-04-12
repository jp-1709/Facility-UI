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
  RefreshCw, AlertCircle, Loader2, Activity, Plus as PlusIcon, RotateCcw,
  ArrowRight,
} from "lucide-react";
import { Switch } from "../components/ui/switch";

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

async function frappeUpdate<T>(doctype: string, name: string, payload: Partial<T>): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Frappe-CSRF-Token": getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.exc_type || `PUT ${doctype} failed`);
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

interface VersionEntry {
  name: string;
  owner: string;
  creation: string;
  data: string; /* JSON string */
}

interface ActivityItem {
  id: string;
  user: string;
  action: "updated" | "created" | "worklog" | "comment" | "status";
  timestamp: string;
  changes?: { field: string; from: string; to: string }[];
  message?: string;
  subject?: string;
}

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

function generateID(prefix: string) {
  const now = new Date();
  const date = now.toISOString().split("T")[0].replace(/-/g, "");
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "");
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}-${date}-${time}-${rand}`;
}

function Field({
  label, value, link, badge, badgeClass,
}: { label: string; value?: string | null; link?: boolean; badge?: boolean; badgeClass?: string }) {
  return (
    <div className="flex flex-col py-3 px-4 hover:bg-muted/30 transition-all rounded-xl group border border-transparent hover:border-border/50">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1">{label}</span>
      <div className="flex items-center">
        {badge ? (
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${badgeClass}`}>{value || "—"}</span>
        ) : link ? (
          <span className="text-sm text-primary font-semibold cursor-pointer hover:underline decoration-primary/30 underline-offset-4 flex items-center gap-1.5">
            {value || "—"}
            {value && <Link2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
          </span>
        ) : (
          <span className="text-sm text-foreground font-semibold break-words">{value || "—"}</span>
        )}
      </div>
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

const ACTIVITY_ICON_CFG: Record<ActivityItem["action"], { icon: React.ReactNode; bg: string; text: string }> = {
  updated:  { icon: <RotateCcw className="w-4 h-4" />, bg: "bg-sky-100",    text: "text-sky-600"    },
  created:  { icon: <PlusIcon className="w-4 h-4" />,      bg: "bg-emerald-100",text: "text-emerald-600" },
  worklog:  { icon: <FileText className="w-4 h-4" />,  bg: "bg-violet-100", text: "text-violet-600"  },
  comment:  { icon: <MessageSquare className="w-4 h-4" />, bg: "bg-amber-100", text: "text-amber-600" },
  status:   { icon: <Activity className="w-4 h-4" />,  bg: "bg-blue-100",   text: "text-blue-600"   },
};

function parseVersionData(entry: VersionEntry): ActivityItem {
  let changes: { field: string; from: string; to: string }[] = [];
  let action: ActivityItem["action"] = "updated";
  let message: string | undefined;
  let subject: string | undefined;

  try {
    const data = JSON.parse(entry.data);
    if (data.changed) {
      changes = data.changed.map(([field, from, to]: [string, string, string]) => ({
        field: field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        from: from ?? "---", to: to ?? "---",
      }));
    }
    if (data.doctype === "Comment") { action = "comment"; message = data.content; }
    else if (data.doctype === "Worklog") { action = "worklog"; message = data.content; subject = data.subject; }
    else if (changes.some(c => c.field.toLowerCase().includes("status"))) { action = "status"; }
  } catch { /* ignore parse errors */ }

  return { id: entry.name, user: entry.owner || "System", action, timestamp: entry.creation, changes, message, subject };
}

function ActivitySidebar({ srName, onClose }: { srName: string; onClose: () => void }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!srName) return;
    let cancelled = false;
    setLoading(true);
    frappeGet<VersionEntry>(
      "Version",
      ["name", "owner", "creation", "data"],
      [["ref_doctype", "=", "Service Request"], ["docname", "=", srName]],
      "creation desc",
      100
    )
      .then(rows => {
        if (!cancelled) setItems(rows.map(r => parseVersionData(r)));
      })
      .catch((e: unknown) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [srName]);

  async function addNote() {
    if (!newNote.trim()) return;
    setPosting(true);
    try {
      await frappeCreate("Comment", {
        comment_type: "Comment",
        reference_doctype: "Service Request",
        reference_name: srName,
        content: newNote.trim(),
      });
      setNewNote("");
      // add optimistic entry
      setItems(prev => [{
        id: `local-${Date.now()}`, user: "You", action: "comment",
        timestamp: new Date().toISOString(), message: newNote.trim(),
      }, ...prev]);
    } catch { /* silent */ }
    finally { setPosting(false); }
  }

  return (
    <div className="w-[360px] min-w-[360px] border-l border-border bg-card flex flex-col h-full">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Activity Log</h3>
            <p className="text-[11px] text-muted-foreground">{items.length} events</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* add note */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex gap-2">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Add a note or comment…"
            rows={2}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addNote}
            disabled={!newNote.trim() || posting}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-1 self-end">
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><PlusIcon className="w-3.5 h-3.5" />Add</>}
          </button>
        </div>
      </div>

      {/* timeline */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
        {error && <ErrorBanner message={error} />}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Activity className="w-8 h-8 opacity-40" />
            <p className="text-sm">No activity yet</p>
          </div>
        )}

        {!loading && items.map((item, idx) => {
          const iconCfg = ACTIVITY_ICON_CFG[item.action];
          const isLast = idx === items.length - 1;

          return (
            <div key={item.id} className="flex gap-3 group">
              {/* timeline spine */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-8 h-8 rounded-full ${iconCfg.bg} ${iconCfg.text} flex items-center justify-center mt-0.5`}>
                  {iconCfg.icon}
                </div>
                {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1" style={{ minHeight: "20px" }} />}
              </div>

              {/* content */}
              <div className={`flex-1 min-w-0 ${!isLast ? "pb-4" : "pb-2"}`}>
                {/* meta row */}
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold text-primary">{item.user}</span>
                  <span className="text-xs text-muted-foreground">{item.action}</span>
                  {item.subject && <span className="text-xs font-semibold text-foreground">{item.subject}</span>}
                  <span className="text-[11px] text-muted-foreground ml-auto">{timeAgo(item.timestamp)}</span>
                </div>

                {/* field changes */}
                {item.changes && item.changes.length > 0 && (
                  <div className="bg-muted/40 rounded-lg px-3 py-2 space-y-1.5">
                    {item.changes.map((c, ci) => (
                      <div key={ci} className="flex items-center gap-1.5 text-xs flex-wrap">
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-primary">{c.field}</span>
                        <span className="text-muted-foreground">changed</span>
                        <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">
                          {c.from || "---"}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-mono">
                          {c.to || "---"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* message / worklog */}
                {item.message && (
                  <div className={`text-xs text-foreground rounded-lg px-3 py-2 leading-relaxed mt-1
                    ${item.action === "comment" ? "bg-amber-50 border border-amber-200" : "bg-violet-50 border border-violet-200"}`}>
                    {item.message}
                  </div>
                )}

                {/* timestamp tooltip */}
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(item.timestamp).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
        sr_number: generateID("SR"),
        notification_email: (form.notification_email ? 1 : 0) as 0 | 1,
        notification_sms: (form.notification_sms ? 1 : 0) as 0 | 1,
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
  const [converting, setConverting] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdWorkOrderNumber, setCreatedWorkOrderNumber] = useState("");
  
  const togglePanel = (key: string) =>
    setCollapsedPanels((p) => ({ ...p, [key]: !p[key] }));

  const CollapsibleSection = ({ title, id, children, defaultOpen = true }: { title: string; id: string; children: React.ReactNode; defaultOpen?: boolean }) => {
    const isOpen = collapsedPanels[id] === undefined ? defaultOpen : !collapsedPanels[id];
    return (
      <div className="mb-5 bg-card border border-border/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
        <button 
          onClick={() => togglePanel(id)} 
          className="w-full flex items-center justify-between px-5 py-4 bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <span className="text-sm font-bold text-foreground tracking-tight">{title}</span>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background border border-border shadow-sm">
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`} />
          </div>
        </button>
        <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleConvertToWorkOrder = async () => {
    if (!sr || converting) return;
    
    setConverting(true);
    try {
      // Generate work order number
      const woNumber = generateID("WO");
      
      // Create work order payload from service request data
      const woPayload = {
        wo_number: woNumber,
        wo_title: sr.sr_title,
        wo_type: "Reactive Maintenance",
        wo_source: sr.wo_source,
        status: "Open",
        actual_priority: sr.priority_actual,
        default_priority: sr.priority_default,
        client_code: sr.client_code,
        client_name: sr.client_name,
        contract_code: sr.contract_code,
        contract_group: sr.contract_group,
        property_code: sr.property_code,
        property_name: sr.property_name,
        zone_code: sr.zone_code,
        sub_zone_code: sr.sub_zone_code,
        base_unit_code: sr.base_unit_code,
        asset_code: sr.asset_code,
        service_group: sr.service_group,
        fault_category: sr.fault_category,
        fault_code: sr.fault_code,
        reporting_level: sr.reporting_level,
        business_type: sr.business_type,
        approval_criticality: sr.approval_criticality,
        sr_number: sr.sr_number,
        location_full_path: sr.location_full_path,
        work_done_notes: sr.work_description,
        response_sla_target: sr.response_sla_target,
        resolution_sla_target: sr.resolution_sla_target,
      };
      
      // Create the work order
      const workOrder = await frappeCreate("Work Orders", woPayload);
      
      // Update the service request to mark as converted
      await frappeUpdate("Service Request", srName, {
        converted_to_wo: 1,
        status: "Converted"
      });
      
      // Show success animation
      setCreatedWorkOrderNumber(woNumber);
      setShowSuccessModal(true);
      
      // Close the detail view after animation
      setTimeout(() => {
        setShowSuccessModal(false);
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error("Failed to convert to work order:", error);
      alert(`Failed to convert to work order: ${(error as Error).message}`);
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!sr) return null;

  return (
    <div className="fade-in bg-muted/10 min-h-full pb-10">
      {/* Premium Header Container */}
      <div className="relative px-6 py-8 border-b border-border bg-gradient-to-br from-card to-muted/30 overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${statusBadge[sr.status] || "bg-muted text-muted-foreground"}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${statusDot[sr.status] || "bg-gray-400"}`} />
                {sr.status}
              </span>
              <span className="text-sm font-semibold text-muted-foreground tracking-wide">{sr.sr_number}</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-tight">{sr.sr_title}</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Activity toggle */}
            <button
              onClick={() => setShowActivity(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all
                ${showActivity ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}>
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Activity</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-background border border-border/60 hover:border-border text-sm font-semibold text-foreground hover:bg-muted/50 transition-all rounded-xl shadow-sm">
              <Pencil className="w-4 h-4 text-muted-foreground" /> Edit
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-background border border-border/60 hover:border-border text-sm font-semibold text-foreground hover:bg-muted/50 transition-all rounded-xl shadow-sm">
              <MoreVertical className="w-4 h-4 text-muted-foreground" /> Actions
            </button>
          </div>
        </div>
      </div>

      {/* Top Stat Cards Row */}
      <div className="px-6 py-6 border-b border-border bg-card">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1">Priority</div>
            <div className={`text-sm font-bold ${priorityClass[sr.priority_actual]}`}>{priorityShort[sr.priority_actual] || sr.priority_actual}</div>
          </div>
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1">Response SLA</div>
            <div className={`text-sm font-bold ${slaBadge[sr.response_sla_status || ""] || "text-muted-foreground"}`}>{sr.response_sla_status || "—"}</div>
          </div>
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1">Created</div>
            <div className="text-sm font-bold text-foreground">{sr.raised_date ? timeAgo(sr.raised_date, sr.raised_time) : "—"}</div>
          </div>
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1">Initiator</div>
            <div className="text-sm font-bold text-foreground">{sr.initiator_type || "—"}</div>
          </div>
        </div>
      </div>

      <div className="flex h-full overflow-hidden">
        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-8 max-w-6xl mx-auto">
        <CollapsibleSection title="Request Details" id="details">
          <Field label="Approval Criticality" value={sr.approval_criticality} />
          <Field label="Request Mode" value={sr.wo_source} />
          <Field label="Converted to WO" value={sr.converted_to_wo ? "Yes" : "No"} />
        </CollapsibleSection>

        <CollapsibleSection title="Client & Facility" id="client_location">
          <Field label="Client" value={sr.client_name || sr.client_code} link />
          <Field label="Contract" value={sr.contract_code} link />
          <Field label="Contract Group" value={sr.contract_group} />
          <Field label="Property" value={sr.property_name || sr.property_code} link />
          <Field label="Zone" value={sr.zone_code} />
          <Field label="Sub Zone" value={sr.sub_zone_code} />
          <Field label="Base Unit" value={sr.base_unit_code} />
          <Field label="Reporting Level" value={sr.reporting_level} />
          <Field label="Business Type" value={sr.business_type} />
          {sr.location_full_path && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 px-4 py-3 bg-muted/20 rounded-xl border border-border/50 mt-2 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-0.5">Location Path</p>
                <p className="text-sm font-medium text-foreground">{sr.location_full_path}</p>
              </div>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Asset & Fault Mapping" id="asset">
          <Field label="Asset" value={sr.asset_code} link />
          <Field label="Service Group" value={sr.service_group} />
          <Field label="Fault Category" value={sr.fault_category} />
          <Field label="Fault Code" value={sr.fault_code} />
          <Field label="Priority (Default)" value={sr.priority_default} />
          {sr.priority_change_reason && (
            <Field label="Priority Change Reason" value={sr.priority_change_reason} />
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Reporter & Contact Information" id="reporter">
          <Field label="Reported By" value={sr.reported_by} />
          <Field label="Contact Phone" value={sr.contact_phone} />
          <Field label="Email" value={sr.requester_email} link />
          {sr.special_instructions && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 mt-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-[11px] uppercase tracking-wider text-amber-600/80 font-bold mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Special Instructions
              </p>
              <p className="text-sm text-foreground leading-relaxed font-medium">{sr.special_instructions}</p>
            </div>
          )}
        </CollapsibleSection>

        {sr.work_description && (
          <CollapsibleSection title="Work Description" id="desc">
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 px-4 py-2">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{sr.work_description}</p>
            </div>
          </CollapsibleSection>
        )}

        <CollapsibleSection title="SLA & Scheduling" id="sla" defaultOpen={false}>
          <Field label="Appointment Date" value={sr.appointment_date} />
          <Field label="Preferred Date & Time" value={sr.preferred_datetime} />
          <Field label="Response SLA Target" value={sr.response_sla_target} />
          <Field label="Response SLA Actual" value={sr.response_sla_actual} />
          <Field label="Resolution SLA Target" value={sr.resolution_sla_target} />
          <Field label="Resolution SLA Actual" value={sr.resolution_sla_actual} />
        </CollapsibleSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Notifications Panel */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Notification Settings
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Email Notifications</span>
                </div>
                <Switch checked={!!sr.notification_email} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">SMS Notifications</span>
                </div>
                <Switch checked={!!sr.notification_sms} />
              </div>
            </div>
          </div>

          {/* Internal Notes Panel */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-5 flex flex-col">
            <h3 className="text-sm font-bold text-foreground mb-3">Internal Notes</h3>
            <textarea
              className="w-full flex-1 px-4 py-3 border border-border/50 rounded-xl text-sm bg-muted/10 hover:bg-muted/20 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors resize-none"
              placeholder="Add internal notes for your team here..."
            />
          </div>
        </div>

        {(sr.customer_rating || sr.remarks) && (
          <CollapsibleSection title="Closure & Feedback" id="closure">
            <Field label="Customer Rating" value={sr.customer_rating} />
            <Field label="Remarks" value={sr.remarks} />
          </CollapsibleSection>
        )}

          {!sr.converted_to_wo && (
            <div className="mt-8 mb-4">
              <button 
                onClick={handleConvertToWorkOrder}
                disabled={converting}
                className="w-full relative group overflow-hidden py-4 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary to-primary/80" />
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 flex items-center justify-center gap-2 text-primary-foreground">
                  {converting ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting...</> : <>Convert to Work Order <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" /></>}
                </span>
              </button>
            </div>
          )}
          </div>
        </div>

        {/* ── ACTIVITY SIDEBAR ── */}
        {showActivity && (
          <ActivitySidebar srName={srName} onClose={() => setShowActivity(false)} />
        )}
      </div>

      {/* SUCCESS ANIMATION MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative">
            {/* Confetti effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="confetti-container">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="confetti-piece absolute w-2 h-2 animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
                      animationDelay: `${Math.random() * 0.5}s`,
                      animationDuration: `${1 + Math.random() * 0.5}s`
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Success card */}
            <div className="relative bg-white rounded-3xl p-12 shadow-2xl animate-scaleIn mx-4 max-w-sm w-full">
              {/* Animated checkmark */}
              <div className="flex justify-center mb-6">
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-pulse">
                  <svg
                    className="w-10 h-10 text-white animate-checkmark"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              
              {/* Success text */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 animate-slideUp">
                  Work Order Created!
                </h2>
                <p className="text-gray-600 mb-4 animate-slideUp" style={{ animationDelay: '0.1s' }}>
                  Your service request has been successfully converted
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full font-semibold animate-slideUp" style={{ animationDelay: '0.2s' }}>
                  <span className="text-xs">WO#</span>
                  <span className="font-mono">{createdWorkOrderNumber}</span>
                </div>
              </div>
              
              {/* Loading dots */}
              <div className="flex justify-center gap-2 mt-6 animate-slideUp" style={{ animationDelay: '0.3s' }}>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
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

/* ═══════════════════════════════════════════
   CUSTOM ANIMATIONS
═══════════════════════════════════════════ */

// Add these styles to your global CSS or in a style tag
const customStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes checkmark {
  0% {
    stroke-dasharray: 0 100;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 100 100;
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dasharray: 100 100;
    stroke-dashoffset: 0;
  }
}

@keyframes confettiFall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.animate-scaleIn {
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.animate-slideUp {
  animation: slideUp 0.5s ease-out forwards;
  opacity: 0;
}

.animate-checkmark {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: checkmark 0.6s ease-in-out 0.3s forwards;
}

.confetti-piece {
  animation: confettiFall 2s ease-in forwards;
}

.confetti-container {
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  pointer-events: none;
}
`;

// Inject styles into the document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = customStyles;
  document.head.appendChild(styleSheet);
}