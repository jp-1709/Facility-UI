/**
 * Assets.tsx — Enhanced Edition
 * Facility-UI · CFAM Asset module
 *
 * ENHANCEMENTS:
 * ─ Live stats bar (Total / Active / Under Repair / Critical) from API data
 * ─ Animated compact asset cards with status-coded left border & category icon
 * ─ Property group headers — collapsible with count badges
 * ─ Detail hero with category gradient, quick-stat chips, asset image
 * ─ Visual PPM maintenance timeline (Last → Today → Next)
 * ─ Work Order history as a vertical timeline
 * ─ Warranty expiry visual alert card
 * ─ Advanced CSS keyframe animations & micro-interactions
 * ─ Zero hardcoded data — all from Frappe REST API
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Plus, Filter, MapPin, ChevronDown, ChevronRight,
  MoreVertical, Pencil, X, Loader2, AlertCircle, RefreshCw,
  Camera, Zap, Shield, Wrench, Thermometer, Droplets,
  Server, Building2, AlertTriangle, CheckCircle, Clock,
  Activity, Package, TrendingUp, ChevronLeft,
} from "lucide-react";

/* ═══════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════ */

const ASSET_CSS = `
@keyframes assetFadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes assetSlideR {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes assetPulse {
  0%,100% { opacity: 1; }
  50%      { opacity: .5; }
}
@keyframes progressFill {
  from { width: 0%; }
  to   { width: var(--target-w); }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.a-fade-up   { animation: assetFadeUp 0.26s cubic-bezier(.4,0,.2,1) both; }
.a-slide-r   { animation: assetSlideR 0.22s cubic-bezier(.4,0,.2,1) both; }
.a-stagger > * { animation: assetFadeUp 0.26s cubic-bezier(.4,0,.2,1) both; }
.a-stagger > *:nth-child(1)  { animation-delay: 0ms; }
.a-stagger > *:nth-child(2)  { animation-delay: 40ms; }
.a-stagger > *:nth-child(3)  { animation-delay: 80ms; }
.a-stagger > *:nth-child(4)  { animation-delay: 120ms; }
.a-stagger > *:nth-child(5)  { animation-delay: 160ms; }
.asset-card-row { transition: background .14s; }
.asset-card-row:hover .asset-arrow { opacity: 1; transform: translateX(3px); }
.asset-arrow { opacity: 0; transition: opacity .14s, transform .14s; }
.stat-shimmer {
  background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,.12) 50%,transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 2.5s ease infinite;
}
.ppm-bar-fill { animation: progressFill .9s cubic-bezier(.4,0,.2,1) forwards; }
`;

function useAssetStyles() {
  useEffect(() => {
    if (document.getElementById("asset-css")) return;
    const s = document.createElement("style");
    s.id = "asset-css";
    s.textContent = ASSET_CSS;
    document.head.appendChild(s);
  }, []);
}

