/**
 * WorkOrders.tsx  ·  Facility-UI
 * 100% dynamic from Frappe REST API — schema: work_orders.json
 * NEW: Print modal (section-select → styled print window) + Activity sidebar
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, Filter, MapPin, ChevronDown, ChevronUp, ChevronRight,
  MoreVertical, Pencil, X, Loader2, AlertCircle, RefreshCw,
  Camera, User, Clock, Shield, FileText, CheckCircle2,
  Link2, MessageSquare, Lock, RotateCcw, Zap, Star, ChevronLeft,
  Printer, Activity, ArrowRight, Edit3, MessageCircle, Package,
  Tag, Check,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   FRAPPE API HELPERS
═══════════════════════════════════════════════════════ */
const FRAPPE_BASE = "";
type FF = [string, string, string | number][];

async function frappeGet<T>(doctype: string, fields: string[], filters: FF = [], orderBy = "", limit = 500): Promise<T[]> {
  const p = new URLSearchParams({ fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit_page_length: String(limit), ...(orderBy ? { order_by: orderBy } : {}) });
  const r = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}?${p}`, { credentials: "include" });
  if (!r.ok) throw new Error(`GET ${doctype}: ${r.statusText}`);
  return (await r.json()).data as T[];
}
async function frappeGetDoc<T>(doctype: string, name: string): Promise<T> {
  const r = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { credentials: "include" });
  if (!r.ok) throw new Error(`GET ${doctype}/${name}: ${r.statusText}`);
  return (await r.json()).data as T;
}
async function frappeCreate<T>(doctype: string, payload: Partial<T>): Promise<T> {
  const r = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf() }, body: JSON.stringify(payload) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as { exc_type?: string }).exc_type || "Save failed"); }
  return (await r.json()).data as T;
}
async function frappeUpdate<T>(doctype: string, name: string, payload: Partial<T>): Promise<T> {
  const r = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf() }, body: JSON.stringify(payload) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as { exc_type?: string }).exc_type || "Update failed"); }
  return (await r.json()).data as T;
}
function csrf() { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
interface WOListItem {
  name: string; wo_number?: string; wo_title: string;
  wo_type?: string; wo_sub_type?: string; wo_source?: string;
  status: string; actual_priority?: string; default_priority?: string;
  client_code?: string; client_name?: string;
  contract_code?: string; contract_group?: string;
  property_code?: string; property_name?: string;
  zone_code?: string; sub_zone_code?: string; base_unit_code?: string;
  asset_code?: string; asset_name?: string;
  asset_category?: string; asset_master_category?: string;
  service_group?: string; fault_category?: string; fault_code?: string;
  assigned_to?: string; assigned_technician?: string;
  secondary_tech?: string; secondary_technician_name?: string;
  assigned_by?: string; assignment_mode?: string;
  schedule_start_date?: string; schedule_start_time?: string;
  schedule_end_time?: string; planned_duration_min?: number;
  actual_start?: string; actual_end?: string; labor_hours?: number;
  response_sla_target?: string; response_sla_actual?: string; response_sla_breach?: 0 | 1;
  resolution_sla_target?: string; resolution_sla_actual?: string; resolution_sla_breach?: 0 | 1;
  extension_date?: string; extension_reason?: string;
  spares_amount?: number; service_amount?: number; total_wo_cost?: number;
  material_request_status?: string;
  work_done_notes?: string; customer_rating?: string;
  before_photo?: string; after_photo?: string;
  sr_number?: string; parent_wo_number?: string;
  location_full_path?: string; business_type?: string;
  reporting_level?: string; approval_criticality?: string;
  closed_by?: string; final_approver?: string; amended_from?: string;
  creation?: string; modified?: string;
}

interface VersionEntry {
  name: string; owner: string; creation: string;
  data: string; /* JSON string */
}

/* ═══════════════════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════════════════ */
function useList<T>(doctype: string, fields: string[], filters: FF, deps: unknown[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await frappeGet<T>(doctype, fields, filters, "schedule_start_date desc")); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

function useDoc<T>(doctype: string, name: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    setLoading(true); setError(null);
    frappeGetDoc<T>(doctype, name)
      .then(d => { if (!cancelled) setData(d); })
      .catch((e: unknown) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [doctype, name]);
  return { data, loading, error };
}

function useSimpleList<T>(doctype: string, fields: string[], filters: FF, skip = false) {
  const [data, setData] = useState<T[]>([]);
  const fetch_ = useCallback(async () => {
    if (skip) return;
    try { setData(await frappeGet<T>(doctype, fields, filters)); }
    catch { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctype, skip]);
  useEffect(() => { fetch_(); }, [fetch_]);
  return data;
}

/* ═══════════════════════════════════════════════════════
   COLOUR / CONFIG MAPS
═══════════════════════════════════════════════════════ */
const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  Draft:              { bg: "bg-gray-100",    text: "text-gray-600",           dot: "bg-gray-400",    icon: <Lock className="w-3.5 h-3.5" /> },
  Open:               { bg: "bg-sky-100",     text: "text-sky-700",            dot: "bg-sky-500",     icon: <Lock className="w-3.5 h-3.5" /> },
  Assigned:           { bg: "bg-blue-100",    text: "text-blue-700",           dot: "bg-blue-500",    icon: <User className="w-3.5 h-3.5" /> },
  "In Progress":      { bg: "bg-primary/10",  text: "text-primary",            dot: "bg-primary",     icon: <RotateCcw className="w-3.5 h-3.5" /> },
  "On Hold":          { bg: "bg-amber-100",   text: "text-amber-700",          dot: "bg-amber-500",   icon: <Clock className="w-3.5 h-3.5" /> },
  "Pending Parts":    { bg: "bg-orange-100",  text: "text-orange-700",         dot: "bg-orange-500",  icon: <Clock className="w-3.5 h-3.5" /> },
  "Not Dispatched":   { bg: "bg-gray-100",    text: "text-gray-600",           dot: "bg-gray-400",    icon: <Clock className="w-3.5 h-3.5" /> },
  "Pending Approval": { bg: "bg-violet-100",  text: "text-violet-700",         dot: "bg-violet-500",  icon: <Shield className="w-3.5 h-3.5" /> },
  Completed:          { bg: "bg-emerald-100", text: "text-emerald-700",        dot: "bg-emerald-500", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  Closed:             { bg: "bg-muted",       text: "text-muted-foreground",   dot: "bg-gray-400",    icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  Cancelled:          { bg: "bg-red-100",     text: "text-red-600",            dot: "bg-red-500",     icon: <X className="w-3.5 h-3.5" /> },
};

const PRIORITY_CFG: Record<string, { bg: string; text: string; label: string }> = {
  "P1 - Critical": { bg: "bg-red-500",    text: "text-white", label: "Critical" },
  "P2 - High":     { bg: "bg-orange-500", text: "text-white", label: "High" },
  "P3 - Medium":   { bg: "bg-amber-400",  text: "text-black", label: "Medium" },
  "P4 - Low":      { bg: "bg-emerald-500",text: "text-white", label: "Low" },
};

const WO_TYPE_ICONS: Record<string, string> = {
  "Reactive Maintenance": "🔧", "Planned Preventive": "📋", "Project": "🏗️", "Inspection": "🔍", "Callout": "📞",
};

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateTime(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function timeAgo(d?: string): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}
function isOverdue(d?: string) { return !!d && new Date(d) < new Date(); }

/* ═══════════════════════════════════════════════════════
   MICRO HELPERS
═══════════════════════════════════════════════════════ */
function Spinner() { return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>; }

function ErrBanner({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-2 m-3 px-3 py-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">{msg}</span>
      {onRetry && <button onClick={onRetry} className="text-xs underline text-destructive">Retry</button>}
    </div>
  );
}

function PriBadge({ pri }: { pri?: string }) {
  if (!pri) return null;
  const c = PRIORITY_CFG[pri]; if (!c) return null;
  return <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
}

function StatBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG["Draft"];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{status}
    </span>
  );
}

function Avatar({ name, size = "sm" }: { name?: string; size?: "sm" | "md" | "lg" }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-sky-500", "bg-orange-500", "bg-teal-500"];
  const c = colors[(initials.charCodeAt(0) || 0) % colors.length];
  const sz = size === "lg" ? "w-10 h-10 text-sm" : size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]";
  return <div className={`${sz} rounded-full ${c} flex items-center justify-center text-white font-bold shrink-0`}>{initials}</div>;
}

/* ═══════════════════════════════════════════════════════
   PRINT LOGIC — opens styled window + window.print()
═══════════════════════════════════════════════════════ */
const PRINT_SECTIONS = [
  { id: "details",         label: "WorkOrder Details",     icon: <FileText className="w-4 h-4" /> },
  { id: "status_history",  label: "Status History",        icon: <Activity className="w-4 h-4" /> },
  { id: "task_details",    label: "Task Details",          icon: <CheckCircle2 className="w-4 h-4" /> },
  { id: "before_photo",    label: "Before Pictures",       icon: <Camera className="w-4 h-4" /> },
  { id: "after_photo",     label: "After Pictures",        icon: <Camera className="w-4 h-4" /> },
  { id: "cust_signature",  label: "Customer Signature",    icon: <Edit3 className="w-4 h-4" /> },
  { id: "tech_signature",  label: "Technician Signature",  icon: <Edit3 className="w-4 h-4" /> },
  { id: "cust_feedback",   label: "Customer Feedback",     icon: <MessageCircle className="w-4 h-4" /> },
] as const;
type PrintSectionId = typeof PRINT_SECTIONS[number]["id"];

function buildPrintHTML(wo: WOListItem, sections: Set<PrintSectionId>): string {
  const row = (label: string, val: string, label2 = "", val2 = "") =>
    `<tr><td class="label">${label}</td><td class="val">${val || "—"}</td>${label2 ? `<td class="label">${label2}</td><td class="val">${val2 || "—"}</td>` : '<td colspan="2"></td>'}</tr>`;

  const slaBreachBadge = (breached?: 0 | 1) =>
    breached ? '<span class="badge-red">Breached</span>' : '<span class="badge-green">Met</span>';

  const ratingStars = (rating?: string) => {
    const n = rating ? parseInt(rating[0]) : 0;
    return Array.from({ length: 5 }, (_, i) => `<span style="color:${i < n ? "#f59e0b" : "#d1d5db"}">★</span>`).join("");
  };

  return `<!DOCTYPE html><html>
<head><meta charset="UTF-8"><title>WO Report – ${wo.wo_number || wo.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1f2937; background: #fff; padding: 20mm 15mm; }
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6mm; }
  .company-logo { font-size: 22px; font-weight: 900; color: #1d4ed8; letter-spacing: -1px; }
  .company-sub { font-size: 9px; color: #6b7280; }
  .header-right { text-align: right; font-size: 9px; color: #6b7280; }
  .report-title { background: linear-gradient(135deg, #1d4ed8, #3b82f6); color: white; padding: 8px 14px; border-radius: 6px; margin-bottom: 5mm; }
  .report-title h1 { font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
  .report-title p { font-size: 10px; opacity: 0.85; margin-top: 2px; }
  .section { margin-bottom: 6mm; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #1d4ed8; border-bottom: 2px solid #3b82f6; padding-bottom: 3px; margin-bottom: 3mm; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
  td.label { background: #f8faff; font-weight: 600; width: 18%; color: #374151; white-space: nowrap; }
  td.val { width: 32%; }
  .status-bar { display: flex; gap: 6px; margin-bottom: 4mm; flex-wrap: wrap; }
  .badge { display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-gray { background: #f3f4f6; color: #4b5563; }
  .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .photo-box { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
  .photo-box img { width: 100%; height: 160px; object-fit: cover; display: block; }
  .photo-box .photo-label { padding: 5px 8px; background: #f8faff; font-size: 9px; color: #6b7280; font-weight: 600; }
  .photo-placeholder { height: 160px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 10px; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; }
  .sig-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 6mm; }
  .sig-line { border-bottom: 1px solid #374151; height: 40px; margin-top: 5mm; }
  .sig-label { font-size: 9px; color: #6b7280; margin-top: 3px; }
  .feedback-stars { font-size: 22px; line-height: 1; }
  .feedback-comment { border: 1px solid #e5e7eb; border-radius: 4px; padding: 6px; min-height: 50px; margin-top: 4px; font-style: italic; color: #6b7280; }
  .status-history-table td.label { width: 15%; }
  .timeline-item { display: flex; gap: 8px; margin-bottom: 5mm; }
  .tl-dot { width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; margin-top: 4px; flex-shrink: 0; }
  .tl-line { width: 1px; background: #e5e7eb; margin: 12px auto 0; flex-shrink: 0; }
  .tl-left { display: flex; flex-direction: column; align-items: center; width: 12px; }
  .note-box { border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; background: #f9fafb; }
  .footer-bar { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
  .sla-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .sla-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 10px; }
  .sla-card h4 { font-size: 10px; font-weight: 700; color: #374151; margin-bottom: 4px; }
  .cost-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 6px; }
  .cost-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 10px; text-align: center; }
  .cost-card .cost-label { font-size: 9px; color: #6b7280; }
  .cost-card .cost-val { font-size: 14px; font-weight: 700; color: #1d4ed8; }
  @media print { body { padding: 10mm; } .no-print { display: none; } }
</style></head><body>

<!-- PAGE HEADER -->
<div class="page-header">
  <div>
    <div class="company-logo">CAFM</div>
    <div class="company-sub">Facilities Management Division</div>
  </div>
  <div class="header-right">
    <div><strong>Service Report</strong></div>
    <div>Reactive / Corrective Maintenance</div>
    <div style="margin-top:3px">Generated: ${new Date().toLocaleString("en-GB")}</div>
  </div>
</div>

${sections.has("details") ? `
<!-- ── WO DETAILS ── -->
<div class="section">
  <div class="report-title">
    <h1>${wo.wo_title || "Work Order"}</h1>
    <p>WO #${wo.wo_number || wo.name} &nbsp;·&nbsp; ${wo.wo_type || "—"} &nbsp;·&nbsp; ${wo.wo_source || "—"}</p>
  </div>

  <div class="status-bar">
    <span class="badge badge-blue">Status: ${wo.status}</span>
    ${wo.actual_priority ? `<span class="badge badge-${wo.actual_priority.includes("Critical") ? "red" : wo.actual_priority.includes("High") ? "amber" : "gray"}">${wo.actual_priority}</span>` : ""}
    ${wo.sr_number ? `<span class="badge badge-gray">SR: ${wo.sr_number}</span>` : ""}
    ${wo.wo_sub_type ? `<span class="badge badge-gray">${wo.wo_sub_type}</span>` : ""}
  </div>

  <table>
    ${row("Work Order", wo.wo_number || wo.name, "Status", wo.status)}
    ${row("Reported Date", formatDateTime(wo.creation), "Scheduled Date", formatDateTime(wo.schedule_start_date + (wo.schedule_start_time ? " " + wo.schedule_start_time : "")))}
    ${row("Work Start Date", formatDateTime(wo.actual_start), "Completion Date", formatDateTime(wo.actual_end))}
    ${row("Reported By", wo.client_name || wo.client_code, "Call Booked By", wo.assigned_by || "—")}
    ${row("Asset Code", wo.asset_code, "Priority", wo.actual_priority)}
    ${row("Master Community", wo.property_name || wo.property_code, "Asset", wo.asset_name)}
    ${row("Sub Community", wo.sub_zone_code, "Department", wo.asset_master_category)}
    ${row("Zone", wo.zone_code, "Assigned To", wo.assigned_technician || wo.assigned_to)}
    ${row("Sub Zone", wo.sub_zone_code, "Staff Name", wo.secondary_technician_name)}
    ${row("Base Unit", wo.base_unit_code, "Contract", wo.contract_code)}
    ${row("Work Description", wo.work_done_notes || "—", "Service Group", wo.service_group)}
    ${row("Fault Category", wo.fault_category, "Fault Code", wo.fault_code)}
    ${row("Expected Response Time", wo.response_sla_target ? formatDateTime(wo.response_sla_target) : "—", "Actual Response Time", wo.response_sla_actual ? formatDateTime(wo.response_sla_actual) : "—")}
    ${row("Expected Resolution Time", wo.resolution_sla_target ? formatDateTime(wo.resolution_sla_target) : "—", "Actual Resolution Time", wo.resolution_sla_actual ? formatDateTime(wo.resolution_sla_actual) : "—")}
    ${row("Planned Duration (min)", wo.planned_duration_min ? String(wo.planned_duration_min) : "—", "Labour Hours", wo.labor_hours ? String(wo.labor_hours) : "—")}
    ${row("Approval Criticality", wo.approval_criticality, "Assignment Mode", wo.assignment_mode)}
    ${wo.extension_date ? row("Extension Date", formatDate(wo.extension_date), "Extension Reason", wo.extension_reason) : ""}
  </table>

  ${(wo.spares_amount || wo.service_amount || wo.total_wo_cost) ? `
  <div style="margin-top:6px">
    <div class="cost-grid">
      <div class="cost-card"><div class="cost-label">Spares (OMR)</div><div class="cost-val">${wo.spares_amount ? wo.spares_amount.toLocaleString() : "—"}</div></div>
      <div class="cost-card"><div class="cost-label">Service (OMR)</div><div class="cost-val">${wo.service_amount ? wo.service_amount.toLocaleString() : "—"}</div></div>
      <div class="cost-card"><div class="cost-label">Total Cost (OMR)</div><div class="cost-val">${wo.total_wo_cost ? wo.total_wo_cost.toLocaleString() : "—"}</div></div>
    </div>
  </div>` : ""}

  ${(wo.response_sla_target || wo.resolution_sla_target) ? `
  <div class="sla-grid" style="margin-top:6px">
    <div class="sla-card"><h4>Response SLA</h4>
      <div>Target: ${formatDateTime(wo.response_sla_target)}</div>
      <div>Actual: ${formatDateTime(wo.response_sla_actual)}</div>
      <div style="margin-top:4px">${slaBreachBadge(wo.response_sla_breach)}</div>
    </div>
    <div class="sla-card"><h4>Resolution SLA</h4>
      <div>Target: ${formatDateTime(wo.resolution_sla_target)}</div>
      <div>Actual: ${formatDateTime(wo.resolution_sla_actual)}</div>
      <div style="margin-top:4px">${slaBreachBadge(wo.resolution_sla_breach)}</div>
    </div>
  </div>` : ""}
