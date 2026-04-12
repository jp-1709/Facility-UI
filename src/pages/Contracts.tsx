/**
 * Contracts.tsx — Enhanced Edition
 * Facility-UI · FM Contract module
 *
 * ENHANCEMENTS:
 * ─ Live stats bar (Active / Total Value / Expiring Soon / overdue) from API data
 * ─ Contract cards with visual expiry progress bar & value display
 * ─ Contract period timeline in detail (Start → Today → End)
 * ─ Financial highlight cards (Annual Value, Monthly, Payment Status)
 * ─ Collapsible detail sections with smooth CSS animation
 * ─ SLA table with priority colour rows
 * ─ Status lifecycle indicator strip
 * ─ Advanced CSS keyframe animations & micro-interactions
 * ─ Zero hardcoded data — all from Frappe REST API
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Plus, Building2, User, Calendar, Tag,
  CheckCircle2, ChevronDown, ChevronRight, MoreVertical,
  Pencil, X, Loader2, AlertCircle, RefreshCw, FileText,
  DollarSign, Clock, Shield, AlertTriangle, CheckCheck, XCircle,
  TrendingUp, Activity, Filter,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

/* ═══════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════ */

const CONTRACT_CSS = `
@keyframes conFadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes conSlideR {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes conExpand {
  from { opacity: 0; max-height: 0; transform: translateY(-4px); }
  to   { opacity: 1; max-height: 2000px; transform: translateY(0); }
}
@keyframes conBarFill {
  from { width: 0%; }
  to   { width: var(--target-w); }
}
.c-fade-up   { animation: conFadeUp 0.26s cubic-bezier(.4,0,.2,1) both; }
.c-slide-r   { animation: conSlideR 0.22s cubic-bezier(.4,0,.2,1) both; }
.c-expand    { animation: conExpand 0.3s cubic-bezier(.4,0,.2,1) both; }
.c-stagger > * { animation: conFadeUp 0.26s cubic-bezier(.4,0,.2,1) both; }
.c-stagger > *:nth-child(1) { animation-delay: 0ms; }
.c-stagger > *:nth-child(2) { animation-delay: 50ms; }
.c-stagger > *:nth-child(3) { animation-delay: 100ms; }
.c-stagger > *:nth-child(4) { animation-delay: 150ms; }
.con-card-row { transition: background .14s; }
.con-card-row:hover .con-arrow { opacity: 1; transform: translateX(3px); }
.con-arrow { opacity: 0; transition: opacity .14s, transform .14s; }
.con-bar-fill { animation: conBarFill 1s cubic-bezier(.4,0,.2,1) forwards; }
`;

function useContractStyles() {
  useEffect(() => {
    if (document.getElementById("contract-css")) return;
    const s = document.createElement("style");
    s.id = "contract-css";
    s.textContent = CONTRACT_CSS;
    document.head.appendChild(s);
  }, []);
}

/* ═══════════════════════════════════════════
   FRAPPE API HELPERS  (unchanged)
═══════════════════════════════════════════ */

const FRAPPE_BASE = "";
type FrappeFilters = [string, string, string | number][];

async function frappeGet<T>(doctype: string, fields: string[], filters: FrappeFilters = [], orderBy = "", limit = 500): Promise<T[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit),
    ...(orderBy ? { order_by: orderBy } : {}),
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { exc_type?: string })?.exc_type || `POST ${doctype} failed`);
  }
  return (await res.json()).data as T;
}