/* ═══════════════════════════════════════════
   FRAPPE API HELPERS  (unchanged)
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
   TYPES  (unchanged)
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
   HOOKS  (unchanged)
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
   COLOUR / ICON MAPS  (unchanged)
═══════════════════════════════════════════ */

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; border: string; glow: string }> = {
  Active:         { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", border: "#10b981", glow: "#10b98120" },
  Inactive:       { bg: "bg-gray-100",   text: "text-gray-500",    dot: "bg-gray-400",    border: "#9ca3af", glow: "#9ca3af15" },
  Decommissioned: { bg: "bg-red-100",    text: "text-red-600",     dot: "bg-red-400",     border: "#ef4444", glow: "#ef444415" },
  "Under Repair": { bg: "bg-amber-100",  text: "text-amber-700",   dot: "bg-amber-500",   border: "#f59e0b", glow: "#f59e0b20" },
  Scrap:          { bg: "bg-red-50",     text: "text-red-400",     dot: "bg-red-300",     border: "#fca5a5", glow: "#fca5a510" },
};

const CRITICALITY_CFG: Record<string, { cls: string; dot: string }> = {
  Critical: { cls: "bg-red-100 text-red-700 border border-red-200",    dot: "#ef4444" },
  High:     { cls: "bg-orange-100 text-orange-700 border border-orange-200", dot: "#f97316" },
  Medium:   { cls: "bg-amber-100 text-amber-700 border border-amber-200",   dot: "#f59e0b" },
  Low:      { cls: "bg-gray-100 text-gray-600 border border-gray-200",      dot: "#9ca3af" },
};

const CAT_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  MEP:                { icon: <Thermometer className="w-5 h-5" />, color: "#0ea5e9", bg: "#0ea5e915" },
  "Banking Equipment":{ icon: <Building2 className="w-5 h-5" />,  color: "#10b981", bg: "#10b98115" },
  "IT Infrastructure":{ icon: <Server className="w-5 h-5" />,     color: "#8b5cf6", bg: "#8b5cf615" },
  Civil:              { icon: <Building2 className="w-5 h-5" />,   color: "#78716c", bg: "#78716c15" },
  Safety:             { icon: <Shield className="w-5 h-5" />,      color: "#ef4444", bg: "#ef444415" },
  HVAC:               { icon: <Thermometer className="w-5 h-5" />, color: "#06b6d4", bg: "#06b6d415" },
  Plumbing:           { icon: <Droplets className="w-5 h-5" />,    color: "#3b82f6", bg: "#3b82f615" },
  Electrical:         { icon: <Zap className="w-5 h-5" />,         color: "#f59e0b", bg: "#f59e0b15" },
  Security:           { icon: <Shield className="w-5 h-5" />,      color: "#dc2626", bg: "#dc262615" },
  Other:              { icon: <Wrench className="w-5 h-5" />,      color: "#6b7280", bg: "#6b728015" },
};

function getCatCfg(masterCat?: string, cat?: string) {
  if (cat) for (const k of Object.keys(CAT_ICONS)) if (cat.toLowerCase().includes(k.toLowerCase())) return CAT_ICONS[k];
  if (masterCat && CAT_ICONS[masterCat]) return CAT_ICONS[masterCat];
  return { icon: <Package className="w-5 h-5" />, color: "#6b7280", bg: "#6b728015" };
}

const WO_STATUS_CFG: Record<string, { cls: string; dot: string }> = {
  Open:        { cls: "bg-emerald-100 text-emerald-700", dot: "#10b981" },
  "In Progress":{ cls: "bg-blue-100 text-blue-700",      dot: "#3b82f6" },
  Completed:   { cls: "bg-gray-100 text-gray-500",       dot: "#9ca3af" },
  Cancelled:   { cls: "bg-red-100 text-red-600",         dot: "#ef4444" },
};

function isWarrantyExpired(expiry?: string) { return !!expiry && new Date(expiry) < new Date(); }
function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateShort(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/* ═══════════════════════════════════════════
   BASE UI HELPERS
═══════════════════════════════════════════ */

function LoadingSpinner({ small }: { small?: boolean }) {
  return <div className={`flex items-center justify-center ${small ? "py-4" : "py-14"}`}><Loader2 className={`animate-spin text-primary ${small ? "w-4 h-4" : "w-6 h-6"}`} /></div>;
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
  const c = STATUS_CFG[status] || STATUS_CFG["Inactive"];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} /> {status}
    </span>
  );
}

function CriticalityBadge({ criticality }: { criticality: string }) {
  const c = CRITICALITY_CFG[criticality] || CRITICALITY_CFG["Low"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />{criticality}
    </span>
  );
}