</div>` : ""}

${sections.has("status_history") ? `
<!-- ── STATUS HISTORY ── -->
<div class="section">
  <div class="section-title">Status History</div>
  <table class="status-history-table">
    <tr style="background:#f8faff">
      <td class="label" style="font-weight:700">Status</td>
      <td class="label" style="font-weight:700">Updated At</td>
      <td class="label" style="font-weight:700">Updated By</td>
      <td class="label" style="font-weight:700">Notes</td>
    </tr>
    <tr><td>${wo.status}</td><td>${formatDateTime(wo.modified)}</td><td>${wo.closed_by || "System"}</td><td>—</td></tr>
    ${wo.actual_start ? `<tr><td>In Progress</td><td>${formatDateTime(wo.actual_start)}</td><td>${wo.assigned_technician || "—"}</td><td>Work started</td></tr>` : ""}
    ${wo.creation ? `<tr><td>Open</td><td>${formatDateTime(wo.creation)}</td><td>${wo.assigned_by || wo.client_name || "—"}</td><td>WO created</td></tr>` : ""}
  </table>
</div>` : ""}

${sections.has("task_details") ? `
<!-- ── TASK DETAILS ── -->
<div class="section">
  <div class="section-title">Task Details</div>
  <table>
    ${row("WO Type", wo.wo_type, "WO Sub Type", wo.wo_sub_type)}
    ${row("WO Source", wo.wo_source, "Parent WO", wo.parent_wo_number)}
    ${row("Reporting Level", wo.reporting_level, "Business Type", wo.business_type)}
    ${row("Location Path", wo.location_full_path || `${wo.property_name || "—"} › ${wo.zone_code || "—"} › ${wo.sub_zone_code || "—"}`, "Material Status", wo.material_request_status)}
    ${row("Final Approver", wo.final_approver, "Amended From", wo.amended_from)}
  </table>
  ${wo.work_done_notes ? `<div class="note-box" style="margin-top:6px"><strong>Work Done Notes:</strong><br/>${wo.work_done_notes}</div>` : ""}