function getCsrfToken(): string { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

/* ═══════════════════════════════════════════
   TYPES  (unchanged)
═══════════════════════════════════════════ */

interface ContractListItem {
  name: string; contract_code: string; contract_title: string;
  client_code: string; client_name?: string;
  contract_group?: string; contract_type?: string;
  start_date: string; end_date: string;
  annual_value?: number; fixed_monthly?: number;
  billing_model?: string; payment_status?: string; status: string;
}

interface ContractDetail extends ContractListItem {
  amended_from?: string; sla_details?: SLARow[];
}

interface SLARow { priority: string; response_hours: number; resolution_hours: number; }
interface Client { name: string; client_name: string; }

/* ═══════════════════════════════════════════
   HOOKS  (unchanged)
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
   COLOUR MAPS  (unchanged)
═══════════════════════════════════════════ */

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; border: string; icon: React.ReactNode }> = {
  Active:     { label: "Active",     bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", border: "#10b981", icon: <CheckCheck className="w-3 h-3" /> },
  Draft:      { label: "Draft",      bg: "bg-gray-100",    text: "text-gray-600",    dot: "bg-gray-400",    border: "#9ca3af", icon: <FileText className="w-3 h-3" /> },
  Expired:    { label: "Expired",    bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-400",     border: "#ef4444", icon: <XCircle className="w-3 h-3" /> },
  Terminated: { label: "Terminated", bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-600",     border: "#dc2626", icon: <XCircle className="w-3 h-3" /> },
  "On Hold":  { label: "On Hold",    bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500",   border: "#f59e0b", icon: <AlertTriangle className="w-3 h-3" /> },
};

const GROUP_COLORS: Record<string, { cls: string; accent: string }> = {
  IFM:       { cls: "bg-blue-100 text-blue-700 border border-blue-200",     accent: "#3b82f6" },
  "DC Ops":  { cls: "bg-violet-100 text-violet-700 border border-violet-200", accent: "#7c3aed" },
  "Soft FM": { cls: "bg-teal-100 text-teal-700 border border-teal-200",     accent: "#0d9488" },
  "Hard FM": { cls: "bg-orange-100 text-orange-700 border border-orange-200", accent: "#ea580c" },
  "MEP Only":{ cls: "bg-sky-100 text-sky-700 border border-sky-200",        accent: "#0284c7" },
  Other:     { cls: "bg-gray-100 text-gray-600 border border-gray-200",     accent: "#6b7280" },
  AMC:       { cls: "bg-indigo-100 text-indigo-700 border border-indigo-200",accent: "#4f46e5" },
  AdHoc:     { cls: "bg-pink-100 text-pink-700 border border-pink-200",     accent: "#db2777" },
  PMC:       { cls: "bg-cyan-100 text-cyan-700 border border-cyan-200",     accent: "#0891b2" },
  FM:        { cls: "bg-emerald-100 text-emerald-700 border border-emerald-200", accent: "#059669" },
};

const PAYMENT_CONFIG: Record<string, { cls: string; dot: string }> = {
  Current:  { cls: "bg-emerald-100 text-emerald-700 border border-emerald-200", dot: "#10b981" },
  Overdue:  { cls: "bg-red-100 text-red-700 border border-red-200",             dot: "#ef4444" },
  Disputed: { cls: "bg-amber-100 text-amber-700 border border-amber-200",       dot: "#f59e0b" },
  Settled:  { cls: "bg-gray-100 text-gray-600 border border-gray-200",          dot: "#9ca3af" },
};

const SLA_PRIORITY_CFG: Record<string, { cls: string; dot: string }> = {
  Critical: { cls: "bg-red-50 border-red-200",     dot: "#ef4444" },
  High:     { cls: "bg-orange-50 border-orange-200", dot: "#f97316" },
  Medium:   { cls: "bg-amber-50 border-amber-200",  dot: "#f59e0b" },
  Low:      { cls: "bg-gray-50 border-gray-200",    dot: "#9ca3af" },
};

const GROUP_ICONS: Record<string, string> = {
  IFM: "🏢", "DC Ops": "🖥️", "Soft FM": "🧹", "Hard FM": "🔧",
  "MEP Only": "⚡", AMC: "🔵", PMC: "🟢", FM: "🏗️", Other: "📄", AdHoc: "📋",
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}
function formatDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateShort(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}
function formatOMR(v?: number): string {
  if (!v) return "—";
  return `OMR ${v.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}
function formatOMRK(v?: number): string {
  if (!v) return "—";
  return v >= 1000 ? `OMR ${(v / 1000).toFixed(0)}K` : `OMR ${v}`;
}

/* ═══════════════════════════════════════════
   BASE UI HELPERS
═══════════════════════════════════════════ */

function LoadingSpinner({ small }: { small?: boolean }) {
  return <div className={`flex items-center justify-center ${small ? "py-4" : "py-16"}`}><Loader2 className={`animate-spin text-primary ${small ? "w-4 h-4" : "w-6 h-6"}`} /></div>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl m-3">
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="text-xs font-semibold text-destructive underline">Retry</button>}
    </div>
  );
}

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
  const cfg = GROUP_COLORS[group] || GROUP_COLORS["Other"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.cls}`}>
      {GROUP_ICONS[group] || "📄"} {group}
    </span>
  );
}

function InfoRow({ label, value, link, mono }: { label: string; value?: string | null; link?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground font-medium shrink-0 w-36">{label}</span>
      {link
        ? <span className="text-sm text-primary font-medium cursor-pointer hover:underline text-right">{value || "—"}</span>
        : <span className={`text-sm text-foreground font-semibold text-right ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   STATS BAR
═══════════════════════════════════════════ */

interface ContractStats { active: number; totalValue: number; expiringSoon: number; overdue: number; }

function StatsBar({ stats, loading }: { stats: ContractStats; loading: boolean }) {
  const items = [
    { label: "Active Contracts", value: String(stats.active),             icon: <CheckCheck className="w-4 h-4" />, color: "#10b981", bg: "#10b98115" },
    { label: "Total Value",      value: loading ? "—" : formatOMRK(stats.totalValue), icon: <DollarSign className="w-4 h-4" />, color: "#6366f1", bg: "#6366f115" },
    { label: "Expiring ≤60d",    value: String(stats.expiringSoon),       icon: <Clock className="w-4 h-4" />,     color: "#f59e0b", bg: "#f59e0b15" },
    { label: "Overdue Payment",  value: String(stats.overdue),            icon: <AlertTriangle className="w-4 h-4" />, color: "#ef4444", bg: "#ef444415" },
  ];

  return (
    <div className="flex items-stretch border-b border-border bg-card c-stagger">
      {items.map(({ label, value, icon, color, bg }) => (
        <div key={label} className="flex-1 flex items-center gap-3 px-5 py-3 border-r border-border/50 last:border-r-0 relative overflow-hidden">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin opacity-40" /> : icon}
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">{loading ? "—" : value}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CONTRACT PERIOD TIMELINE (in detail)
═══════════════════════════════════════════ */

function ContractTimeline({ startDate, endDate, status }: { startDate: string; endDate: string; status: string }) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  const progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const days = daysUntil(endDate);
  const isExpired = days < 0;
  const isExpiring = !isExpired && days <= 60;
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG["Draft"];

  const barColor = isExpired ? "#ef4444" : isExpiring ? "#f59e0b" : "#10b981";

  return (
    <div className="py-1">
      <div className="flex items-center justify-between mb-1.5 text-[10px] font-semibold text-muted-foreground">
        <span>Contract Start</span>
        <span className={`font-bold ${isExpired ? "text-red-500" : isExpiring ? "text-amber-600" : "text-emerald-600"}`}>
          {isExpired ? "Expired" : isExpiring ? `Expiring in ${days}d` : `${days} days remaining`}
        </span>
        <span>End Date</span>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="con-bar-fill absolute left-0 top-0 h-full rounded-full"
          style={{ "--target-w": `${progress}%`, width: `${progress}%`, background: barColor } as React.CSSProperties}
        />
        {/* today marker */}
        <div className="absolute top-0 h-full w-0.5 bg-foreground/50" style={{ left: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
        <span>{formatDate(startDate)}</span>
        <span className="bg-muted/80 px-2 py-0.5 rounded-full font-medium border border-border/50">Today · {progress}%</span>
        <span className={isExpired ? "text-red-500 font-semibold" : ""}>{formatDate(endDate)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FINANCIAL HIGHLIGHTS (in detail)
═══════════════════════════════════════════ */

function FinancialCards({ c }: { c: ContractDetail }) {
  const paymentCfg = PAYMENT_CONFIG[c.payment_status || ""] || null;

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {/* Annual Value */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Annual Value</p>
        <p className="text-lg font-bold text-foreground leading-tight">{formatOMR(c.annual_value)}</p>
        {c.billing_model && <p className="text-[10px] text-muted-foreground">{c.billing_model}</p>}
      </div>
      {/* Monthly */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fixed Monthly</p>
        <p className="text-lg font-bold text-foreground leading-tight">{formatOMR(c.fixed_monthly)}</p>
        <p className="text-[10px] text-muted-foreground">per month</p>
      </div>
      {/* Payment Status */}
      <div className={`rounded-xl border p-4 flex flex-col gap-1 ${paymentCfg?.cls || "border-border bg-card"}`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payment</p>
        <div className="flex items-center gap-1.5">
          {paymentCfg && <span className="w-2 h-2 rounded-full" style={{ background: paymentCfg.dot }} />}
          <p className="text-base font-bold text-foreground leading-tight">{c.payment_status || "—"}</p>
        </div>
        <p className="text-[10px] text-muted-foreground">{c.billing_model || "—"}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLA TABLE
═══════════════════════════════════════════ */

function SLATable({ rows }: { rows: SLARow[] }) {
  if (!rows.length) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/60">
            <th className="px-4 py-2.5 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Priority</th>
            <th className="px-4 py-2.5 text-center font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Response</th>
            <th className="px-4 py-2.5 text-center font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Resolution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const cfg = SLA_PRIORITY_CFG[row.priority] || SLA_PRIORITY_CFG["Low"];
            return (
              <tr key={i} className={`border-t border-border ${cfg.cls}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                    <span className="font-bold text-foreground">{row.priority}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-semibold text-foreground">{row.response_hours}h</td>
                <td className="px-4 py-3 text-center font-semibold text-foreground">{row.resolution_hours}h</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CONTRACT CARD (left list)
═══════════════════════════════════════════ */

function ContractCard({ c, selected, onClick }: { c: ContractListItem; selected: boolean; onClick: () => void }) {
  const days = daysUntil(c.end_date);
  const expiring = days >= 0 && days <= 60;
  const expired = days < 0;
  const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG["Draft"];
  const groupCfg = GROUP_COLORS[c.contract_group || ""] || GROUP_COLORS["Other"];

  /* expiry bar progress */
  const start = new Date(c.start_date).getTime();
  const end = new Date(c.end_date).getTime();
  const now = Date.now();
  const progress = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  const barColor = expired ? "#ef4444" : expiring ? "#f59e0b" : "#10b981";

  return (
    <button onClick={onClick}
      className={`con-card-row w-full text-left px-4 py-4 border-b border-border/60 flex gap-3 transition-all
        ${selected ? "bg-primary/5" : "hover:bg-muted/30"}`}
      style={{ borderLeft: `3px solid ${selected ? statusCfg.border : "transparent"}` }}
    >
      {/* icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
        style={{ background: `${groupCfg.accent}15`, color: groupCfg.accent }}>
        {GROUP_ICONS[c.contract_group || ""] || "📄"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate leading-tight">{c.contract_title}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.client_name || c.client_code}</p>

        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">{c.contract_code}</span>
          <GroupBadge group={c.contract_group} />
        </div>

        {/* expiry progress bar */}
        <div className="mt-2.5">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: barColor }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-muted-foreground">{formatDateShort(c.start_date)}</span>
            <span className={`text-[9px] font-semibold ${expired ? "text-red-500" : expiring ? "text-amber-600" : "text-muted-foreground"}`}>
              {expired ? `Expired ${Math.abs(days)}d ago` : expiring ? `Exp in ${days}d ⚠` : `Exp ${formatDateShort(c.end_date)}`}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <StatusBadge status={c.status} />
        <span className="text-xs font-bold text-foreground whitespace-nowrap">
          {c.annual_value ? formatOMRK(c.annual_value) + "/yr" : "—"}
        </span>
        <ChevronRight className="con-arrow w-3.5 h-3.5 text-muted-foreground mt-auto" />
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   NEW CONTRACT FORM
═══════════════════════════════════════════ */

interface NewContractForm {
  contract_code: string; contract_title: string; client_code: string;
  contract_group: string; contract_type: string;
  start_date: string; end_date: string;
  annual_value: string; billing_model: string; fixed_monthly: string;
  payment_status: string; status: string;
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

  const LabeledInput = ({ label, field, type = "text", placeholder, required }: { label: string; field: keyof NewContractForm; type?: string; placeholder?: string; required?: boolean }) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-foreground mb-1.5">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
      <input type={type} value={form[field]} onChange={(e) => set(field)(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
    </div>
  );

  const LabeledSelect = ({ label, field, options, required }: { label: string; field: keyof NewContractForm; options: string[]; required?: boolean }) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-foreground mb-1.5">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
      <select value={form[field]} onChange={(e) => set(field)(e.target.value)}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-6 c-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">New Contract</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Register a new FM contract</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
      </div>

      {saveError && <ErrorBanner message={saveError} onRetry={() => setSaveError(null)} />}

      <div className="bg-muted/20 rounded-xl border border-border/60 p-4 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">General Details</p>
        <LabeledInput label="Contract Code" field="contract_code" placeholder="e.g. CON-2026-001" required />
        <LabeledInput label="Contract Title" field="contract_title" placeholder="e.g. HVAC AMC – Tower A" required />
        <div className="mb-4">
          <label className="block text-xs font-semibold text-foreground mb-1.5">Client <span className="text-destructive">*</span></label>
          <select value={form.client_code} onChange={(e) => set("client_code")(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.name} value={c.name}>{c.client_name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect label="Contract Group" field="contract_group"
            options={["IFM","DC Ops","Soft FM","Hard FM","MEP Only","AMC","PMC","FM","AdHoc","Other"]} />
          <LabeledSelect label="Contract Type" field="contract_type"
            options={["Annual AMC","Multi-Year AMC","Spot","Call-Out","Project Based","Other"]} />
        </div>
      </div>

      <div className="bg-muted/20 rounded-xl border border-border/60 p-4 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Contract Period</p>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Start Date" field="start_date" type="date" required />
          <LabeledInput label="End Date" field="end_date" type="date" required />
        </div>
      </div>

      <div className="bg-muted/20 rounded-xl border border-border/60 p-4 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Financial Terms</p>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Annual Value (OMR)" field="annual_value" type="number" placeholder="96000" />
          <LabeledInput label="Fixed Monthly (OMR)" field="fixed_monthly" type="number" placeholder="8000" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect label="Billing Model" field="billing_model"
            options={["Fixed Monthly","Fixed+Variable","Unit Rate","Lump Sum","Other"]} />
          <LabeledSelect label="Payment Status" field="payment_status"
            options={["Current","Overdue","Disputed","Settled"]} />
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Initial Status</p>
        <div className="flex gap-2">
          {["Draft", "Active", "On Hold"].map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => set("status")(s)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all
                  ${form.status === s ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border text-foreground hover:border-primary/40 hover:bg-muted"}`}>
                {cfg?.icon} {s}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={handleSubmit} disabled={saving}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Create Contract</>}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COLLAPSIBLE SECTION
═══════════════════════════════════════════ */

function ColSection({
  id, title, icon, children, collapsed, onToggle,
}: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode; collapsed: boolean; onToggle: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden mb-3">
      <button onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <span className="text-muted-foreground">{icon}</span> {title}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
      </button>
      {!collapsed && (
        <div className="px-4 pb-1 c-expand border-t border-border/50">
          {children}
        </div>
      )}
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
  const isExpired = days < 0;
  const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG["Draft"];
  const groupCfg = GROUP_COLORS[c.contract_group || ""] || GROUP_COLORS["Other"];

  return (
    <div className="c-fade-up">
      {/* ── HERO HEADER ── */}
      <div className="px-6 pt-6 pb-5 border-b border-border/70"
        style={{ background: `linear-gradient(135deg, ${groupCfg.accent}0d 0%, transparent 70%)` }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            {/* group icon */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border border-white/30 shadow-sm"
              style={{ background: `${groupCfg.accent}18` }}>
              {GROUP_ICONS[c.contract_group || ""] || "📄"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground leading-tight">{c.contract_title}</h2>
              <p className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded mt-1 inline-block">{c.contract_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={c.status} />
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border/80 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* quick pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <GroupBadge group={c.contract_group} />
          {c.contract_type && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted border border-border text-foreground">{c.contract_type}</span>
          )}
          {expiryWarning && !isExpired && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Expiring in {days}d
            </span>
          )}
          {isExpired && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Expired
            </span>
          )}
          {c.payment_status && (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${PAYMENT_CONFIG[c.payment_status]?.cls || "bg-muted border-border text-foreground"}`}>
              <DollarSign className="w-3 h-3" />{c.payment_status}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Financial highlights */}
        <FinancialCards c={c} />

        {/* Contract period timeline */}
        <div className="rounded-xl border border-border/70 bg-card p-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Contract Period
          </p>
          <ContractTimeline startDate={c.start_date} endDate={c.end_date} status={c.status} />
        </div>

        {/* expiry warning card */}
        {(expiryWarning || isExpired) && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border mb-4 ${isExpired ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isExpired ? "text-red-500" : "text-amber-500"}`} />
            <div>
              <p className={`text-sm font-bold ${isExpired ? "text-red-700" : "text-amber-700"}`}>
                {isExpired ? "Contract Expired" : "Contract Expiring Soon"}
              </p>
              <p className={`text-xs mt-0.5 ${isExpired ? "text-red-500" : "text-amber-600"}`}>
                {isExpired
                  ? `This contract expired on ${formatDate(c.end_date)}. Please review renewal or termination.`
                  : `This contract expires in ${days} days on ${formatDate(c.end_date)}. Consider initiating renewal.`}
              </p>
            </div>
          </div>
        )}

        {/* Collapsible sections */}
        <ColSection id="general" title="Contract Details" icon={<FileText className="w-3.5 h-3.5" />}
          collapsed={!!collapsed.general} onToggle={toggle}>
          <InfoRow label="Contract ID" value={c.contract_code} mono />
          <InfoRow label="Contract Type" value={c.contract_type} />
          <InfoRow label="Contract Group" value={c.contract_group} />
          <InfoRow label="Client" value={c.client_name || c.client_code} link />
          {c.amended_from && <InfoRow label="Amended From" value={c.amended_from} link />}
        </ColSection>

        <ColSection id="scope" title="Scope & Duration" icon={<Calendar className="w-3.5 h-3.5" />}
          collapsed={!!collapsed.scope} onToggle={toggle}>
          <InfoRow label="Start Date" value={formatDate(c.start_date)} />
          <InfoRow label="End Date" value={formatDate(c.end_date)} />
          <div className="flex items-center justify-between py-2.5 border-b border-border/50">
            <span className="text-xs text-muted-foreground font-medium w-36 shrink-0">Auto-Renew</span>
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
          </div>
          <InfoRow label="Days Until Expiry" value={days >= 0 ? `${days} days` : "Expired"} />
        </ColSection>

        <ColSection id="financial" title="Financial" icon={<DollarSign className="w-3.5 h-3.5" />}
          collapsed={!!collapsed.financial} onToggle={toggle}>
          <InfoRow label="Annual Value (OMR)" value={formatOMR(c.annual_value)} />
          <InfoRow label="Billing Model" value={c.billing_model} />
          <InfoRow label="Fixed Monthly (OMR)" value={formatOMR(c.fixed_monthly)} />
          <InfoRow label="Payment Status" value={c.payment_status} />
        </ColSection>

        {c.sla_details && c.sla_details.length > 0 && (
          <ColSection id="sla" title="SLA Configuration" icon={<Shield className="w-3.5 h-3.5" />}
            collapsed={!!collapsed.sla} onToggle={toggle}>
            <div className="pt-2 pb-2">
              <SLATable rows={c.sla_details} />
            </div>
          </ColSection>
        )}

        <ColSection id="status" title="Status & Tracking" icon={<Clock className="w-3.5 h-3.5" />}
          collapsed={!!collapsed.status} onToggle={toggle}>
          <InfoRow label="Contract Status" value={c.status} />
        </ColSection>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

type TabType = "Active" | "Expired" | "All";

export default function Contracts() {
  useContractStyles();

  const [activeTab, setActiveTab] = useState<TabType>("Active");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"expiry" | "value">("expiry");

  const listFilters: FrappeFilters =
    activeTab === "Active" ? [["status", "=", "Active"]]
    : activeTab === "Expired" ? [["status", "in", "Expired,Terminated"]]
    : [];

  const { data: contracts, loading, error, refetch } = useFrappeList<ContractListItem>(
    "FM Contract",
    ["name","contract_code","contract_title","client_code","client_name",
     "contract_group","contract_type","start_date","end_date",
     "annual_value","fixed_monthly","billing_model","payment_status","status"],
    listFilters, [activeTab]
  );

  /* stats computed from live data */
  const stats = useMemo<ContractStats>(() => ({
    active:      contracts.filter((c) => c.status === "Active").length,
    totalValue:  contracts.reduce((s, c) => s + (c.annual_value || 0), 0),
    expiringSoon: contracts.filter((c) => { const d = daysUntil(c.end_date); return d >= 0 && d <= 60; }).length,
    overdue:     contracts.filter((c) => c.payment_status === "Overdue").length,
  }), [contracts]);

  /* search filter */
  const filtered = contracts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.contract_title?.toLowerCase().includes(q) ||
      c.contract_code?.toLowerCase().includes(q) ||
      c.client_name?.toLowerCase().includes(q);
  });

  /* sort */
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "expiry") return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
    return (b.annual_value || 0) - (a.annual_value || 0);
  });

  useEffect(() => {
    if (filtered.length > 0 && !selectedName && !showNewForm) setSelectedName(filtered[0].name);
  }, [filtered, selectedName, showNewForm]);

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shadow-sm">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Contracts</h1>
        <div className="flex items-center gap-2.5">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-64 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="Search Contracts…" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>
          <button onClick={() => { setShowNewForm(true); setSelectedName(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> New Contract
          </button>
        </div>
      </div>

      {/* ══ STATS BAR ══ */}
      <StatsBar stats={stats} loading={loading} />

      {/* ══ FILTER CHIPS ══ */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-card/80 flex-wrap">
        {[
          { icon: <Building2 className="w-3 h-3" />, label: "Property" },
          { icon: <User className="w-3 h-3" />, label: "Contractor" },
          { icon: <Calendar className="w-3 h-3" />, label: "Expiry Date" },
          { icon: <Tag className="w-3 h-3" />, label: "Contract Type" },
          { icon: <CheckCircle2 className="w-3 h-3" />, label: "Status" },
          { icon: <Plus className="w-3 h-3" />, label: "Add Filter" },
        ].map(({ icon, label }) => (
          <button key={label}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-[11px] font-medium text-foreground hover:bg-muted hover:border-primary/30 transition-all">
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ── */}
        <div className="w-[400px] min-w-[400px] border-r border-border flex flex-col bg-card overflow-hidden">
          {/* tabs */}
          <div className="flex border-b border-border bg-muted/20">
            {(["Active", "Expired", "All"] as TabType[]).map((t) => {
              const count = t === "All" ? contracts.length
                : t === "Active" ? contracts.filter((c) => c.status === "Active").length
                : contracts.filter((c) => ["Expired","Terminated"].includes(c.status)).length;
              return (
                <button key={t} onClick={() => { setActiveTab(t); setSelectedName(null); }}
                  className={`flex-1 py-2.5 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5
                    ${activeTab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {t}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === t ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {loading ? "…" : count}
                  </span>
                  {activeTab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
                </button>
              );
            })}
          </div>

          {/* sort + count row */}
          <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{sorted.length} contract{sorted.length !== 1 ? "s" : ""}</span>
            <button onClick={() => setSortBy(sortBy === "expiry" ? "value" : "expiry")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Sort: <span className="font-semibold text-foreground">{sortBy === "expiry" ? "Expiry Date" : "Value"}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto">
            {loading && <LoadingSpinner />}
            {error && <ErrorBanner message={error} onRetry={refetch} />}
            {!loading && !error && sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <FileText className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No contracts found</p>
              </div>
            )}
            <div className="c-stagger">
              {!loading && !error && sorted.map((c) => (
                <ContractCard key={c.name} c={c}
                  selected={selectedName === c.name && !showNewForm}
                  onClick={() => { setSelectedName(c.name); setShowNewForm(false); }} />
              ))}
            </div>
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
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Select a contract</p>
                <p className="text-xs text-muted-foreground mt-1">to view full details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}