function InfoRow({ label, value, link, warn, mono }: { label: string; value?: string | null; link?: boolean; warn?: boolean; mono?: boolean }) {
  if (!value) return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-sm text-muted-foreground/50">—</span>
    </div>
  );
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      {link
        ? <span className="text-sm text-primary font-medium cursor-pointer hover:underline">{value}</span>
        : <span className={`text-sm font-semibold ${warn ? "text-red-600" : "text-foreground"} ${mono ? "font-mono text-xs" : ""}`}>{value}</span>}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden mb-4">
      <div className="px-4 py-2.5 border-b border-border/50 flex items-center gap-2 bg-muted/20">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STATS BAR
═══════════════════════════════════════════ */

interface AssetStats { total: number; active: number; underRepair: number; critical: number; }

function StatsBar({ stats, loading }: { stats: AssetStats; loading: boolean }) {
  const items = [
    { label: "Total Assets",  value: stats.total,       icon: <Package className="w-4 h-4" />,       color: "#6366f1", bg: "#6366f115" },
    { label: "Active",        value: stats.active,       icon: <CheckCircle className="w-4 h-4" />,    color: "#10b981", bg: "#10b98115" },
    { label: "Under Repair",  value: stats.underRepair,  icon: <Wrench className="w-4 h-4" />,         color: "#f59e0b", bg: "#f59e0b15" },
    { label: "Critical",      value: stats.critical,     icon: <AlertTriangle className="w-4 h-4" />,  color: "#ef4444", bg: "#ef444415" },
  ];

  return (
    <div className="flex items-stretch border-b border-border bg-card a-stagger">
      {items.map(({ label, value, icon, color, bg }) => (
        <div key={label} className="flex-1 flex items-center gap-3 px-5 py-3 border-r border-border/50 last:border-r-0 relative overflow-hidden">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10" style={{ background: bg, color }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin opacity-50" /> : icon}
          </div>
          <div className="relative z-10">
            <p className="text-xl font-bold text-foreground leading-none">{loading ? "—" : value}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ASSET CARD (left list)
═══════════════════════════════════════════ */

function AssetCard({ a, selected, onClick, ppm }: { a: AssetListItem; selected: boolean; onClick: () => void; ppm?: PPMInfo }) {
  const catCfg = getCatCfg(a.asset_master_category, a.asset_category);
  const statusCfg = STATUS_CFG[a.asset_status] || STATUS_CFG["Inactive"];
  const warrantyWarn = isWarrantyExpired(a.warranty_expiry);

  return (
    <button
      onClick={onClick}
      className={`asset-card-row w-full text-left px-4 py-3.5 border-b border-border/60 flex gap-3 transition-all
        ${selected ? "bg-primary/5" : "hover:bg-muted/30"}`}
      style={{ borderLeft: `3px solid ${selected ? statusCfg.border : "transparent"}` }}
    >
      {/* icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative"
        style={{ background: catCfg.bg, color: catCfg.color }}>
        {a.asset_image
          ? <img src={a.asset_image} className="w-10 h-10 rounded-xl object-cover" alt="" />
          : catCfg.icon}
        {/* status dot */}
        <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${statusCfg.dot}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{a.asset_name}</p>
        <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{a.asset_code}</p>
        {(a.property_name || a.property_code) && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 truncate">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            {[a.property_name || a.property_code, a.zone_code].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <StatusBadge status={a.asset_status} />
          {warrantyWarn && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-600">
              <AlertTriangle className="w-2.5 h-2.5" /> Warranty
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <CriticalityBadge criticality={a.criticality} />
        {ppm?.next_run_date && (
          <span className="text-[9px] text-muted-foreground mt-auto whitespace-nowrap">
            Next PM: {formatDateShort(ppm.next_run_date)}
          </span>
        )}
        <ChevronRight className="asset-arrow w-3.5 h-3.5 text-muted-foreground mt-auto" />
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   PPM MAINTENANCE TIMELINE
═══════════════════════════════════════════ */

function PPMTimeline({ ppm, installDate }: { ppm?: PPMInfo; installDate?: string }) {
  if (!ppm?.last_run_date && !ppm?.next_run_date) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>No PPM schedule configured</span>
      </div>
    );
  }

  const last = ppm.last_run_date ? new Date(ppm.last_run_date).getTime() : null;
  const next = ppm.next_run_date ? new Date(ppm.next_run_date).getTime() : null;
  const now = Date.now();

  let progress = 50;
  if (last && next) {
    const total = next - last;
    const elapsed = now - last;
    progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  const daysToNext = next ? Math.ceil((next - now) / 86_400_000) : null;
  const overdue = daysToNext !== null && daysToNext < 0;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2 text-[10px] font-semibold text-muted-foreground">
        <span>Last PM</span>
        <span className={overdue ? "text-red-500 font-bold" : daysToNext !== null && daysToNext <= 7 ? "text-amber-600 font-bold" : ""}>
          {daysToNext !== null
            ? overdue ? `Overdue by ${Math.abs(daysToNext)}d` : `Next PM in ${daysToNext}d`
            : ""}
        </span>
        <span>Next PM</span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className="ppm-bar-fill absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            "--target-w": `${progress}%`,
            width: `${progress}%`,
            background: overdue ? "#ef4444" : progress > 80 ? "#f59e0b" : "#10b981",
          } as React.CSSProperties}
        />
        {/* Today marker */}
        <div className="absolute top-0 h-full w-0.5 bg-foreground/40 rounded-full" style={{ left: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
        <span>{formatDate(ppm.last_run_date)}</span>
        <span className="bg-muted px-2 py-0.5 rounded-full">Today</span>
        <span className={overdue ? "text-red-500" : ""}>{formatDate(ppm.next_run_date)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   WORK ORDER TIMELINE
═══════════════════════════════════════════ */

function WOTimeline({ workOrders }: { workOrders: WOHistoryItem[] }) {
  if (workOrders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
        <Activity className="w-6 h-6" />
        <p className="text-xs">No work orders found</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* vertical line */}
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
      <div className="flex flex-col gap-0 a-stagger">
        {workOrders.map((wo) => {
          const cfg = WO_STATUS_CFG[wo.status || ""] || { cls: "bg-muted text-muted-foreground", dot: "#9ca3af" };
          return (
            <div key={wo.name} className="flex gap-3 group pl-1 pb-4 last:pb-0">
              {/* dot */}
              <div className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center shrink-0 mt-0.5 z-10"
                style={{ background: cfg.dot }}>
                <span className="w-2 h-2 rounded-full bg-white" />
              </div>
              {/* content */}
              <div className="flex-1 bg-muted/30 rounded-xl border border-border/50 px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary hover:underline cursor-pointer">{wo.name}</p>
                    <p className="text-xs text-foreground mt-0.5 line-clamp-1">{wo.subject || wo.description || "—"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {wo.status && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${cfg.cls}`}>{wo.status}</span>
                    )}
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                      {wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
  const [step, setStep] = useState(0);
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
      const doc = await frappeCreate<AssetListItem>("CFAM Asset", { ...form, purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : undefined });
      onCreated(doc.name);
    } catch (e: unknown) { setSaveError((e as Error).message); }
    finally { setSaving(false); }
  };

  const Inp = ({ label, fk, type = "text", placeholder, required }: { label: string; fk: keyof NewAssetForm; type?: string; placeholder?: string; required?: boolean }) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-foreground mb-1.5">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
      <input type={type} value={form[fk]} onChange={(e) => set(fk)(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
    </div>
  );

  const Sel = ({ label, fk, opts, required }: { label: string; fk: keyof NewAssetForm; opts: { v: string; l: string }[]; required?: boolean }) => (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-foreground mb-1.5">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
      <select value={form[fk]} onChange={(e) => set(fk)(e.target.value)}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
        <option value="">Select…</option>
        {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );

  const STEPS = ["Identity", "Location", "Lifecycle", "Client"];

  return (
    <div className="max-w-2xl mx-auto py-6 px-6 a-fade-up">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">New Asset</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Add a new asset to the register</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
      </div>

      {/* step indicator */}
      <div className="flex items-center gap-0 mb-6 rounded-xl overflow-hidden border border-border">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            className={`flex-1 py-2 text-xs font-semibold text-center transition-all border-r border-border last:border-r-0
              ${step === i ? "bg-primary text-primary-foreground" : step > i ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}>
            <span className="mr-1 opacity-60">{i + 1}.</span>{s}
          </button>
        ))}
      </div>

      {saveError && <ErrorBanner message={saveError} onRetry={() => setSaveError(null)} />}

      {/* Step 0 — Identity */}
      {step === 0 && (
        <div className="a-fade-up">
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Asset Code" fk="asset_code" placeholder="AST-001" required />
            <Inp label="Asset Name" fk="asset_name" placeholder="Chiller Unit A" required />
          </div>
          <Sel label="Master Category" fk="asset_master_category" required
            opts={Object.keys(CAT_ICONS).map((v) => ({ v, l: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Asset Category" fk="asset_category" placeholder="e.g. Air Handling Unit" required />
            <Inp label="Asset Sub Category" fk="asset_sub_category" placeholder="e.g. Chiller" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Inp label="Manufacturer" fk="make_brand" placeholder="e.g. Carrier" />
            <Inp label="Model" fk="model" placeholder="e.g. 30XA-500" />
            <Inp label="Serial No" fk="serial_number" placeholder="SN-XXXXXXX" />
          </div>
          <div className="mb-4 border-2 border-dashed border-border rounded-xl py-7 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 cursor-pointer transition-colors bg-muted/10">
            <Camera className="w-5 h-5" />
            <span className="text-xs">Attach or drag photo here</span>
          </div>
        </div>
      )}

      {/* Step 1 — Location */}
      {step === 1 && (
        <div className="a-fade-up">
          <Sel label="Property" fk="property_code" required
            opts={properties.map((p) => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))} />
          <Sel label="Zone" fk="zone_code"
            opts={zones.map((z) => ({ v: z.name, l: `${z.zone_code} — ${z.zone_name}` }))} />
          <Sel label="Sub Zone" fk="sub_zone_code"
            opts={subZones.map((s) => ({ v: s.name, l: `${s.sub_zone_code} — ${s.sub_zone_name}` }))} />
          <Inp label="Base Unit Code" fk="base_unit_code" placeholder="e.g. BU-00001" />
          <Inp label="Service Group" fk="service_group_code" placeholder="MEP, Civil, IT…" />
        </div>
      )}

      {/* Step 2 — Lifecycle */}
      {step === 2 && (
        <div className="a-fade-up">
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Installation Date" fk="installation_date" type="date" />
            <Inp label="Warranty Expiry" fk="warranty_expiry" type="date" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Purchase Cost (OMR)" fk="purchase_cost" type="number" placeholder="25000" />
            <Sel label="Criticality" fk="criticality" required
              opts={["Critical", "High", "Medium", "Low"].map((v) => ({ v, l: v }))} />
          </div>
          <Sel label="Asset Status" fk="asset_status" required
            opts={["Active", "Inactive", "Decommissioned", "Under Repair", "Scrap"].map((v) => ({ v, l: v }))} />
        </div>
      )}

      {/* Step 3 — Client */}
      {step === 3 && (
        <div className="a-fade-up">
          <Sel label="Client" fk="client_code" required
            opts={clients.map((c) => ({ v: c.name, l: c.client_name }))} />
        </div>
      )}

      {/* navigation */}
      <div className="flex items-center gap-3 mt-6">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(step + 1)}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
            Next: {STEPS[step + 1]} <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Create Asset</>}
          </button>
        )}
      </div>
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
    assetName ? [["cfam_asset", "=", assetName]] : [], [assetName], !assetName
  );
  const { data: workOrders } = useFrappeList<WOHistoryItem>(
    "Work Order", ["name", "subject", "status", "scheduled_date", "creation"],
    assetName ? [["asset", "=", assetName]] : [], [assetName], !assetName
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!a) return null;

  const ppm = ppms[0];
  const catCfg = getCatCfg(a.asset_master_category, a.asset_category);
  const statusCfg = STATUS_CFG[a.asset_status] || STATUS_CFG["Inactive"];
  const warrantyExpired = isWarrantyExpired(a.warranty_expiry);

  return (
    <div className="a-fade-up">
      {/* hero header */}
      <div className="px-6 pt-6 pb-5 border-b border-border/70"
        style={{ background: `linear-gradient(135deg, ${catCfg.bg} 0%, ${statusCfg.glow} 60%, transparent 100%)` }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            {/* asset icon / image */}
            <div className="w-14 h-14 rounded-2xl border border-white/50 shadow-sm flex items-center justify-center shrink-0"
              style={{ background: catCfg.bg, color: catCfg.color }}>
              {a.asset_image
                ? <img src={a.asset_image} className="w-14 h-14 rounded-2xl object-cover" alt="" />
                : <span className="scale-150">{catCfg.icon}</span>}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground leading-tight">{a.asset_name}</h2>
              <p className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded mt-1 inline-block">{a.asset_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border/80 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* quick-stat chips */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={a.asset_status} />
          <CriticalityBadge criticality={a.criticality} />
          {a.asset_master_category && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
              style={{ color: catCfg.color, background: catCfg.bg, borderColor: `${catCfg.color}30` }}>
              {catCfg.icon} {a.asset_master_category}
            </span>
          )}
          {a.asset_category && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted border border-border text-foreground">
              {a.asset_category}
            </span>
          )}
          {warrantyExpired && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-600 border border-red-200">
              <AlertTriangle className="w-3 h-3" /> Warranty Expired
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Location */}
        <SectionCard title="Location" icon={<MapPin className="w-3.5 h-3.5" />}>
          <InfoRow label="Property" value={a.property_name || a.property_code} link />
          <InfoRow label="Zone" value={a.zone_code} />
          <InfoRow label="Sub Zone" value={a.sub_zone_code} />
          <InfoRow label="Base Unit" value={a.base_unit_code} />
        </SectionCard>

        {/* Make & Model */}
        <SectionCard title="Make & Model" icon={<Package className="w-3.5 h-3.5" />}>
          <InfoRow label="Manufacturer" value={a.make_brand} />
          <InfoRow label="Model" value={a.model} />
          <InfoRow label="Serial No" value={a.serial_number} mono />
        </SectionCard>

        {/* Lifecycle */}
        <SectionCard title="Lifecycle & Finance" icon={<TrendingUp className="w-3.5 h-3.5" />}>
          <InfoRow label="Install Date" value={formatDate(a.installation_date)} />
          <InfoRow
            label="Warranty Expiry"
            value={warrantyExpired ? `${formatDate(a.warranty_expiry)} — Expired` : formatDate(a.warranty_expiry)}
            warn={warrantyExpired}
          />
          <InfoRow label="Purchase Cost" value={a.purchase_cost ? `OMR ${a.purchase_cost.toLocaleString()}` : null} />
          <InfoRow label="Service Group" value={a.service_group_code} />
          <InfoRow label="Client" value={a.client_code} link />
        </SectionCard>

        {/* warranty expired card */}
        {warrantyExpired && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-4 a-fade-up">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">Warranty Expired</p>
              <p className="text-xs text-red-500 mt-0.5">
                Warranty expired on {formatDate(a.warranty_expiry)}. Consider renewal or asset replacement.
              </p>
            </div>
          </div>
        )}

        {/* PPM Maintenance */}
        <SectionCard title="Maintenance Schedule" icon={<Clock className="w-3.5 h-3.5" />}>
          <PPMTimeline ppm={ppm} installDate={a.installation_date} />
        </SectionCard>

        {/* Work Order History */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Work Order History</p>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-semibold">{workOrders.length} total</span>
          </div>
          <WOTimeline workOrders={workOrders} />
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
  useAssetStyles();

  const [tab, setTab] = useState<AssetTab>("All Assets");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedProp, setExpandedProp] = useState<string | null>("All Properties");

  const tabFilters: FrappeFilters =
    tab === "Building Assets" ? [] :
    tab === "Unit Assets" ? [] : [];

  const { data: assets, loading, error, refetch } = useFrappeList<AssetListItem>(
    "CFAM Asset",
    ["name","asset_code","asset_name","asset_master_category","asset_category",
     "property_code","property_name","zone_code","sub_zone_code","base_unit_code",
     "asset_status","criticality","client_code","make_brand","model",
     "installation_date","warranty_expiry","asset_image","service_group_code"],
    tabFilters, [tab]
  );

  const { data: ppms } = useFrappeList<{ cfam_asset: string; last_run_date?: string; next_run_date?: string }>(
    "PPM Schedule", ["cfam_asset","last_run_date","next_run_date"], [], []
  );

  const ppmMap: Record<string, PPMInfo> = {};
  ppms.forEach((p) => { if (p.cfam_asset) ppmMap[p.cfam_asset] = p; });

  /* stats computed from live data */
  const stats = useMemo<AssetStats>(() => ({
    total:       assets.length,
    active:      assets.filter((a) => a.asset_status === "Active").length,
    underRepair: assets.filter((a) => a.asset_status === "Under Repair").length,
    critical:    assets.filter((a) => a.criticality === "Critical").length,
  }), [assets]);

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
    <div className="flex flex-col h-full bg-background">

      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight shrink-0">Assets</h1>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-full focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="Search Assets…" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { icon: <Filter className="w-3 h-3" />, label: "Asset Type" },
              { icon: <Building2 className="w-3 h-3" />, label: "Property" },
              { icon: <Activity className="w-3 h-3" />, label: "Status" },
              { icon: <Package className="w-3 h-3" />, label: "Category" },
            ].map(({ icon, label }) => (
              <button key={label} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border text-[11px] font-medium text-foreground hover:bg-muted hover:border-primary/30 transition-all">
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => { setShowNewForm(true); setSelectedName(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> New Asset
          </button>
        </div>
      </div>

      {/* ══ STATS BAR ══ */}
      <StatsBar stats={stats} loading={loading} />

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ── */}
        <div className="w-[360px] min-w-[360px] border-r border-border flex flex-col bg-card overflow-hidden">
          {/* tabs */}
          <div className="flex border-b border-border bg-muted/20">
            {(["All Assets", "Building Assets", "Unit Assets"] as AssetTab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-all whitespace-nowrap px-1 relative
                  ${tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
                {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
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
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border hover:bg-muted/60 transition-colors">
                  <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3" />{allKey}</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-muted border border-border px-2 py-0.5 rounded-full text-[10px] font-semibold text-foreground">{filtered.length}</span>
                    {expandedProp === allKey ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {expandedProp === allKey && Object.keys(grouped).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Package className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No assets found</p>
                  </div>
                )}

                {expandedProp === allKey && Object.entries(grouped).map(([propName, propAssets]) => (
                  <div key={propName} className="a-stagger">
                    {Object.keys(grouped).length > 1 && (
                      <div className="px-4 py-2 bg-muted/10 border-b border-border/50 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {propName}
                        </span>
                        <span className="text-[10px] bg-muted border border-border px-1.5 py-0.5 rounded-full font-semibold text-muted-foreground">{propAssets.length}</span>
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
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Package className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Select an asset</p>
                <p className="text-xs text-muted-foreground mt-1">to view full details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}