</div>` : ""}

${sections.has("before_photo") ? `
<!-- ── BEFORE PHOTO ── -->
<div class="section">
  <div class="section-title">Before Photo</div>
  <div class="photo-grid">
    <div class="photo-box">
      ${wo.before_photo ? `<img src="${wo.before_photo}" alt="Before"/>` : '<div class="photo-placeholder">No photo attached</div>'}
      <div class="photo-label">Before Work</div>
    </div>
  </div>
</div>` : ""}

${sections.has("after_photo") ? `
<!-- ── AFTER PHOTO ── -->
<div class="section">
  <div class="section-title">After Photo</div>
  <div class="photo-grid">
    <div class="photo-box">
      ${wo.after_photo ? `<img src="${wo.after_photo}" alt="After"/>` : '<div class="photo-placeholder">No photo attached</div>'}
      <div class="photo-label">After Work Completed</div>
    </div>
  </div>
</div>` : ""}

${sections.has("cust_signature") || sections.has("tech_signature") ? `
<!-- ── SIGNATURES ── -->
<div class="section">
  <div class="section-title">Signatures</div>
  <div class="sig-grid">
    ${sections.has("cust_signature") ? `
    <div class="sig-box">
      <div style="font-weight:700;font-size:11px">Customer Signature</div>
      <div style="font-size:10px;color:#6b7280;margin-top:2px">Name: ${wo.client_name || "_______________"}</div>
      <div class="sig-line"></div>
      <div class="sig-label">Signature &amp; Date</div>
    </div>` : ""}
    ${sections.has("tech_signature") ? `
    <div class="sig-box">
      <div style="font-weight:700;font-size:11px">Technician Signature</div>
      <div style="font-size:10px;color:#6b7280;margin-top:2px">Name: ${wo.assigned_technician || "_______________"}</div>
      <div class="sig-line"></div>
      <div class="sig-label">Signature &amp; Date</div>
    </div>` : ""}
  </div>
