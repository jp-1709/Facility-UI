/**
 * Scheduler.tsx
 * Facility-UI — Technician Scheduler (Gantt Dispatch View)
 * Dark-themed Gantt grid. Week view with work orders per technician per day.
 * Data fetched from Frappe (PPM Schedule + Work Order + Technician).
 * WO card click opens detail modal with SLA metrics.
 */

import { useState, useCallback, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Search, Bell, HelpCircle,
  X, CheckCircle2, XCircle, AlertTriangle, Clock, Menu,
  ChevronDown, Calendar as CalIcon, Loader2,
} from "lucide-react";

/* ═══════════════════════════════════════════
   FRAPPE API
═══════════════════════════════════════════ */

const FRAPPE_BASE = "";
type FF = [string, string, string | number][];

async function frappeGet<T>(doctype: string, fields: string[], filters: FF = [], limit = 200): Promise<T[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit),
  });
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${doctype}: ${res.statusText}`);
  return (await res.json()).data as T[];
}

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */

interface Technician {
  name: string; technician_name?: string; full_name?: string;
  role?: string; capacity_hours?: number; status?: string;
  avatar_color?: string;
}

interface WorkOrder {
  name: string; subject?: string; description?: string;
  status: string; priority?: string;
  scheduled_date?: string; start_time?: string;
  estimated_hours?: number;
  assigned_to?: string; technician?: string;
  property?: string; location?: string;
  asset?: string; asset_name?: string;
}

interface PPMSchedule {
  name: string; schedule_name: string; ppm_id?: string;
  status: string; frequency: string;
  next_run_date: string; last_run_date?: string;
  assigned_technician?: string; assigned_to?: string;
  property?: string; property_name?: string;
  asset_code?: string; asset_name?: string;
  service_category?: string; service_group?: string;
  planned_duration?: number; overdue_days?: number;
  client_name?: string; contract_code?: string;
}

interface SRUnassigned {
  name: string; sr_title?: string; subject?: string;
  fault_category?: string; property_name?: string; property_code?: string;
  reported_by?: string; contact_phone?: string;
  priority_actual?: string; raised_date?: string; raised_time?: string;
  status: string; wo_source?: string;
}

/* ═══════════════════════════════════════════
   WEEK HELPERS
═══════════════════════════════════════════ */

function getWeekStart(d: Date): Date {
  const s = new Date(d);
  const day = s.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday-based
  s.setDate(s.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function dateKey(d: Date): string { return d.toISOString().split("T")[0]; }

function isToday(d: Date): boolean {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

/* ═══════════════════════════════════════════
   COLOUR PALETTE — per technician (cycles)
═══════════════════════════════════════════ */

const TECH_COLORS = [
  { bg: "bg-[#22c4a0]", border: "border-[#1aab8b]", text: "text-[#022b24]", avatar: "bg-[#22c4a0]" },
  { bg: "bg-[#a855f7]", border: "border-[#9333ea]", text: "text-white",      avatar: "bg-[#a855f7]" },
  { bg: "bg-[#f59e0b]", border: "border-[#d97706]", text: "text-[#1c1009]",  avatar: "bg-[#f59e0b]" },
  { bg: "bg-[#ec4899]", border: "border-[#db2777]", text: "text-white",      avatar: "bg-[#ec4899]" },
  { bg: "bg-[#22d3ee]", border: "border-[#06b6d4]", text: "text-[#042428]",  avatar: "bg-[#22d3ee]" },
  { bg: "bg-[#84cc16]", border: "border-[#65a30d]", text: "text-[#0f1a02]",  avatar: "bg-[#84cc16]" },
];

function techColor(idx: number) { return TECH_COLORS[idx % TECH_COLORS.length]; }

const PRIORITY_CFG: Record<string, { bg: string; text: string; label: string }> = {
  "P1 - Critical": { bg: "bg-red-500",    text: "text-white",       label: "P1 – Urgent"  },
  "P2 - High":     { bg: "bg-orange-500", text: "text-white",       label: "P2 – Urgent"  },
  "P3 - Medium":   { bg: "bg-blue-500",   text: "text-white",       label: "P3"           },
  "P4 - Low":      { bg: "bg-gray-500",   text: "text-white",       label: "P4"           },
};

const WO_STATUS_CFG: Record<string, { bg: string; text: string }> = {
  Open:         { bg: "bg-emerald-600",   text: "text-white" },
  "In Progress":{ bg: "bg-blue-600",      text: "text-white" },
  Completed:    { bg: "bg-gray-600",      text: "text-white" },
  Cancelled:    { bg: "bg-red-700",       text: "text-white" },
};

/* ═══════════════════════════════════════════
   WORK ORDER DETAIL MODAL (Image 4)
═══════════════════════════════════════════ */

interface WOModalProps {
  wo: WorkOrder;
  onClose: () => void;
}

function WODetailModal({ wo, onClose }: WOModalProps) {
  const pc = PRIORITY_CFG[wo.priority || ""] || PRIORITY_CFG["P3 - Medium"];
  const sc = WO_STATUS_CFG[wo.status] || WO_STATUS_CFG["Open"];

  const timeline = [
    { time: "09:00", label: "Request raised — SLA clock started",    color: "border-gray-500" },
    { time: "10:00", label: "First response by " + (wo.assigned_to || "Technician"), color: "border-emerald-500" },
    { time: "11:00", label: `Work Order created: ${wo.name}`,         color: "border-violet-500" },
    { time: "12:00", label: "On-site assessment completed — work started", color: "border-amber-500" },
  ];

  const checklistItems = [
    { done: true,  label: "Filter condition checked" },
    { done: true,  label: "Coil visual inspection" },
    { done: true,  label: "Refrigerant pressure logged" },
    { done: false, label: "Belt tension verified" },
    { done: false, label: "Drain pan cleaned" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[#0f1117] border border-[#2a2d3a] rounded-2xl shadow-2xl fade-in">
        {/* modal header */}
        <div className="px-7 pt-6 pb-4 border-b border-[#2a2d3a]">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-bold text-blue-400">{wo.name}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${pc.bg} ${pc.text}`}>{pc.label}</span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${sc.bg} ${sc.text}`}>{wo.status}</span>
            <button onClick={onClose} className="ml-auto p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-white">{wo.subject || wo.description || "Work Order"}</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            {wo.location && <span className="flex items-center gap-1">📍 {wo.location}</span>}
            {wo.start_time && <span className="flex items-center gap-1">🕐 Raised: {wo.start_time}</span>}
          </div>
        </div>

        <div className="px-7 py-5 grid grid-cols-2 gap-8">
          {/* LEFT — description + timeline */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Description</p>
            <div className="bg-[#1a1d27] rounded-lg p-3 text-sm text-gray-300 leading-relaxed mb-5">
              {wo.description || "Quarterly chiller PPM — refrigerant check, oil levels, belts"}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#1a1d27] rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Raised</p>
                <p className="text-sm font-semibold text-white">{wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"} {wo.start_time || "09:00"}</p>
              </div>
              <div className="bg-[#1a1d27] rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Assignee</p>
                <p className="text-sm font-semibold text-white">{wo.assigned_to || wo.technician || "—"}</p>
              </div>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Activity Timeline</p>
            <div className="flex flex-col gap-0">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-2 ${t.color} bg-[#0f1117] mt-0.5 shrink-0`} />
                    {i < timeline.length - 1 && <div className="w-px h-7 bg-[#2a2d3a]" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-[11px] text-gray-500">Today {t.time}</p>
                    <p className="text-xs text-gray-300">{t.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — SLA + checklist */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">SLA Metrix Panel</p>

            {/* First Response */}
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">First Response</p>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-base font-bold text-emerald-400">Met</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-[#0f1117] rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Target</p>
                  <p className="text-sm font-bold text-white">2 hrs</p>
                </div>
                <div className="bg-[#0f1117] rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Actual</p>
                  <p className="text-sm font-bold text-white">42 min</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-400">✓ 1hr 18min early</span>
            </div>

            {/* Resolution */}
            <div className="bg-[#2a1a1a] border border-red-900/40 rounded-xl p-4 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Resolution</p>
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-base font-bold text-red-400">Breach</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-[#0f1117] rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Target</p>
                  <p className="text-sm font-bold text-white">6 hrs</p>
                </div>
                <div className="bg-[#0f1117] rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Actual</p>
                  <p className="text-sm font-bold text-white">18hr 45min</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-900/30 rounded-full px-2.5 py-0.5 w-fit">
                <AlertTriangle className="w-3 h-3" /> 12hr 45min overdue
              </span>
            </div>

            {/* Score */}
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-400 mb-3">Gold SLA — 2hr Response / 6hr Resolution</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-2xl font-bold text-red-400">1</p><p className="text-[10px] text-gray-500">Met</p></div>
                <div><p className="text-2xl font-bold text-red-400">1</p><p className="text-[10px] text-gray-500">Breach</p></div>
                <div><p className="text-2xl font-bold text-emerald-400">50%</p><p className="text-[10px] text-gray-500">Score</p></div>
              </div>
            </div>

            {/* Checklist */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Checklist Items</p>
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-3 flex flex-col gap-2">
              {checklistItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0
                    ${item.done ? "bg-blue-600 border-blue-600" : "border-gray-600 bg-transparent"}`}>
                    {item.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-xs ${item.done ? "text-gray-300" : "text-gray-500"}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   WORK ORDER CARD (in Gantt cell)
═══════════════════════════════════════════ */

function WOCard({
  wo, colorCfg, onClick,
}: { wo: WorkOrder; colorCfg: (typeof TECH_COLORS)[0]; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-lg p-2 mb-1 last:mb-0 ${colorCfg.bg} hover:opacity-90 transition-opacity`}>
      {wo.start_time && (
        <p className={`text-[10px] font-bold ${colorCfg.text} opacity-80`}>{wo.start_time}</p>
      )}
      <p className={`text-[11px] font-bold ${colorCfg.text}`}>{wo.name}</p>
      <p className={`text-[11px] ${colorCfg.text} opacity-90 truncate leading-tight`}>{wo.subject || wo.description}</p>
    </button>
  );
}

/* PPM card */
function PPMCard({ ppm, colorCfg, onClick }: { ppm: PPMSchedule; colorCfg: (typeof TECH_COLORS)[0]; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-lg p-2 mb-1 last:mb-0 ${colorCfg.bg} hover:opacity-90 transition-opacity`}>
      <p className={`text-[11px] font-bold ${colorCfg.text}`}>{ppm.ppm_id || ppm.name}</p>
      <p className={`text-[11px] ${colorCfg.text} opacity-90 truncate`}>{ppm.schedule_name}</p>
    </button>
  );
}

/* ═══════════════════════════════════════════
   CAPACITY BAR
═══════════════════════════════════════════ */

function CapacityBar({ used, total, isOverloaded }: { used: number; total: number; isOverloaded: boolean }) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  return (
    <div className="flex items-center justify-between px-2 py-1 border-b border-[#2a2d3a]">
      <span className={`text-[10px] font-semibold ${isOverloaded ? "text-red-400" : "text-gray-400"}`}>
        {used}/{total}h
      </span>
      <div className="flex-1 mx-2 h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOverloaded ? "bg-red-500" : pct > 75 ? "bg-amber-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-semibold ${isOverloaded ? "text-red-400" : "text-gray-400"}`}>
        {pct}%{isOverloaded && " ▲"}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

const DEMO_TECHNICIANS: Technician[] = [
  { name: "raj-mehta",      full_name: "Raj Mehta",      role: "HVAC Tech",     capacity_hours: 8, status: "Available" },
  { name: "sunita-rao",     full_name: "Sunita Rao",     role: "Plumbing",      capacity_hours: 8, status: "On Job"    },
  { name: "arjun-nair",     full_name: "Arjun Nair",     role: "Electrical",    capacity_hours: 8, status: "Available" },
  { name: "priya-shah",     full_name: "Priya Shah",     role: "Security / IT", capacity_hours: 8, status: "On Job"    },
  { name: "mohammed-ali",   full_name: "Mohammed Ali",   role: "Soft Services", capacity_hours: 8, status: "Available" },
];

type ViewMode = "Job Requests" | "Call Tasks";

export default function Scheduler() {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("Job Requests");
  const [selectedWO, setSelectedWO] = useState<WorkOrder | PPMSchedule | null>(null);
  const [modalType, setModalType] = useState<"wo" | "ppm">("wo");

  /* fetch PPM schedules for the current week */
  const weekEnd = addDays(weekStart, 6);
  const { data: ppms, loading: ppmLoading } = useFetchData<PPMSchedule>(
    "PPM Schedule",
    ["name", "schedule_name", "ppm_id", "status", "frequency", "next_run_date",
      "last_run_date", "assigned_technician", "assigned_to", "property", "property_name",
      "asset_code", "asset_name", "service_group", "planned_duration", "overdue_days"],
    [["next_run_date", "between", [dateKey(weekStart), dateKey(weekEnd)]]]
  );

  const { data: workOrders, loading: woLoading } = useFetchData<WorkOrder>(
    "Work Order",
    ["name", "subject", "description", "status", "priority", "scheduled_date",
      "start_time", "estimated_hours", "assigned_to", "technician", "property", "location", "asset_name"],
    [["scheduled_date", "between", [dateKey(weekStart), dateKey(weekEnd)]]]
  );

  const { data: unassignedSRs } = useFetchData<SRUnassigned>(
    "Service Request",
    ["name", "sr_title", "fault_category", "property_name", "property_code",
      "reported_by", "priority_actual", "raised_date", "raised_time", "status", "wo_source"],
    [["status", "=", "Open"], ["converted_to_wo", "=", 0]]
  );

  /* build day columns */
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  /* map WOs / PPMs by technician + day */
  type DayMap = Record<string, (WorkOrder | PPMSchedule)[]>;
  const scheduleMap: Record<string, DayMap> = {};

  (viewMode === "Job Requests" ? workOrders : ppms).forEach((item) => {
    const dateField = (item as WorkOrder).scheduled_date || (item as PPMSchedule).next_run_date;
    const tech = (item as WorkOrder).assigned_to || (item as PPMSchedule).assigned_technician || "unassigned";
    if (!scheduleMap[tech]) scheduleMap[tech] = {};
    if (!scheduleMap[tech][dateField]) scheduleMap[tech][dateField] = [];
    scheduleMap[tech][dateField].push(item);
  });

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToday = () => setWeekStart(getWeekStart(new Date()));

  const techInitials = (name?: string) =>
    (name || "??").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  /* ── PRIORITY DOT for unassigned requests ── */
  const PRIORITY_DOT: Record<string, string> = {
    "P1 - Critical": "bg-red-500", "P2 - High": "bg-orange-500",
    "P3 - Medium": "bg-blue-500", "P4 - Low": "bg-gray-400",
  };

  const weekLabel = `Week of ${fmtDay(weekStart)}–${fmtDay(addDays(weekStart, 6))} ${weekStart.getFullYear()}`;

  return (
    <div className="flex flex-col h-full bg-[#0b0d13] text-gray-100 overflow-hidden">
      {/* ══ TOP NAV BAR ══ */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-[#1e2130] bg-[#0f1117] shrink-0">
        <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
          <Menu className="w-5 h-5 text-gray-400" />
        </button>
        <span className="text-sm font-semibold text-gray-300 border-l border-[#2a2d3a] pl-4">Technician Scheduler</span>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input placeholder="Search requests, assets, WOs…"
            className="pl-9 pr-4 py-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-600 w-64" />
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-500 transition-colors">
          <Plus className="w-4 h-4" /> New Request
        </button>
        <button className="p-2 hover:bg-white/10 rounded-lg"><Bell className="w-4 h-4 text-gray-400" /></button>
        <button className="p-2 hover:bg-white/10 rounded-lg"><HelpCircle className="w-4 h-4 text-gray-400" /></button>
      </div>

      {/* ══ SCHEDULER HEADER ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2130] bg-[#0f1117] shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Technician Scheduler</h1>
          <p className="text-xs text-gray-500 mt-0.5">Gantt dispatch view · {weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* view toggle */}
          <div className="flex bg-[#1a1d27] border border-[#2a2d3a] rounded-lg overflow-hidden">
            {(["Job Requests", "Call Tasks"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${viewMode === v ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                {v}
              </button>
            ))}
          </div>
          {/* dropdowns */}
          {["General Shift", "All Resources", "All Properties"].map((label) => (
            <button key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-xs text-gray-300 hover:border-gray-500 transition-colors">
              {label} <ChevronDown className="w-3.5 h-3.5" />
            </button>
          ))}
          <button className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-colors">Go</button>
        </div>
      </div>

      {/* ══ GANTT BODY ══ */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: "1000px" }}>
          {/* ── COLUMN HEADERS ── */}
          <thead>
            <tr className="bg-[#0f1117] sticky top-0 z-20">
              {/* week nav + technician header */}
              <th className="w-[180px] min-w-[180px] px-3 py-2 text-left border-r border-[#2a2d3a] border-b border-b-[#2a2d3a]">
                <div className="flex items-center gap-1">
                  <button onClick={prevWeek} className="p-1 hover:bg-white/10 rounded transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button onClick={goToday} className="text-[11px] font-semibold text-gray-400 hover:text-white transition-colors px-1">Today</button>
                  <button onClick={nextWeek} className="p-1 hover:bg-white/10 rounded transition-colors">
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5">Technician / Capacity</p>
              </th>
              {days.map((day, i) => (
                <th key={i} className={`px-2 py-2 text-center border-r border-[#2a2d3a] border-b border-b-[#2a2d3a] min-w-[160px]
                  ${isToday(day) ? "bg-[#1a2236]" : ""}`}>
                  <p className={`text-sm font-bold ${isToday(day) ? "text-blue-400" : "text-gray-300"}`}>
                    {DAY_LABELS[i]} {("0" + day.getDate()).slice(-2)} {day.toLocaleDateString("en-GB", { month: "short" })}
                  </p>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {DEMO_TECHNICIANS.map((tech, techIdx) => {
              const color = techColor(techIdx);
              const techSchedule = scheduleMap[tech.name] || scheduleMap[tech.full_name || ""] || {};
              const totalHoursUsed = Object.values(techSchedule).reduce((sum, items) => sum + items.length * 1.5, 0);
              const isOverloaded = totalHoursUsed > (tech.capacity_hours || 8);

              return (
                <tr key={tech.name} className="border-b border-[#1e2130]">
                  {/* technician info cell */}
                  <td className="w-[180px] min-w-[180px] align-top border-r border-[#2a2d3a] bg-[#0f1117] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-9 h-9 rounded-full ${color.avatar} flex items-center justify-center text-xs font-bold text-[#0f1117] shrink-0`}>
                        {techInitials(tech.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{tech.full_name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{tech.role} · {tech.capacity_hours}hrs/day</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${tech.status === "On Job" ? "bg-amber-400" : "bg-emerald-400"}`} />
                      <span className="text-[10px] text-gray-500">{tech.status}</span>
                    </div>
                  </td>

                  {/* day cells */}
                  {days.map((day, dayIdx) => {
                    const dk = dateKey(day);
                    const items = techSchedule[dk] || [];
                    const dayHours = items.length * 1.5;
                    const dayOverloaded = dayHours > (tech.capacity_hours || 8);
                    return (
                      <td key={dayIdx} className={`align-top border-r border-[#2a2d3a] p-0 ${isToday(day) ? "bg-[#111827]" : "bg-[#0b0d13]"}`}>
                        <CapacityBar used={dayHours} total={tech.capacity_hours || 8} isOverloaded={dayOverloaded} />
                        <div className="p-1.5 min-h-[80px]">
                          {items.length === 0 && (
                            <div className="h-16 rounded-lg border border-dashed border-[#2a2d3a] flex items-center justify-center">
                              <span className="text-[10px] text-gray-700">Drop here</span>
                            </div>
                          )}
                          {items.map((item, idx) =>
                            viewMode === "Job Requests" ? (
                              <WOCard key={idx} wo={item as WorkOrder} colorCfg={color}
                                onClick={() => { setSelectedWO(item); setModalType("wo"); }} />
                            ) : (
                              <PPMCard key={idx} ppm={item as PPMSchedule} colorCfg={color}
                                onClick={() => { setSelectedWO(item); setModalType("ppm"); }} />
                            )
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {(ppmLoading || woLoading) && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
            <span className="text-sm text-gray-500">Loading schedules…</span>
          </div>
        )}

        {/* ══ UN-ASSIGNED REQUESTS PANEL ══ */}
        <div className="mx-4 my-4 bg-[#0f1117] border border-[#2a2d3a] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2d3a]">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-sm font-bold text-white">Un-Assigned Requests</span>
              <span className="px-2 py-0.5 rounded-full bg-[#2a2d3a] text-xs font-semibold text-gray-300">
                {unassignedSRs.length} pending
              </span>
            </div>
            <span className="text-xs text-gray-600 italic">Drag to scheduler grid · Click to assign</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2d3a]">
                  {["Request No", "Category", "Building", "Contact", "Role Required", "Priority", "Due Date", "Created", "Status", "Action"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unassignedSRs.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-600">No unassigned requests</td>
                  </tr>
                )}
                {unassignedSRs.map((sr, i) => {
                  const isUrgent = sr.priority_actual === "P1 - Critical";
                  const dotClass = PRIORITY_DOT[sr.priority_actual || ""] || "bg-gray-400";
                  return (
                    <tr key={sr.name} className={`border-b border-[#1e2130] hover:bg-[#1a1d27] transition-colors ${i === unassignedSRs.length - 1 ? "border-b-0" : ""}`}>
                      <td className="px-4 py-3 font-semibold text-blue-400 cursor-pointer hover:underline">{sr.name}</td>
                      <td className="px-4 py-3 text-gray-300">{sr.fault_category || "—"}</td>
                      <td className="px-4 py-3 text-gray-300">{sr.property_name || sr.property_code || "—"}</td>
                      <td className="px-4 py-3 text-gray-300">{sr.reported_by || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">—</td>
                      <td className="px-4 py-3">
                        <span className={`w-7 h-7 rounded-full ${dotClass} flex items-center justify-center text-white font-bold text-[10px]`}>
                          {sr.priority_actual?.split(" - ")[0] || "?"}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${isUrgent ? "text-red-400" : "text-gray-300"}`}>
                        {sr.raised_date ? new Date(sr.raised_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                        {isUrgent && " — TODAY"}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {sr.raised_date ? `${new Date(sr.raised_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ${sr.raised_time || ""}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isUrgent ? "bg-red-600 text-white" : "bg-[#2a2d3a] text-gray-400"}`}>
                          {isUrgent ? "URGENT" : "Unassigned"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                          ${isUrgent ? "bg-red-600 hover:bg-red-500 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>
                          {isUrgent ? "Assign NOW" : "Assign →"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══ WO DETAIL MODAL ══ */}
      {selectedWO && modalType === "wo" && (
        <WODetailModal wo={selectedWO as WorkOrder} onClose={() => setSelectedWO(null)} />
      )}
      {selectedWO && modalType === "ppm" && (
        <WODetailModal
          wo={{
            name: (selectedWO as PPMSchedule).ppm_id || (selectedWO as PPMSchedule).name,
            subject: (selectedWO as PPMSchedule).schedule_name,
            description: `${(selectedWO as PPMSchedule).frequency} PPM — ${(selectedWO as PPMSchedule).asset_name || ""}`,
            status: (selectedWO as PPMSchedule).status,
            scheduled_date: (selectedWO as PPMSchedule).next_run_date,
            assigned_to: (selectedWO as PPMSchedule).assigned_technician,
          }}
          onClose={() => setSelectedWO(null)}
        />
      )}
    </div>
  );
}

/* ─── tiny hook wrapper (avoids duplication) ─── */
function useFetchData<T>(doctype: string, fields: string[], filters: FF) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try { setData(await frappeGet<T>(doctype, fields, filters)); }
    catch { setData([]); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctype]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}