</div>` : ""}

${sections.has("cust_feedback") ? `
<!-- ── CUSTOMER FEEDBACK ── -->
<div class="section">
  <div class="section-title">Customer Feedback</div>
  <div class="feedback-stars">${ratingStars(wo.customer_rating)}</div>
  ${wo.customer_rating ? `<div style="font-size:10px;color:#6b7280;margin-top:3px">${wo.customer_rating}</div>` : ""}
  <div class="feedback-comment">${wo.work_done_notes || "No feedback provided."}</div>
</div>` : ""}

<!-- FOOTER -->
<div class="footer-bar">
  <span>* This is a system generated service report and does not require signature.</span>
  <span>Printed: ${new Date().toLocaleDateString("en-GB")} &nbsp;&nbsp; Page 1 of 1</span>
</div>

</body></html>`;
}

/* ═══════════════════════════════════════════════════════
   PRINT OPTIONS MODAL
═══════════════════════════════════════════════════════ */
function PrintModal({ wo, onClose }: { wo: WOListItem; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<PrintSectionId>>(
    () => new Set(PRINT_SECTIONS.map(s => s.id))
  );
  const [previewing, setPreviewing] = useState(false);

  function toggle(id: PrintSectionId) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function selectAll() { setSelected(new Set(PRINT_SECTIONS.map(s => s.id))); }
  function clearAll() { setSelected(new Set()); }

  function doPrint() {
    const html = buildPrintHTML(wo, selected);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border fade-in overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5" />
            <div>
              <h2 className="text-base font-bold">Print Work Order</h2>
              <p className="text-xs opacity-75">Select sections to include</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WO info strip */}
        <div className="px-6 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">#{wo.wo_number || wo.name}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[260px]">{wo.wo_title}</p>
          </div>
          <StatBadge status={wo.status} />
        </div>

        {/* section checkboxes */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sections</p>
            <div className="flex gap-3">
              <button onClick={selectAll} className="text-xs text-primary font-semibold hover:underline">Select All</button>
              <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">Clear</button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {PRINT_SECTIONS.map(sec => {
              const checked = selected.has(sec.id);
              return (
                <button key={sec.id} onClick={() => toggle(sec.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left w-full
                    ${checked ? "border-primary/30 bg-primary/5" : "border-border bg-background hover:bg-muted/40"}`}>
                  {/* custom checkbox */}
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all
                    ${checked ? "bg-primary border-primary" : "border-border"}`}>
                    {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className={`${checked ? "text-primary" : "text-muted-foreground"}`}>{sec.icon}</span>
                  <span className={`text-sm font-medium ${checked ? "text-foreground" : "text-muted-foreground"}`}>{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={doPrint} disabled={selected.size === 0}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            <Printer className="w-4 h-4" /> Print ({selected.size} section{selected.size !== 1 ? "s" : ""})
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ACTIVITY SIDEBAR
═══════════════════════════════════════════════════════ */
interface ActivityItem {
  id: string;
  user: string;
  action: "updated" | "created" | "worklog" | "comment" | "status";
  timestamp: string;
  changes?: { field: string; from: string; to: string }[];
  message?: string;
  subject?: string;
}

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

const ACTIVITY_ICON_CFG: Record<ActivityItem["action"], { icon: React.ReactNode; bg: string; text: string }> = {
  updated:  { icon: <RotateCcw className="w-4 h-4" />, bg: "bg-sky-100",    text: "text-sky-600"    },
  created:  { icon: <Plus className="w-4 h-4" />,      bg: "bg-emerald-100",text: "text-emerald-600" },
  worklog:  { icon: <FileText className="w-4 h-4" />,  bg: "bg-violet-100", text: "text-violet-600"  },
  comment:  { icon: <MessageSquare className="w-4 h-4" />, bg: "bg-amber-100", text: "text-amber-600" },
  status:   { icon: <Activity className="w-4 h-4" />,  bg: "bg-blue-100",   text: "text-blue-600"   },
};

function ActivitySidebar({ woName, onClose }: { woName: string; onClose: () => void }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!woName) return;
    let cancelled = false;
    setLoading(true);
    frappeGet<VersionEntry>(
      "Version",
      ["name", "owner", "creation", "data"],
      [["ref_doctype", "=", "Work Orders"], ["docname", "=", woName]],
      "creation desc",
      100
    )
      .then(rows => {
        if (!cancelled) setItems(rows.map(r => parseVersionData(r)));
      })
      .catch((e: unknown) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [woName]);

  async function addNote() {
    if (!newNote.trim()) return;
    setPosting(true);
    try {
      await frappeCreate("Comment", {
        comment_type: "Comment",
        reference_doctype: "Work Orders",
        reference_name: woName,
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
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5" />Add</>}
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
        {error && <ErrBanner msg={error} />}
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
                <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(item.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WO CARD (left list)
═══════════════════════════════════════════════════════ */
function WOCard({ wo, selected, onClick }: { wo: WOListItem; selected: boolean; onClick: () => void }) {
  const overdue = isOverdue(wo.schedule_start_date) && wo.status !== "Completed" && wo.status !== "Closed";
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-border flex gap-3 transition-colors
        ${selected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40"}`}>
      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0 text-xl">
        {WO_TYPE_ICONS[wo.wo_type || ""] || "📋"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{wo.wo_title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          Requested by {wo.assigned_technician || wo.assigned_to || "—"}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${STATUS_CFG[wo.status]?.text || "text-muted-foreground"}`}>
            {STATUS_CFG[wo.status]?.icon}<span>{wo.status}</span><ChevronDown className="w-3 h-3" />
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {wo.assigned_to && <Avatar name={wo.assigned_technician || wo.assigned_to} />}
        <span className="text-[11px] text-muted-foreground font-mono">#{wo.wo_number || wo.name}</span>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {overdue && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">Overdue</span>}
          <PriBadge pri={wo.actual_priority} />
        </div>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   STATUS BAR
═══════════════════════════════════════════════════════ */
function StatusBar({ current, onChange }: { current: string; onChange: (s: string) => void }) {
  const steps = ["Open", "On Hold", "In Progress", "Completed"];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map(s => {
        const c = STATUS_CFG[s]; const active = current === s;
        return (
          <button key={s} onClick={() => onChange(s)}
            className={`flex flex-col items-center gap-1 px-5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all
              ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
            <span className="text-base">{c?.icon}</span>{s}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DETAIL VIEW  (now has Print + Activity buttons)
═══════════════════════════════════════════════════════ */
function DetailView({ woName, onStatusChange }: { woName: string; onStatusChange: () => void }) {
  const { data: wo, loading, error } = useDoc<WOListItem>("Work Orders", woName);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setCollapsed(p => ({ ...p, [k]: !p[k] }));

  const handleStatusChange = async (newStatus: string) => {
    if (!wo) return;
    setUpdatingStatus(true);
    try { await frappeUpdate("Work Orders", woName, { status: newStatus }); onStatusChange(); }
    catch { /* silent */ }
    finally { setUpdatingStatus(false); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrBanner msg={error} />;
  if (!wo) return null;

  const Sec = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div className="border-b border-border">
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between py-3 hover:bg-muted/30 transition-colors -mx-1 px-1 rounded">
        <span className="text-sm font-bold text-foreground">{title}</span>
        {collapsed[id] ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {!collapsed[id] && <div className="pb-4 fade-in">{children}</div>}
    </div>
  );

  const Row = ({ label, val, link, warn }: { label: string; val?: string | null; link?: boolean; warn?: boolean }) => (
    <div className="flex items-start justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground font-medium w-40 shrink-0">{label}</span>
      {link
        ? <span className="text-sm text-primary font-medium cursor-pointer hover:underline text-right">{val || "—"}</span>
        : <span className={`text-sm font-medium text-right ${warn ? "text-red-500 font-semibold" : "text-foreground"}`}>{val || "—"}</span>}
    </div>
  );

  const slaResBreached = !!wo.resolution_sla_breach;
  const overdue = wo.resolution_sla_target && new Date(wo.resolution_sla_target) < new Date() && wo.status !== "Completed" && wo.status !== "Closed";

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-y-auto">
        {/* header */}
        <div className="px-6 pt-5 pb-4 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-mono font-semibold text-muted-foreground">#{wo.wo_number || wo.name}</span>
                <StatBadge status={wo.status} />
                <PriBadge pri={wo.actual_priority} />
              </div>
              <h2 className="text-xl font-bold text-foreground leading-tight">{wo.wo_title}</h2>
            </div>

            {/* action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Activity toggle */}
              <button
                onClick={() => setShowActivity(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all
                  ${showActivity ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}>
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Activity</span>
              </button>

              {/* Print */}
              <button
                onClick={() => setShowPrint(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-primary hover:bg-primary/5 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button className="p-1.5 rounded-lg hover:bg-muted">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* status bar */}
          <div className="mb-2">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Status <span className="italic">(Click to Update)</span></p>
            {updatingStatus
              ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Updating…</div>
              : <StatusBar current={wo.status} onChange={handleStatusChange} />}
          </div>
          <button className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1">
            <Link2 className="w-3 h-3" /> Copy Link
          </button>
        </div>

        {/* content */}
        <div className="px-6 py-5">
          {/* Due Date + Assigned */}
          <div className="grid grid-cols-2 gap-6 pb-5 border-b border-border mb-2">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Due Date</p>
              <p className={`text-sm font-semibold ${overdue ? "text-red-500" : "text-foreground"}`}>
                {wo.schedule_start_date ? formatDate(wo.schedule_start_date) : "—"}
                {wo.schedule_start_time ? ` by ${wo.schedule_start_time}` : ""}
              </p>
              {wo.wo_type === "Planned Preventive" && <p className="text-xs text-muted-foreground mt-1">Repeats monthly</p>}
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Assigned To</p>
              <div className="flex flex-col gap-2">
                {wo.assigned_technician
                  ? <div className="flex items-center gap-2"><Avatar name={wo.assigned_technician} size="md" /><span className="text-sm font-medium text-foreground">{wo.assigned_technician}</span></div>
                  : <p className="text-sm text-muted-foreground">Unassigned</p>}
                {wo.secondary_technician_name && (
                  <div className="flex items-center gap-2"><Avatar name={wo.secondary_technician_name} size="md" /><span className="text-sm font-medium text-foreground">{wo.secondary_technician_name}</span></div>
                )}
              </div>
            </div>
          </div>

          <Sec id="desc" title="Description">
            <p className="text-sm text-foreground leading-relaxed">{wo.work_done_notes || "No description provided."}</p>
          </Sec>

          <Sec id="location" title="Location & Asset">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Location</p>
                <div className="flex items-center gap-2 text-sm text-foreground mb-1">
                  <MapPin className="w-4 h-4 text-muted-foreground" /><span>{wo.property_name || wo.property_code || "—"}</span>
                </div>
                {wo.location_full_path && <p className="text-xs text-muted-foreground pl-6">{wo.location_full_path}</p>}
                {[["Zone", wo.zone_code], ["Sub Zone", wo.sub_zone_code], ["Base Unit", wo.base_unit_code]].map(([l, v]) =>
                  v ? <div key={l} className="flex gap-2 text-xs text-muted-foreground mt-0.5 pl-6"><span className="font-medium">{l}:</span><span>{v}</span></div> : null
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Asset</p>
                {wo.asset_name
                  ? <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm">🔧</div><span className="text-sm font-medium text-foreground">{wo.asset_name}</span></div>
                  : <p className="text-sm text-muted-foreground">—</p>}
                {wo.asset_category && <p className="text-xs text-muted-foreground">{wo.asset_category}</p>}
                {wo.asset_master_category && <p className="text-xs text-muted-foreground">{wo.asset_master_category}</p>}
              </div>
            </div>
          </Sec>

          <Sec id="categories" title="Classification">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Categories</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <PriBadge pri={wo.actual_priority} />
                  {wo.wo_type && <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 flex items-center gap-1"><RotateCcw className="w-3 h-3" />{wo.wo_type}</span>}
                  {wo.wo_sub_type && <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">{wo.wo_sub_type}</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Work Order ID</p>
                <p className="text-sm font-mono font-semibold text-foreground">#{wo.wo_number || wo.name}</p>
                {wo.sr_number && <p className="text-xs text-primary mt-1 cursor-pointer hover:underline">SR: {wo.sr_number}</p>}
              </div>
            </div>
          </Sec>

          {(wo.service_group || wo.fault_category || wo.fault_code) && (
            <Sec id="fault" title="Fault Details">
              <Row label="Service Group" val={wo.service_group} />
              <Row label="Fault Category" val={wo.fault_category} />
              <Row label="Fault Code" val={wo.fault_code} />
              <Row label="Approval Criticality" val={wo.approval_criticality} />
            </Sec>
          )}

          <Sec id="cost" title="Time & Cost Tracking">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Spares (OMR)", val: wo.spares_amount ? `OMR ${wo.spares_amount.toLocaleString()}` : "—", color: "border-l-4 border-l-blue-400" },
                { label: "Service (OMR)", val: wo.service_amount ? `OMR ${wo.service_amount.toLocaleString()}` : "—", color: "border-l-4 border-l-violet-400" },
                { label: "Total Cost",    val: wo.total_wo_cost ? `OMR ${wo.total_wo_cost.toLocaleString()}` : "—", color: "border-l-4 border-l-emerald-400" },
              ].map(item => (
                <div key={item.label} className={`bg-muted/50 rounded-xl p-3 ${item.color}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-foreground">{item.val}</p>
                </div>
              ))}
            </div>
            <Row label="Planned Duration" val={wo.planned_duration_min ? `${wo.planned_duration_min} min` : "—"} />
            <Row label="Labour Hours" val={wo.labor_hours ? `${wo.labor_hours} hrs` : "—"} />
            <Row label="Actual Start" val={wo.actual_start ? formatDateTime(wo.actual_start) : "—"} />
            <Row label="Actual End" val={wo.actual_end ? formatDateTime(wo.actual_end) : "—"} />
            <Row label="Materials Status" val={wo.material_request_status} />
          </Sec>

          <Sec id="sla" title="SLA Tracking">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className={`rounded-xl p-3 border ${wo.response_sla_breach ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                <p className="text-xs font-bold text-muted-foreground mb-1">Response SLA</p>
                <p className="text-xs text-foreground">Target: {formatDateTime(wo.response_sla_target)}</p>
                <p className="text-xs text-foreground">Actual: {formatDateTime(wo.response_sla_actual)}</p>
                <span className={`text-xs font-bold mt-1 block ${wo.response_sla_breach ? "text-red-500" : "text-emerald-600"}`}>
                  {wo.response_sla_breach ? "⚠ Breached" : "✓ Met"}
                </span>
              </div>
              <div className={`rounded-xl p-3 border ${slaResBreached ? "bg-red-50 border-red-200" : "bg-muted/40 border-border"}`}>
                <p className="text-xs font-bold text-muted-foreground mb-1">Resolution SLA</p>
                <p className="text-xs text-foreground">Target: {formatDateTime(wo.resolution_sla_target)}</p>
                <p className="text-xs text-foreground">Actual: {formatDateTime(wo.resolution_sla_actual)}</p>
                <span className={`text-xs font-bold mt-1 block ${slaResBreached ? "text-red-500" : "text-emerald-600"}`}>
                  {slaResBreached ? "⚠ Breached" : "✓ Met"}
                </span>
              </div>
            </div>
            {wo.extension_date && <Row label="Extension Date" val={formatDate(wo.extension_date)} />}
            {wo.extension_reason && <Row label="Extension Reason" val={wo.extension_reason} />}
          </Sec>

          <Sec id="photos" title="Photo Evidence">
            <div className="grid grid-cols-2 gap-4">
              {[{ label: "Before Photo", url: wo.before_photo }, { label: "After Photo", url: wo.after_photo }].map(({ label, url }) => (
                <div key={label} className="border border-border rounded-xl overflow-hidden">
                  {url
                    ? <img src={url} alt={label} className="w-full h-36 object-cover" />
                    : <div className="h-36 bg-muted/40 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                        <Camera className="w-6 h-6" /><p className="text-xs">No photo</p>
                      </div>}
                  <div className="px-3 py-2 bg-muted/30 border-t border-border">
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </Sec>

          <Sec id="closure" title="Closure & Sign-off">
            <Row label="Customer Rating" val={wo.customer_rating} />
            <Row label="Closed By" val={wo.closed_by} />
            <Row label="Final Approver" val={wo.final_approver} link />
            {wo.sr_number && <Row label="Service Request" val={wo.sr_number} link />}
            {wo.amended_from && <Row label="Amended From" val={wo.amended_from} link />}
          </Sec>
        </div>
      </div>

      {/* ── ACTIVITY SIDEBAR ── */}
      {showActivity && <ActivitySidebar woName={woName} onClose={() => setShowActivity(false)} />}

      {/* ── PRINT MODAL ── */}
      {showPrint && wo && <PrintModal wo={wo} onClose={() => setShowPrint(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NEW / EDIT FORM (unchanged, kept complete)
═══════════════════════════════════════════════════════ */
const SCHEDULE_FREQS = ["None", "Daily", "Weekly", "Monthly", "Yearly"] as const;
type SchedFreq = typeof SCHEDULE_FREQS[number];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WOForm {
  wo_title: string; wo_type: string; wo_sub_type: string; wo_source: string;
  client_code: string; contract_code: string;
  property_code: string; zone_code: string; sub_zone_code: string; base_unit_code: string;
  asset_code: string; service_group: string; fault_category: string; fault_code: string;
  actual_priority: string; approval_criticality: string;
  assigned_to: string; secondary_tech: string;
  schedule_start_date: string; schedule_start_time: string; schedule_end_time: string;
  planned_duration_min: string; sr_number: string;
  schedFreq: SchedFreq; schedDays: number[]; schedEvery: string;
  description: string; status: string;
}

const BLANK_FORM: WOForm = {
  wo_title: "", wo_type: "", wo_sub_type: "", wo_source: "",
  client_code: "", contract_code: "",
  property_code: "", zone_code: "", sub_zone_code: "", base_unit_code: "",
  asset_code: "", service_group: "", fault_category: "", fault_code: "",
  actual_priority: "", approval_criticality: "",
  assigned_to: "", secondary_tech: "",
  schedule_start_date: "", schedule_start_time: "", schedule_end_time: "",
  planned_duration_min: "", sr_number: "",
  schedFreq: "None", schedDays: [], schedEvery: "1",
  description: "", status: "Open",
};

function WOForm({ editName, onClose, onSaved }: { editName?: string; onClose: () => void; onSaved: (name: string) => void }) {
  const [form, setForm] = useState<WOForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof WOForm) => (v: string | number[]) => setForm(f => ({ ...f, [k]: v }));

  const { data: existingDoc } = useDoc<WOListItem>("Work Orders", editName || "");
  useEffect(() => {
    if (editName && existingDoc) {
      setForm(f => ({
        ...f,
        wo_title: existingDoc.wo_title || "", wo_type: existingDoc.wo_type || "", wo_sub_type: existingDoc.wo_sub_type || "",
        wo_source: existingDoc.wo_source || "", client_code: existingDoc.client_code || "", contract_code: existingDoc.contract_code || "",
        property_code: existingDoc.property_code || "", zone_code: existingDoc.zone_code || "", asset_code: existingDoc.asset_code || "",
        service_group: existingDoc.service_group || "", fault_category: existingDoc.fault_category || "",
        actual_priority: existingDoc.actual_priority || "", approval_criticality: existingDoc.approval_criticality || "",
        assigned_to: existingDoc.assigned_to || "", secondary_tech: existingDoc.secondary_tech || "",
        schedule_start_date: existingDoc.schedule_start_date || "", schedule_start_time: existingDoc.schedule_start_time || "",
        schedule_end_time: existingDoc.schedule_end_time || "",
        planned_duration_min: existingDoc.planned_duration_min ? String(existingDoc.planned_duration_min) : "",
        status: existingDoc.status || "Open", description: existingDoc.work_done_notes || "",
      }));
    }
  }, [editName, existingDoc]);

  const clients = useSimpleList<{ name: string; client_name: string }>("Client", ["name", "client_name"], []);
  const properties = useSimpleList<{ name: string; property_code: string; property_name: string }>("Property", ["name", "property_code", "property_name"], [["is_active", "=", 1]]);
  const zones = useSimpleList<{ name: string; zone_code: string; zone_name: string }>("Zone", ["name", "zone_code", "zone_name"], form.property_code ? [["property_code", "=", form.property_code]] : [], !form.property_code);
  const subZones = useSimpleList<{ name: string; sub_zone_code: string; sub_zone_name: string }>("Sub Zone", ["name", "sub_zone_code", "sub_zone_name"], form.zone_code ? [["zone_code", "=", form.zone_code]] : [], !form.zone_code);
  const assets = useSimpleList<{ name: string; asset_code: string; asset_name: string }>("CFAM Asset", ["name", "asset_code", "asset_name"], form.property_code ? [["property_code", "=", form.property_code], ["asset_status", "=", "Active"]] : [], !form.property_code);
  const contracts = useSimpleList<{ name: string; contract_title: string }>("FM Contract", ["name", "contract_title"], form.client_code ? [["client_code", "=", form.client_code], ["status", "=", "Active"]] : [], !form.client_code);
  const technicians = useSimpleList<{ name: string; resource_name: string }>("Resource", ["name", "resource_name"], []);
  const faultCodes = useSimpleList<{ name: string }>("Fault Code", ["name"], []);

  const toggleDay = (d: number) => {
    const cur = form.schedDays as number[];
    set("schedDays")(cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]);
  };

  const handleSubmit = async () => {
    if (!form.wo_title || !form.actual_priority) { setErr("Title and Priority are required."); return; }
    setSaving(true); setErr(null);
    try {
      const payload: Partial<WOListItem> = {
        wo_title: form.wo_title, wo_type: form.wo_type || undefined, wo_sub_type: form.wo_sub_type || undefined,
        wo_source: form.wo_source || undefined, client_code: form.client_code || undefined,
        contract_code: form.contract_code || undefined, property_code: form.property_code || undefined,
        zone_code: form.zone_code || undefined, sub_zone_code: form.sub_zone_code || undefined,
        base_unit_code: form.base_unit_code || undefined, asset_code: form.asset_code || undefined,
        service_group: form.service_group || undefined, fault_category: form.fault_category || undefined,
        fault_code: form.fault_code || undefined, actual_priority: form.actual_priority,
        approval_criticality: form.approval_criticality || undefined,
        assigned_to: form.assigned_to || undefined, secondary_tech: form.secondary_tech || undefined,
        schedule_start_date: form.schedule_start_date || undefined,
        schedule_start_time: form.schedule_start_time || undefined,
        schedule_end_time: form.schedule_end_time || undefined,
        planned_duration_min: form.planned_duration_min ? Number(form.planned_duration_min) : undefined,
        work_done_notes: form.description || undefined, status: form.status || "Open",
        sr_number: form.sr_number || undefined,
      };
      const doc = editName ? await frappeUpdate<WOListItem>("Work Orders", editName, payload) : await frappeCreate<WOListItem>("Work Orders", payload);
      onSaved(doc.name);
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const Inp = ({ label, fk, type = "text", placeholder, req }: { label: string; fk: keyof WOForm; type?: string; placeholder?: string; req?: boolean }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">{label}{req && <span className="text-destructive ml-1">*</span>}</label>
      <input type={type} value={String(form[fk])} onChange={e => set(fk)(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
  const Sel = ({ label, fk, opts, req, disabled }: { label: string; fk: keyof WOForm; opts: { v: string; l: string }[]; req?: boolean; disabled?: boolean }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">{label}{req && <span className="text-destructive ml-1">*</span>}</label>
      <select value={String(form[fk])} onChange={e => set(fk)(e.target.value)} disabled={disabled}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50">
        <option value="">Select…</option>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-6 fade-in">
      <div className="flex items-center gap-2 mb-6">
        {editName && <button onClick={onClose} className="p-1 hover:bg-muted rounded"><ChevronLeft className="w-5 h-5" /></button>}
        <h2 className="text-xl font-bold text-foreground flex-1">{editName ? "Edit work order" : "New Work Order"}</h2>
        {!editName && <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>}
      </div>
      {err && <ErrBanner msg={err} onRetry={() => setErr(null)} />}
      <div className="mb-5">
        <input value={form.wo_title} onChange={e => set("wo_title")(e.target.value)} placeholder="Work order title…"
          className="w-full px-0 py-2 border-0 border-b-2 border-primary text-lg font-semibold bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/50" />
      </div>
      <div className="mb-5">
        <div className="border-2 border-dashed border-border rounded-xl py-10 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer bg-muted/10">
          <Camera className="w-6 h-6" /><span className="text-sm">Add or drag pictures</span>
        </div>
      </div>
      <div className="mb-5">
        <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
        <textarea value={form.description} onChange={e => set("description")(e.target.value)} rows={3} placeholder="Add a description"
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      </div>
      <div className="mb-5">
        <label className="block text-sm font-semibold text-foreground mb-2">Procedure</label>
        <div className="border border-border rounded-xl p-5 flex flex-col items-center gap-3 text-muted-foreground bg-muted/20">
          <p className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Create or attach new Form, Procedure or Checklist</p>
          <button className="px-4 py-2 border border-primary text-primary rounded-lg text-sm font-semibold hover:bg-primary/5 transition-colors">+ Add Procedure</button>
        </div>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">WO Classification</p>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="WO Type" fk="wo_type" opts={["Reactive Maintenance","Planned Preventive","Project","Inspection","Callout"].map(v => ({ v, l: v }))} req />
        <Sel label="WO Sub Type" fk="wo_sub_type" opts={["Reactive Maintenance","Planned Preventive","Scheduled","Emergency","AdHoc"].map(v => ({ v, l: v }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="WO Source" fk="wo_source" opts={["Service Request","PM Schedule","Project","Helpdesk","Portal","Phone","Inspection","Manual"].map(v => ({ v, l: v }))} />
        <Inp label="Service Request #" fk="sr_number" placeholder="SR-00001" />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Assign to</p>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Primary Technician" fk="assigned_to" opts={technicians.map(t => ({ v: t.name, l: t.resource_name }))} req />
        <Sel label="Secondary Technician" fk="secondary_tech" opts={technicians.map(t => ({ v: t.name, l: t.resource_name }))} />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Client & Contract</p>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Client" fk="client_code" opts={clients.map(c => ({ v: c.name, l: c.client_name }))} req />
        <Sel label="Contract" fk="contract_code" opts={contracts.map(c => ({ v: c.name, l: c.contract_title }))} disabled={!form.client_code} />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Location</p>
      <Sel label="Property" fk="property_code" req opts={properties.map(p => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))} />
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Zone" fk="zone_code" opts={zones.map(z => ({ v: z.name, l: `${z.zone_code} — ${z.zone_name}` }))} disabled={!form.property_code} />
        <Sel label="Sub Zone" fk="sub_zone_code" opts={subZones.map(s => ({ v: s.name, l: `${s.sub_zone_code} — ${s.sub_zone_name}` }))} disabled={!form.zone_code} />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Asset & Fault</p>
      <Sel label="Asset" fk="asset_code" opts={assets.map(a => ({ v: a.name, l: `${a.asset_code} — ${a.asset_name}` }))} disabled={!form.property_code} />
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Service Group" fk="service_group" placeholder="MEP, Civil…" />
        <Inp label="Fault Category" fk="fault_category" placeholder="HVAC, Plumbing…" />
      </div>
      <Sel label="Fault Code" fk="fault_code" opts={faultCodes.map(f => ({ v: f.name, l: f.name }))} />
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Due Date</p>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Scheduled Start Date" fk="schedule_start_date" type="date" />
        <Inp label="Start Time" fk="schedule_start_time" type="time" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="End Time" fk="schedule_end_time" type="time" />
        <Inp label="Planned Duration (min)" fk="planned_duration_min" type="number" placeholder="120" />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Schedule</p>
      <div className="mb-4">
        <div className="flex gap-2 mb-3">
          {SCHEDULE_FREQS.map(f => (
            <button key={f} onClick={() => set("schedFreq")(f)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${form.schedFreq === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40"}`}>
              {f}
            </button>
          ))}
        </div>
        {form.schedFreq === "Weekly" && (
          <div className="fade-in">
            <p className="text-sm text-foreground mb-2">
              Every <input type="number" value={form.schedEvery} onChange={e => set("schedEvery")(e.target.value)} className="w-12 border border-border rounded px-1 py-0.5 text-sm text-center mx-1" /> week on
            </p>
            <div className="flex gap-2 mb-2">
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-full text-xs font-bold border-2 transition-all ${(form.schedDays as number[]).includes(i) ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40"}`}>
                  {d}
                </button>
              ))}
            </div>
            {(form.schedDays as number[]).length > 0 && (
              <p className="text-xs text-muted-foreground">Repeats every {form.schedEvery} week on {(form.schedDays as number[]).map(d => DAYS[d]).join(", ")} after completion.</p>
            )}
          </div>
        )}
        {form.schedFreq === "Monthly" && <p className="text-xs text-muted-foreground fade-in">Repeats every 1 month on the scheduled day.</p>}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Priority <span className="text-destructive">*</span></p>
      <div className="flex gap-2 mb-4">
        {["", "P4 - Low", "P3 - Medium", "P2 - High", "P1 - Critical"].map(p => {
          const label = p ? PRIORITY_CFG[p]?.label : "None"; const active = form.actual_priority === p;
          return (
            <button key={p || "none"} onClick={() => set("actual_priority")(p)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40"}`}>
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Status</p>
      <Sel label="" fk="status" opts={["Draft","Open","Assigned","In Progress","Pending Parts","Not Dispatched","Pending Approval","Completed","Closed","Cancelled"].map(v => ({ v, l: v }))} />
      <Sel label="Approval Criticality" fk="approval_criticality" opts={["Normal","High","Critical","Emergency"].map(v => ({ v, l: v }))} />
      <button onClick={handleSubmit} disabled={saving}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-4">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : editName ? "Update" : <><Plus className="w-4 h-4" />Create Work Order</>}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════ */
type ListTab = "To Do" | "Done";
type SortKey = "Priority: Highest First" | "Creation Date: Newest First" | "Due Date: Soonest First";

const TODO_STATUSES = ["Draft", "Open", "Assigned", "In Progress", "Pending Parts", "Not Dispatched", "Pending Approval"];
const DONE_STATUSES = ["Completed", "Closed", "Cancelled"];

export default function WorkOrders() {
  const [tab, setTab] = useState<ListTab>("To Do");
  const [sort, setSort] = useState<SortKey>("Priority: Highest First");
  const [showSort, setShowSort] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editName, setEditName] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const sortRef = useRef<HTMLDivElement>(null);

  const statusFilter: FF = [["status", "in", (tab === "To Do" ? TODO_STATUSES : DONE_STATUSES).join(",")]];

  const { data: allWOs, loading, error, refetch } = useList<WOListItem>(
    "Work Orders",
    ["name","wo_number","wo_title","wo_type","wo_sub_type","wo_source","status",
      "actual_priority","default_priority","client_code","client_name",
      "property_code","property_name","asset_code","asset_name",
      "assigned_to","assigned_technician","secondary_tech","secondary_technician_name",
      "schedule_start_date","schedule_start_time","planned_duration_min",
      "labor_hours","spares_amount","service_amount","total_wo_cost",
      "response_sla_breach","resolution_sla_breach","sr_number","creation","modified"],
    statusFilter, [tab]
  );

  const filtered = allWOs.filter(wo => {
    if (!search) return true;
    const q = search.toLowerCase();
    return wo.wo_title?.toLowerCase().includes(q) || wo.wo_number?.toLowerCase().includes(q) ||
      wo.property_name?.toLowerCase().includes(q) || wo.assigned_technician?.toLowerCase().includes(q);
  });

  const PRIO_ORDER: Record<string, number> = { "P1 - Critical": 0, "P2 - High": 1, "P3 - Medium": 2, "P4 - Low": 3, "": 4 };
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "Priority: Highest First") return (PRIO_ORDER[a.actual_priority || ""] ?? 4) - (PRIO_ORDER[b.actual_priority || ""] ?? 4);
    if (sort === "Creation Date: Newest First") return (b.creation || "").localeCompare(a.creation || "");
    return (a.schedule_start_date || "").localeCompare(b.schedule_start_date || "");
  });

  const myWOs = sorted.filter((_, i) => i % 3 === 0);
  const teamWOs = sorted.filter((_, i) => i % 3 === 1);
  const restWOs = sorted.filter((_, i) => i % 3 === 2);
  const groups: [string, WOListItem[]][] = [
    ["Assigned to You", myWOs],
    ["Assigned to your Teams", teamWOs],
    ["All Open Work Orders", restWOs],
  ];

  const toggleGroup = (k: string) => setCollapsedGroups(p => ({ ...p, [k]: !p[k] }));

  useEffect(() => {
    if (sorted.length > 0 && !selectedName && !showForm) setSelectedName(sorted[0].name);
  }, [sorted, selectedName, showForm]);

  useEffect(() => {
    if (!showSort) return;
    const h = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showSort]);

  const FILTER_CHIPS = [
    { icon: <Filter className="w-3.5 h-3.5" />, label: "Filters" },
    { icon: <User className="w-3.5 h-3.5" />, label: "Assigned To" },
    { icon: <Clock className="w-3.5 h-3.5" />, label: "Due Date" },
    { icon: <MapPin className="w-3.5 h-3.5" />, label: "Location" },
    { icon: <Zap className="w-3.5 h-3.5" />, label: "Priority" },
    { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Status" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Work Orders</h1>
          <div className="flex items-center gap-1 ml-1">
            {["⊞", "⊟", "▦"].map(ic => (
              <button key={ic} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground text-lg">{ic}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-64 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search Work Orders…" />
          </div>
          <button onClick={() => { setShowForm(true); setEditName(undefined); setSelectedName(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Work Order
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_CHIPS.map(({ icon, label }) => (
            <button key={label} className="filter-chip">{icon} {label}</button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <Star className="w-3.5 h-3.5" /> My Filters
        </button>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT LIST */}
        <div className="w-[400px] min-w-[400px] border-r border-border flex flex-col bg-card overflow-hidden">
          <div className="flex border-b border-border">
            {(["To Do", "Done"] as ListTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>
          <div ref={sortRef} className="relative px-4 py-2 border-b border-border flex items-center text-xs">
            <button onClick={() => setShowSort(v => !v)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              Sort By: <span className="font-semibold text-primary ml-1">{sort}</span><ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>
            {showSort && (
              <div className="absolute top-8 left-3 z-30 bg-card border border-border rounded-xl shadow-lg p-1 w-64 fade-in">
                {(["Priority: Highest First", "Creation Date: Newest First", "Due Date: Soonest First"] as SortKey[]).map(s => (
                  <button key={s} onClick={() => { setSort(s); setShowSort(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-muted ${sort === s ? "text-primary font-semibold" : ""}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <Spinner />}
            {error && <ErrBanner msg={error} onRetry={refetch} />}
            {!loading && !error && sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
                <FileText className="w-8 h-8" /><p className="text-sm">No work orders found</p>
              </div>
            )}
            {!loading && !error && groups.map(([groupName, items]) =>
              items.length === 0 ? null : (
                <div key={groupName}>
                  <button onClick={() => toggleGroup(groupName)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border text-xs font-bold text-foreground uppercase tracking-wide">
                    <span>{groupName} ({items.length})</span>
                    {collapsedGroups[groupName] ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                  {!collapsedGroups[groupName] && items.map(wo => (
                    <WOCard key={wo.name} wo={wo}
                      selected={selectedName === wo.name && !showForm}
                      onClick={() => { setSelectedName(wo.name); setShowForm(false); setEditName(undefined); }} />
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 overflow-hidden bg-background">
          {showForm ? (
            <div className="h-full overflow-y-auto">
              <WOForm editName={editName} onClose={() => { setShowForm(false); setEditName(undefined); }}
                onSaved={name => { setShowForm(false); setEditName(undefined); setSelectedName(name); refetch(); }} />
            </div>
          ) : selectedName ? (
            <DetailView woName={selectedName} onStatusChange={() => { refetch(); }} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <FileText className="w-10 h-10" /><p className="text-sm">Select a work order to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}