/**
 * Locations.tsx — Enhanced Edition
 * Facility-UI · Location Hierarchy Module
 *
 * ENHANCEMENTS:
 * ─ Leaflet (OpenStreetMap) map in Property view: pins for every GPS-enabled property
 * ─ Fly-to animation + rich popup on list selection
 * ─ Glassmorphic floating detail card over the map
 * ─ Card-grid overview for Zone / Sub Zone / Base Unit views
 * ─ Compact animated list rows with colour-coded left border
 * ─ Micro-interaction animations via injected keyframes
 * ─ Mini embedded map inside PropertyDetail for precise location visualisation
 * ─ Zero hardcoded data — all from Frappe REST API
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, Plus, MapPin, Building2, Grid3x3, List, X,
  Loader2, AlertCircle, RefreshCw, ChevronRight,
  Camera, Paperclip, Users, QrCode, Layers, Home, Globe,
  Map, Navigation, Edit2, MoreVertical, Check, Wifi,
  Phone, User, FileText, Activity, ChevronDown, Maximize2,
} from "lucide-react";

/* ═══════════════════════════════════════════
   INJECTED STYLES (keyframes + leaflet overrides)
═══════════════════════════════════════════ */

const GLOBAL_CSS = `
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideRight {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes markerBounce {
  0%,100% { transform: translateY(0); }
  40%     { transform: translateY(-8px); }
}
.anim-fade-slide { animation: fadeSlideIn 0.28s cubic-bezier(.4,0,.2,1) both; }
.anim-fade       { animation: fadeIn 0.22s ease both; }
.anim-slide-r    { animation: slideRight 0.25s cubic-bezier(.4,0,.2,1) both; }
.anim-scale      { animation: scaleIn 0.22s cubic-bezier(.4,0,.2,1) both; }
.loc-list-row:hover .loc-row-arrow { opacity: 1; transform: translateX(2px); }
.loc-row-arrow { opacity: 0; transition: opacity .15s, transform .15s; }
.map-pin-pulse::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: inherit;
  opacity: .35;
  animation: ping 1.4s cubic-bezier(0,0,.2,1) infinite;
}
@keyframes ping {
  75%,100% { transform: scale(2); opacity: 0; }
}

/* Leaflet popup overrides */
.leaflet-popup-content-wrapper {
  border-radius: 14px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,.18) !important;
  padding: 0 !important;
  overflow: hidden !important;
  border: 1px solid rgba(255,255,255,.12) !important;
}
.leaflet-popup-content { margin: 0 !important; width: auto !important; }
.leaflet-popup-tip-container { margin-top: -1px; }

/* Custom marker */
.loc-marker-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
.loc-marker-pin {
  width: 32px; height: 32px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 12px rgba(0,0,0,.3);
  border: 2px solid rgba(255,255,255,.8);
  transition: transform .2s, box-shadow .2s;
}
.loc-marker-pin:hover { transform: rotate(-45deg) scale(1.15); box-shadow: 0 6px 20px rgba(0,0,0,.4); }
.loc-marker-pin.selected { animation: markerBounce .5s ease; box-shadow: 0 6px 24px rgba(59,130,246,.6); }
.loc-marker-inner { transform: rotate(45deg); font-size: 13px; }

/* Card grid items */
.loc-card {
  transition: transform .18s cubic-bezier(.4,0,.2,1), box-shadow .18s;
  cursor: pointer;
}
.loc-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.1); }
.loc-card.selected-card { box-shadow: 0 0 0 2px var(--primary-color, #3b82f6), 0 8px 24px rgba(59,130,246,.15); }
`;

function useGlobalStyles() {
  useEffect(() => {
    if (document.getElementById("loc-global-css")) return;
    const s = document.createElement("style");
    s.id = "loc-global-css";
    s.textContent = GLOBAL_CSS;
    document.head.appendChild(s);
  }, []);
}

/* ═══════════════════════════════════════════
   LEAFLET LOADER
═══════════════════════════════════════════ */

interface LeafletLib {
  map: Function; tileLayer: Function; marker: Function; divIcon: Function;
  popup: Function; latLng: Function; latLngBounds: Function;
}

function useLeaflet(): LeafletLib | null {
  const [L, setL] = useState<LeafletLib | null>(null);

  useEffect(() => {
    if ((window as any).L?.version) { setL((window as any).L); return; }

    // CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    // JS
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setL((window as any).L);
      document.head.appendChild(script);
    } else {
      // script already appended but might still loading
      const check = setInterval(() => {
        if ((window as any).L?.version) { setL((window as any).L); clearInterval(check); }
      }, 100);
    }
  }, []);

  return L;
}

/* ═══════════════════════════════════════════
   FRAPPE API HELPERS
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
  const json = await res.json();
  return json.data as T[];
}

async function frappeGetDoc<T>(doctype: string, name: string): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${doctype}/${name} failed: ${res.statusText}`);
  const json = await res.json();
  return json.data as T;
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
  const json = await res.json();
  return json.data as T;
}

function getCsrfToken(): string {
  return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || "";
}

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */

interface City { name: string; city_code: string; city_name: string; country?: string; country_code?: string; region?: string; time_zone?: string; currency?: string; is_active?: 0 | 1; }
interface AreaGroup { name: string; area_group_code: string; area_group_name: string; city_code?: string; city_name?: string; region_manager?: string; is_active?: 0 | 1; }
interface Area { name: string; area_code?: string; area_name: string; area_group_code?: string; area_group_name?: string; city_code?: string; gps_lat?: string; gps_long?: string; is_active?: 0 | 1; }

interface Property {
  name: string; property_code: string; property_name: string;
  property_type?: string; business_type?: string;
  gfa_sqm?: number; floors?: number;
  area_code?: string; area_name?: string; city_code?: string;
  gps_lat?: number; gps_long?: number;
  location_contact?: string; contact_phone?: string;
  client_code?: string; client_name?: string;
  contract_code?: string; is_active?: 0 | 1;
}

interface Zone { name: string; zone_code: string; zone_name: string; property_code: string; property_name?: string; business_type?: string; floor_level?: string; is_active?: 0 | 1; }
interface SubZone { name: string; sub_zone_code: string; sub_zone_name: string; zone_code: string; zone_name?: string; property_code?: string; business_type?: string; is_active?: 0 | 1; }
interface BaseUnit { name: string; base_unit_code: string; base_unit_name: string; sub_zone_code: string; sub_zone_name?: string; zone_code?: string; property_code?: string; business_type?: string; gps_lat?: number; gps_long?: number; qr_code_ref?: string; is_active?: 0 | 1; }

type LocationLevel = "city" | "area_group" | "area" | "property" | "zone" | "sub_zone" | "base_unit";
interface SelectedLocation { level: LocationLevel; name: string; label: string; }

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
   CONFIG
═══════════════════════════════════════════ */

const LEVEL_META: Record<LocationLevel, { label: string; icon: React.ReactNode; color: string; accent: string }> = {
  city: { label: "City", icon: <Globe className="w-4 h-4" />, color: "text-blue-600 bg-blue-50 border-blue-200", accent: "#2563eb" },
  area_group: { label: "Area Group", icon: <Map className="w-4 h-4" />, color: "text-violet-600 bg-violet-50 border-violet-200", accent: "#7c3aed" },
  area: { label: "Area", icon: <Navigation className="w-4 h-4" />, color: "text-teal-600 bg-teal-50 border-teal-200", accent: "#0d9488" },
  property: { label: "Property", icon: <Building2 className="w-4 h-4" />, color: "text-indigo-600 bg-indigo-50 border-indigo-200", accent: "#4f46e5" },
  zone: { label: "Zone", icon: <Layers className="w-4 h-4" />, color: "text-orange-600 bg-orange-50 border-orange-200", accent: "#ea580c" },
  sub_zone: { label: "Sub Zone", icon: <Home className="w-4 h-4" />, color: "text-emerald-600 bg-emerald-50 border-emerald-200", accent: "#059669" },
  base_unit: { label: "Base Unit", icon: <QrCode className="w-4 h-4" />, color: "text-pink-600 bg-pink-50 border-pink-200", accent: "#db2777" },
};

const PROPERTY_TYPE_ICONS: Record<string, string> = {
  Headquarters: "🏛️", Branch: "🏦", "Data Centre": "🖥️",
  Warehouse: "🏭", "Remote ATM Site": "🏧", Office: "🏢",
  "ATM Kiosk": "🏧", Other: "🏢",
};

const PROPERTY_TYPE_COLORS: Record<string, string> = {
  Headquarters: "#f59e0b", Branch: "#3b82f6", "Data Centre": "#8b5cf6",
  Warehouse: "#10b981", "Remote ATM Site": "#f97316", Office: "#6366f1",
  "ATM Kiosk": "#ec4899", Other: "#6b7280",
};

/* ═══════════════════════════════════════════
   SMALL HELPERS / BASE COMPONENTS
═══════════════════════════════════════════ */

function LoadingSpinner({ small }: { small?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${small ? "py-4" : "py-16"}`}>
      <Loader2 className={`animate-spin text-primary ${small ? "w-4 h-4" : "w-6 h-6"}`} />
    </div>
  );
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

function LevelBadge({ level }: { level: LocationLevel }) {
  const m = LEVEL_META[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.color}`}>
      {m.icon} {m.label}
    </span>
  );
}

function ActivePill({ active }: { active?: 0 | 1 | boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function InfoRow({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/60 last:border-0">
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className={`text-sm text-foreground font-medium flex-1 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ENHANCED LIST ROW
═══════════════════════════════════════════ */

interface ListRowProps {
  icon: React.ReactNode;
  code?: string;
  name: string;
  sub?: string;
  active?: 0 | 1 | boolean;
  selected?: boolean;
  onClick: () => void;
  accentColor?: string;
}

function ListRow({ icon, code, name, sub, active, selected, onClick, accentColor }: ListRowProps) {
  return (
    <button onClick={onClick}
      className={`loc-list-row w-full text-left px-4 py-3.5 border-b border-border/50 flex items-center gap-3 transition-all duration-150
        ${selected
          ? "bg-primary/5"
          : "hover:bg-muted/40"
        }`}
      style={selected ? { borderLeft: `3px solid ${accentColor || "#4f46e5"}` } : { borderLeft: "3px solid transparent" }}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${selected ? "bg-primary/15" : "bg-muted"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{name}</p>
        {sub && <p className="text-xs text-muted-foreground truncate mt-0.5 leading-tight">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {code && <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">{code}</span>}
        <span className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-emerald-500" : "bg-gray-300"}`} />
        <ChevronRight className="loc-row-arrow w-3.5 h-3.5 text-muted-foreground" />
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   CARD GRID — for Zone / SubZone / BaseUnit
═══════════════════════════════════════════ */

interface LevelCardProps {
  icon: React.ReactNode;
  code: string;
  name: string;
  sub?: string;
  badge?: string;
  active?: 0 | 1 | boolean;
  selected?: boolean;
  onClick: () => void;
  accentColor: string;
  index: number;
}

function LevelCard({ icon, code, name, sub, badge, active, selected, onClick, accentColor, index }: LevelCardProps) {
  return (
    <button
      onClick={onClick}
      className={`loc-card text-left rounded-xl border bg-card p-4 flex flex-col gap-2.5 ${selected ? "selected-card" : ""}`}
      style={{
        animationDelay: `${index * 40}ms`,
        borderTop: `3px solid ${accentColor}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor}18`, color: accentColor }}>
          {icon}
        </div>
        <ActivePill active={active} />
      </div>
      <div>
        <p className="text-[10px] font-mono text-muted-foreground/70">{code}</p>
        <p className="text-sm font-bold text-foreground leading-tight mt-0.5 line-clamp-2">{name}</p>
      </div>
      {(sub || badge) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
              style={{ color: accentColor, background: `${accentColor}12`, borderColor: `${accentColor}30` }}>
              {badge}
            </span>
          )}
          {sub && <span className="text-[10px] text-muted-foreground truncate">{sub}</span>}
        </div>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════
   LEAFLET MAP VIEW
═══════════════════════════════════════════ */

interface PropertyMapViewProps {
  properties: Property[];
  selected: SelectedLocation | null;
  onSelect: (p: Property) => void;
}

function PropertyMapView({ properties, selected, onSelect }: PropertyMapViewProps) {
  const L = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [mapReady, setMapReady] = useState(false);

  /* init map once */
  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;

    // default center: Middle East (Muscat area) — will be overridden by fitBounds
    const map = (L as any).map(containerRef.current, { zoomControl: true, scrollWheelZoom: true })
      .setView([23.58, 58.38], 7);

    (L as any).tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);
  }, [L]);

  /* build / rebuild markers whenever properties change */
  useEffect(() => {
    if (!mapReady || !L || !mapRef.current) return;

    // remove old markers
    Object.values(markersRef.current).forEach((m: any) => m.remove());
    markersRef.current = {};

    const gpsProps = properties.filter((p) => p.gps_lat && p.gps_long);
    if (gpsProps.length === 0) return;

    const bounds: [number, number][] = [];

    gpsProps.forEach((p) => {
      const color = PROPERTY_TYPE_COLORS[p.property_type || ""] || "#6366f1";
      const emoji = PROPERTY_TYPE_ICONS[p.property_type || ""] || "🏢";

      const icon = (L as any).divIcon({
        className: "",
        html: `
          <div class="loc-marker-wrap" style="width:36px;height:48px;">
            <div class="loc-marker-pin" style="background:${color};">
              <span class="loc-marker-inner">${emoji}</span>
            </div>
          </div>`,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -50],
      });

      const popupHtml = `
        <div style="min-width:220px;font-family:system-ui,sans-serif;">
          <div style="padding:14px 16px 10px;border-bottom:1px solid #f0f0f0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-size:20px;">${emoji}</span>
              <span style="font-size:14px;font-weight:700;color:#111;line-height:1.3;">${p.property_name}</span>
            </div>
            <span style="display:inline-flex;align-items:center;gap:4px;background:${color}18;color:${color};border:1px solid ${color}40;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:600;">
              ${p.property_type || "Property"}
            </span>
          </div>
          <div style="padding:10px 16px;display:flex;flex-direction:column;gap:6px;">
            ${p.area_name ? `<div style="display:flex;gap:6px;font-size:11px;color:#555;"><span>📍</span><span>${p.area_name}${p.city_code ? ` · ${p.city_code}` : ""}</span></div>` : ""}
            ${p.client_name ? `<div style="display:flex;gap:6px;font-size:11px;color:#555;"><span>🏢</span><span>${p.client_name}</span></div>` : ""}
            ${p.gfa_sqm ? `<div style="display:flex;gap:6px;font-size:11px;color:#555;"><span>📐</span><span>${p.gfa_sqm.toLocaleString()} m²${p.floors ? ` · ${p.floors} floors` : ""}</span></div>` : ""}
            <div style="display:flex;gap:6px;font-size:10px;color:#999;font-family:monospace;">
              <span>🌐</span><span>${p.gps_lat?.toFixed(5)}, ${p.gps_long?.toFixed(5)}</span>
            </div>
          </div>
          <div style="padding:8px 16px 14px;">
            <button onclick="window.__locSelect && window.__locSelect('${p.name}')"
              style="width:100%;background:${color};color:#fff;border:none;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer;">
              View Full Details →
            </button>
          </div>
        </div>`;

      const marker = (L as any).marker([p.gps_lat!, p.gps_long!], { icon })
        .bindPopup(popupHtml, { maxWidth: 280 })
        .addTo(mapRef.current);

      marker.on("click", () => onSelect(p));
      markersRef.current[p.name] = marker;
      bounds.push([p.gps_lat!, p.gps_long!]);
    });

    // register global callback for popup button
    (window as any).__locSelect = (name: string) => {
      const p = properties.find((x) => x.name === name);
      if (p) onSelect(p);
    };

    if (bounds.length > 0 && !selected) {
      try { mapRef.current.fitBounds((L as any).latLngBounds(bounds), { padding: [40, 40] }); } catch (_) { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, properties, L]);

  /* fly to selected */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selected) return;
    const marker = markersRef.current[selected.name];
    if (!marker) return;
    mapRef.current.flyTo(marker.getLatLng(), 15, { animate: true, duration: 1 });
    setTimeout(() => marker.openPopup(), 800);

    // pulse selected, reset others
    Object.entries(markersRef.current).forEach(([name, m]: [string, any]) => {
      const el = m.getElement();
      if (el) {
        const pin = el.querySelector(".loc-marker-pin");
        if (pin) pin.classList.toggle("selected", name === selected.name);
      }
    });
  }, [selected, mapReady]);

  /* count props with GPS */
  const withGps = useMemo(() => properties.filter((p) => p.gps_lat && p.gps_long).length, [properties]);
  const noGps = properties.length - withGps;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" style={{ zIndex: 0 }} />

      {!L && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading map…</p>
        </div>
      )}

      {/* legend / stats */}
      {L && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-card/95 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg anim-scale">
          {/* <p className="text-xs font-bold text-foreground mb-1.5">Map Legend</p> */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>{withGps} properties on map</span>
            </div>
            {noGps > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-full bg-gray-300" />
                <span>{noGps} without GPS</span>
              </div>
            )}
          </div>
        </div>
      )}

      {withGps === 0 && L && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="bg-card/90 backdrop-blur border border-border rounded-2xl px-8 py-6 text-center shadow-lg">
            <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No GPS data available</p>
            <p className="text-xs text-muted-foreground mt-1">Add GPS coordinates to properties to see them on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MINI MAP (inside property detail)
═══════════════════════════════════════════ */

function MiniMap({ lat, lng, name, propertyType }: { lat: number; lng: number; name: string; propertyType?: string }) {
  const L = useLeaflet();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!L || !ref.current || mapRef.current) return;

    const map = (L as any).map(ref.current, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false })
      .setView([lat, lng], 15);

    (L as any).tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    const color = PROPERTY_TYPE_COLORS[propertyType || ""] || "#4f46e5";
    const emoji = PROPERTY_TYPE_ICONS[propertyType || ""] || "🏢";
    const icon = (L as any).divIcon({
      className: "",
      html: `<div class="loc-marker-wrap"><div class="loc-marker-pin selected" style="background:${color};"><span class="loc-marker-inner">${emoji}</span></div></div>`,
      iconSize: [36, 48], iconAnchor: [18, 48],
    });

    (L as any).marker([lat, lng], { icon }).addTo(map).bindPopup(name).openPopup();
    mapRef.current = map;
  }, [L, lat, lng, name, propertyType]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 180 }}>
      <div ref={ref} className="w-full h-full" />
      {!L && <div className="absolute inset-0 flex items-center justify-center bg-muted"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
      <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
        target="_blank" rel="noreferrer"
        className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur border border-border rounded-lg p-1.5 hover:bg-white transition-colors shadow-sm"
        title="Open in OpenStreetMap">
        <Maximize2 className="w-3.5 h-3.5 text-foreground" />
      </a>
    </div>
  );
}

/* ═══════════════════════════════════════════
   NEW LOCATION FORM
═══════════════════════════════════════════ */

type NewLocLevel = "property" | "zone" | "sub_zone" | "base_unit" | "city" | "area";

interface NewLocForm {
  level: NewLocLevel; name_field: string; is_active: boolean;
  property_code: string; property_type: string; business_type: string;
  gfa_sqm: string; floors: string; city_code: string; area_name: string;
  gps_lat: string; gps_long: string; location_contact: string; contact_phone: string;
  client_code: string; contract_code: string;
  zone_code: string; property_link: string; floor_level: string;
  sub_zone_code: string; zone_link: string;
  base_unit_code: string; sub_zone_link: string; qr_code_ref: string;
  city_name: string; city_code_field: string; country: string; region: string; time_zone: string;
  area_name_field: string; area_code_field: string; area_group_code: string;
}

const BLANK_LOC: NewLocForm = {
  level: "property", name_field: "", is_active: true,
  property_code: "", property_type: "", business_type: "",
  gfa_sqm: "", floors: "", city_code: "", area_name: "", gps_lat: "", gps_long: "",
  location_contact: "", contact_phone: "", client_code: "", contract_code: "",
  zone_code: "", property_link: "", floor_level: "",
  sub_zone_code: "", zone_link: "",
  base_unit_code: "", sub_zone_link: "", qr_code_ref: "",
  city_name: "", city_code_field: "", country: "", region: "", time_zone: "",
  area_name_field: "", area_code_field: "", area_group_code: "",
};

function NewLocationForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<NewLocForm>(BLANK_LOC);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const set = (k: keyof NewLocForm) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const { data: cities } = useFrappeList<City>("City", ["name", "city_code", "city_name"], [], []);
  const { data: properties } = useFrappeList<Property>("Property", ["name", "property_code", "property_name"], [["is_active", "=", 1]], []);
  const { data: zones } = useFrappeList<Zone>("Zone",
    ["name", "zone_code", "zone_name"],
    form.property_link ? [["property_code", "=", form.property_link], ["is_active", "=", 1]] : [["is_active", "=", 1]],
    [form.property_link]
  );
  const { data: subZones } = useFrappeList<SubZone>("Sub Zone",
    ["name", "sub_zone_code", "sub_zone_name"],
    form.zone_link ? [["zone_code", "=", form.zone_link], ["is_active", "=", 1]] : [],
    [form.zone_link], !form.zone_link
  );
  const { data: clients } = useFrappeList<{ name: string; client_name: string }>("Client", ["name", "client_name"], [], []);

  const handleSubmit = async () => {
    setSaving(true); setSaveError(null);
    try {
      switch (form.level) {
        case "property":
          await frappeCreate("Property", {
            property_code: form.property_code, property_name: form.name_field,
            property_type: form.property_type, business_type: form.business_type,
            gfa_sqm: form.gfa_sqm ? Number(form.gfa_sqm) : undefined,
            floors: form.floors ? Number(form.floors) : undefined,
            gps_lat: form.gps_lat ? Number(form.gps_lat) : undefined,
            gps_long: form.gps_long ? Number(form.gps_long) : undefined,
            location_contact: form.location_contact, contact_phone: form.contact_phone,
            client_code: form.client_code, contract_code: form.contract_code || undefined,
            is_active: form.is_active ? 1 : 0,
          }); break;
        case "zone":
          await frappeCreate("Zone", {
            zone_code: form.zone_code, zone_name: form.name_field,
            property_code: form.property_link, floor_level: form.floor_level,
            business_type: form.business_type, is_active: form.is_active ? 1 : 0,
          }); break;
        case "sub_zone":
          await frappeCreate("Sub Zone", {
            sub_zone_code: form.sub_zone_code, sub_zone_name: form.name_field,
            zone_code: form.zone_link, is_active: form.is_active ? 1 : 0,
          }); break;
        case "base_unit":
          await frappeCreate("Base Unit", {
            base_unit_code: form.base_unit_code, base_unit_name: form.name_field,
            sub_zone_code: form.sub_zone_link, qr_code_ref: form.qr_code_ref,
            gps_lat: form.gps_lat ? Number(form.gps_lat) : undefined,
            gps_long: form.gps_long ? Number(form.gps_long) : undefined,
            is_active: form.is_active ? 1 : 0,
          }); break;
        case "city":
          await frappeCreate("City", {
            city_code: form.city_code_field, city_name: form.city_name,
            country: form.country, region: form.region, time_zone: form.time_zone,
            is_active: form.is_active ? 1 : 0,
          }); break;
      }
      onCreated();
    } catch (e: unknown) { setSaveError((e as Error).message); }
    finally { setSaving(false); }
  };

  const FInput = ({ label, fk, placeholder, type = "text", required }: { label: string; fk: keyof NewLocForm; placeholder?: string; type?: string; required?: boolean }) => (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input type={type} value={String(form[fk])} onChange={(e) => set(fk)(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
    </div>
  );

  const FSelect = ({ label, fk, options, required }: { label: string; fk: keyof NewLocForm; options: { v: string; l: string }[]; required?: boolean }) => (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <select value={String(form[fk])} onChange={(e) => set(fk)(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
        <option value="">Select…</option>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );

  return (
    <div className="h-full flex flex-col anim-fade-slide">
      <div className="px-6 pt-6 pb-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">New Location</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Add a new location to the hierarchy</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["city", "area", "property", "zone", "sub_zone", "base_unit"] as NewLocLevel[]).map((lv) => {
            const m = LEVEL_META[lv as LocationLevel];
            return (
              <button key={lv} onClick={() => set("level")(lv)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all
                  ${form.level === lv ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border text-foreground hover:border-primary/50 hover:bg-muted"}`}>
                {m.icon} {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1">
        {saveError && <ErrorBanner message={saveError} />}

        {form.level !== "city" && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {LEVEL_META[form.level as LocationLevel]?.label} Name <span className="text-destructive">*</span>
            </label>
            <input value={form.name_field} onChange={(e) => set("name_field")(e.target.value)}
              placeholder={`Enter ${LEVEL_META[form.level as LocationLevel]?.label || ""} name…`}
              className="w-full px-0 py-2 border-0 border-b-2 border-primary text-xl font-bold bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/40" />
          </div>
        )}

        <div className="border-2 border-dashed border-border rounded-xl py-7 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer bg-muted/10 mb-4">
          <Camera className="w-5 h-5" />
          <span className="text-xs font-medium">Add or drag pictures</span>
        </div>

        {form.level === "city" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FInput label="City Code" fk="city_code_field" placeholder="e.g. MCT" />
              <FInput label="City Name" fk="city_name" placeholder="e.g. Muscat" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FInput label="Country" fk="country" placeholder="e.g. Oman" />
              <FInput label="Region" fk="region" placeholder="e.g. Middle East" />
            </div>
            <FInput label="Time Zone" fk="time_zone" placeholder="e.g. Asia/Muscat" />
          </>
        )}

        {form.level === "area" && (
          <>
            <FInput label="Area Code" fk="area_code_field" placeholder="e.g. A001" />
            <FInput label="Area Name" fk="area_name_field" placeholder="e.g. Al Khuwair" required />
            <FSelect label="City" fk="city_code" options={cities.map((c) => ({ v: c.name, l: `${c.city_code} — ${c.city_name}` }))} />
            <FInput label="Area Group Code" fk="area_group_code" placeholder="e.g. AG001" />
            <div className="grid grid-cols-2 gap-3">
              <FInput label="GPS Latitude" fk="gps_lat" type="number" placeholder="23.5880" />
              <FInput label="GPS Longitude" fk="gps_long" type="number" placeholder="58.3829" />
            </div>
          </>
        )}

        {form.level === "property" && (
          <>
            <FInput label="Property Code" fk="property_code" placeholder="e.g. P10001" required />
            <FSelect label="Property Type" fk="property_type" required
              options={["Headquarters", "Branch", "Data Centre", "Warehouse", "Remote ATM Site", "Office", "ATM Kiosk", "Other"].map((v) => ({ v, l: v }))} />
            <FSelect label="Business Type" fk="business_type"
              options={["Bank HQ Areas", "Bank Branch Areas", "Bank Staff Areas", "Bank Infrastructure Areas", "Bank ATM Areas", "Data Centre Areas", "Other"].map((v) => ({ v, l: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <FInput label="GFA (sqm)" fk="gfa_sqm" type="number" placeholder="2400" />
              <FInput label="Number of Floors" fk="floors" type="number" placeholder="5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-4">Location Hierarchy</p>
            <FSelect label="City" fk="city_code" options={cities.map((c) => ({ v: c.name, l: `${c.city_code} — ${c.city_name}` }))} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-3">GPS Coordinates</p>
            <div className="grid grid-cols-2 gap-3">
              <FInput label="Latitude" fk="gps_lat" type="number" placeholder="23.5880" />
              <FInput label="Longitude" fk="gps_long" type="number" placeholder="58.3829" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-3">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <FInput label="Location Contact" fk="location_contact" placeholder="Contact name" />
              <FInput label="Phone" fk="contact_phone" placeholder="+968-XXXX-XXXX" type="tel" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-3">Client & Contract</p>
            <FSelect label="Client" fk="client_code" required options={clients.map((c) => ({ v: c.name, l: c.client_name }))} />
            <FInput label="Contract Code" fk="contract_code" placeholder="CON-2026-001" />
          </>
        )}

        {form.level === "zone" && (
          <>
            <FInput label="Zone Code" fk="zone_code" placeholder="e.g. ZN0001" required />
            <FSelect label="Property" fk="property_link" required options={properties.map((p) => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))} />
            <FSelect label="Business Type" fk="business_type"
              options={["Bank HQ Areas", "Bank Branch Areas", "Bank Staff Areas", "Bank Infrastructure Areas", "Bank ATM Areas", "Data Centre Areas", "Other"].map((v) => ({ v, l: v }))} />
            <FInput label="Floor Level" fk="floor_level" placeholder="e.g. G, 1, B1, Roof" />
          </>
        )}

        {form.level === "sub_zone" && (
          <>
            <FInput label="Sub Zone Code" fk="sub_zone_code" placeholder="e.g. SZ0001" required />
            <FSelect label="Property" fk="property_link" options={properties.map((p) => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))} />
            <FSelect label="Zone" fk="zone_link" required options={zones.map((z) => ({ v: z.name, l: `${z.zone_code} — ${z.zone_name}` }))} />
          </>
        )}

        {form.level === "base_unit" && (
          <>
            <FInput label="Base Unit Code" fk="base_unit_code" placeholder="e.g. BU00001" required />
            <FSelect label="Property" fk="property_link" options={properties.map((p) => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))} />
            <FSelect label="Zone" fk="zone_link" options={zones.map((z) => ({ v: z.name, l: `${z.zone_code} — ${z.zone_name}` }))} />
            <FSelect label="Sub Zone" fk="sub_zone_link" required options={subZones.map((s) => ({ v: s.name, l: `${s.sub_zone_code} — ${s.sub_zone_name}` }))} />
            <FInput label="QR Code Reference" fk="qr_code_ref" placeholder="e.g. QR-BU10001" />
            <div className="grid grid-cols-2 gap-3">
              <FInput label="GPS Latitude" fk="gps_lat" type="number" placeholder="23.5880" />
              <FInput label="GPS Longitude" fk="gps_long" type="number" placeholder="58.3829" />
            </div>
          </>
        )}

        <div className="mb-3">
          <label className="block text-xs font-semibold text-foreground mb-1.5">Teams in Charge</label>
          <div className="flex items-center border border-border rounded-lg px-3 py-2 gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <input placeholder="Start typing…" className="flex-1 text-sm bg-transparent focus:outline-none" />
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-foreground mb-1.5">Address</label>
          <input placeholder="Enter address" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
          <textarea rows={3} placeholder="Add a description"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-foreground mb-1.5">Files</label>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted transition-colors">
            <Paperclip className="w-4 h-4" /> Attach files
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6 p-3 bg-muted/30 rounded-lg">
          <label className="text-sm font-semibold text-foreground flex-1">Is Active</label>
          <button onClick={() => set("is_active")(!form.is_active)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${form.is_active ? "border-primary bg-primary" : "border-border"}`}>
            {form.is_active && <Check className="w-3 h-3 text-white" />}
          </button>
        </div>

        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Create {LEVEL_META[form.level as LocationLevel]?.label}</>}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DETAIL PANELS
═══════════════════════════════════════════ */

function SectionHeader({ title }: { title: string }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-5 first:mt-0">{title}</p>;
}

function PropertyDetail({ name, onDrillDown }: { name: string; onDrillDown?: () => void }) {
  const { data: p, loading, error } = useFrappeDoc<Property>("Property", name);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!p) return null;

  const typeColor = PROPERTY_TYPE_COLORS[p.property_type || ""] || "#4f46e5";
  const typeIcon = PROPERTY_TYPE_ICONS[p.property_type || ""] || "🏢";
  const hasGps = !!(p.gps_lat && p.gps_long);

  return (
    <div className="anim-fade-slide">
      {/* hero header */}
      <div className="px-6 pt-6 pb-5 border-b border-border/70"
        style={{ background: `linear-gradient(135deg, ${typeColor}0a 0%, transparent 60%)` }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-white"
              style={{ background: `${typeColor}18` }}>
              {typeIcon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground leading-tight">{p.property_name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <LevelBadge level="property" />
                <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.property_code}</code>
                <ActivePill active={p.is_active} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
              <Edit2 className="w-3 h-3" /> Edit
            </button>
            <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* quick-stat chips */}
        <div className="flex flex-wrap gap-2">
          {p.property_type && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
              style={{ color: typeColor, background: `${typeColor}15`, borderColor: `${typeColor}30` }}>
              <Building2 className="w-3 h-3" /> {p.property_type}
            </span>
          )}
          {p.gfa_sqm && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-foreground">
              📐 {p.gfa_sqm.toLocaleString()} m²
            </span>
          )}
          {p.floors && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-foreground">
              🏗️ {p.floors} {p.floors === 1 ? "Floor" : "Floors"}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-5 space-y-1">
        {/* Map section */}
        {hasGps && (
          <>
            <SectionHeader title="Location on Map" />
            <MiniMap lat={p.gps_lat!} lng={p.gps_long!} name={p.property_name} propertyType={p.property_type} />
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono">{p.gps_lat?.toFixed(6)}, {p.gps_long?.toFixed(6)}</span>
              <a href={`https://www.google.com/maps?q=${p.gps_lat},${p.gps_long}`} target="_blank" rel="noreferrer"
                className="ml-auto text-primary font-semibold hover:underline text-[11px]">Open in Maps →</a>
            </div>
          </>
        )}

        <SectionHeader title="Classification" />
        <div className="bg-muted/20 rounded-xl border border-border/60 px-4 divide-y divide-border/40">
          <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Property Type" value={p.property_type} />
          <InfoRow icon={<Activity className="w-3.5 h-3.5" />} label="Business Type" value={p.business_type} />
          <InfoRow icon={<span className="text-sm">📐</span>} label="GFA" value={p.gfa_sqm ? `${p.gfa_sqm.toLocaleString()} m²` : null} />
          <InfoRow icon={<span className="text-sm">🏗️</span>} label="Floors" value={p.floors ? String(p.floors) : null} />
        </div>

        <SectionHeader title="Area Hierarchy" />
        <div className="bg-muted/20 rounded-xl border border-border/60 px-4 divide-y divide-border/40">
          <InfoRow icon={<Navigation className="w-3.5 h-3.5" />} label="Area" value={p.area_name} />
          <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label="City" value={p.city_code} />
        </div>

        <SectionHeader title="Contact" />
        <div className="bg-muted/20 rounded-xl border border-border/60 px-4 divide-y divide-border/40">
          <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Contact" value={p.location_contact} />
          <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={p.contact_phone} />
        </div>

        <SectionHeader title="Client & Contract" />
        <div className="bg-muted/20 rounded-xl border border-border/60 px-4 divide-y divide-border/40">
          <InfoRow icon={<Users className="w-3.5 h-3.5" />} label="Client" value={p.client_name || p.client_code} />
          <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="Contract" value={p.contract_code} />
        </div>

        {onDrillDown && (
          <div className="mt-6">
            <button onClick={onDrillDown}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all">
              <Layers className="w-4 h-4" /> View Zones in this Property
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ZoneDetail({ name, onDrillDown }: { name: string; onDrillDown?: () => void }) {
  const { data: z, loading, error } = useFrappeDoc<Zone>("Zone", name);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!z) return null;
  const accent = LEVEL_META.zone.accent;
  return (
    <div className="anim-fade-slide px-6 py-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}><Layers className="w-5 h-5" /></div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{z.zone_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <LevelBadge level="zone" />
              <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{z.zone_code}</code>
              <ActivePill active={z.is_active} />
            </div>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border rounded-lg hover:bg-muted transition-colors">
          <Edit2 className="w-3 h-3" /> Edit
        </button>
      </div>
      <div className="bg-muted/20 rounded-xl border border-border/60 px-4 divide-y divide-border/40">
        <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Property" value={z.property_name || z.property_code} />
        <InfoRow icon={<Activity className="w-3.5 h-3.5" />} label="Business Type" value={z.business_type} />
        <InfoRow icon={<span className="text-sm">🏗️</span>} label="Floor Level" value={z.floor_level} />
      </div>
      {onDrillDown && (
        <button onClick={onDrillDown} className="flex items-center gap-2 w-full mt-5 px-4 py-3 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all">
          <Home className="w-4 h-4" /> View Sub Zones <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
      )}
    </div>
  );
}

function SubZoneDetail({ name, onDrillDown }: { name: string; onDrillDown?: () => void }) {
  const { data: s, loading, error } = useFrappeDoc<SubZone>("Sub Zone", name);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!s) return null;
  const accent = LEVEL_META.sub_zone.accent;
  return (
    <div className="anim-fade-slide px-6 py-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}><Home className="w-5 h-5" /></div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{s.sub_zone_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <LevelBadge level="sub_zone" />
              <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{s.sub_zone_code}</code>
              <ActivePill active={s.is_active} />
            </div>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border rounded-lg hover:bg-muted transition-colors">
          <Edit2 className="w-3 h-3" /> Edit
        </button>
      </div>
      <div className="bg-muted/20 rounded-xl border border-border/60 px-4 divide-y divide-border/40">
        <InfoRow icon={<Layers className="w-3.5 h-3.5" />} label="Zone" value={s.zone_name || s.zone_code} />
        <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Property" value={s.property_code} />
        <InfoRow icon={<Activity className="w-3.5 h-3.5" />} label="Business Type" value={s.business_type} />
      </div>
      {onDrillDown && (
        <button onClick={onDrillDown} className="flex items-center gap-2 w-full mt-5 px-4 py-3 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all">
          <QrCode className="w-4 h-4" /> View Base Units <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
      )}
    </div>
  );
}

function BaseUnitDetail({ name }: { name: string }) {
  const { data: b, loading, error } = useFrappeDoc<BaseUnit>("Base Unit", name);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!b) return null;
  const accent = LEVEL_META.base_unit.accent;
  const hasGps = !!(b.gps_lat && b.gps_long);
  return (
    <div className="anim-fade-slide px-6 py-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}><QrCode className="w-5 h-5" /></div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{b.base_unit_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <LevelBadge level="base_unit" />
              <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{b.base_unit_code}</code>
              <ActivePill active={b.is_active} />
            </div>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border rounded-lg hover:bg-muted transition-colors">
          <Edit2 className="w-3 h-3" /> Edit
        </button>
      </div>

      {hasGps && (
        <>
          <SectionHeader title="Location on Map" />
          <MiniMap lat={b.gps_lat!} lng={b.gps_long!} name={b.base_unit_name} />
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-4">
            <Navigation className="w-3.5 h-3.5" />
            <span className="font-mono">{b.gps_lat?.toFixed(6)}, {b.gps_long?.toFixed(6)}</span>
          </div>
        </>
      )}

      <div className="bg-muted/20 rounded-xl border border-border/60 px-4 divide-y divide-border/40">
        <InfoRow icon={<Home className="w-3.5 h-3.5" />} label="Sub Zone" value={b.sub_zone_name || b.sub_zone_code} />
        <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Property" value={b.property_code} />
        <InfoRow icon={<Activity className="w-3.5 h-3.5" />} label="Business Type" value={b.business_type} />
        <InfoRow icon={<QrCode className="w-3.5 h-3.5" />} label="QR Code" value={b.qr_code_ref} mono />
      </div>

      {b.qr_code_ref && (
        <div className="mt-4 p-4 bg-muted/40 rounded-xl flex items-center gap-3 border border-border/60">
          <QrCode className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="text-xs font-semibold text-foreground">QR Code Tag</p>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{b.qr_code_ref}</p>
          </div>
          <Wifi className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CARD GRID OVERVIEW PANEL
═══════════════════════════════════════════ */

type HierarchyView = "property" | "zone" | "sub_zone" | "base_unit";
type AnyLoc = Property | Zone | SubZone | BaseUnit;

interface CardGridOverviewProps {
  items: AnyLoc[];
  level: HierarchyView;
  selected: SelectedLocation | null;
  onSelect: (item: AnyLoc) => void;
}

function CardGridOverview({ items, level, selected, onSelect }: CardGridOverviewProps) {
  const meta = LEVEL_META[level as LocationLevel];

  const getCode = (item: AnyLoc) => {
    if (level === "zone") return (item as Zone).zone_code;
    if (level === "sub_zone") return (item as SubZone).sub_zone_code;
    return (item as BaseUnit).base_unit_code;
  };
  const getName = (item: AnyLoc) => {
    if (level === "zone") return (item as Zone).zone_name;
    if (level === "sub_zone") return (item as SubZone).sub_zone_name;
    return (item as BaseUnit).base_unit_name;
  };
  const getSub = (item: AnyLoc) => {
    if (level === "zone") return (item as Zone).property_name || (item as Zone).property_code;
    if (level === "sub_zone") return (item as SubZone).zone_name || (item as SubZone).zone_code;
    const b = item as BaseUnit;
    return b.sub_zone_name || b.sub_zone_code;
  };
  const getBadge = (item: AnyLoc) => {
    if (level === "zone") return (item as Zone).floor_level ? `Floor ${(item as Zone).floor_level}` : undefined;
    if (level === "base_unit") return (item as BaseUnit).qr_code_ref;
    return undefined;
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-24">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${meta.accent}15`, color: meta.accent }}>
          {meta.icon}
        </div>
        <p className="text-sm font-semibold text-foreground">No {meta.label}s found</p>
        <p className="text-xs text-muted-foreground/70">Try changing your filters or add a new one</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{meta.label}s Overview</p>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-semibold">{items.length} total</span>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 anim-fade">
        {items.map((item, i) => (
          <LevelCard
            key={(item as any).name}
            icon={meta.icon}
            code={getCode(item)}
            name={getName(item)}
            sub={getSub(item)}
            badge={getBadge(item)}
            active={(item as any).is_active}
            selected={selected?.name === (item as any).name}
            onClick={() => onSelect(item)}
            accentColor={meta.accent}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

export default function Locations() {
  useGlobalStyles();

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [hierarchyView, setHierarchyView] = useState<HierarchyView>("property");
  const [selected, setSelected] = useState<SelectedLocation | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [subZoneFilter, setSubZoneFilter] = useState("");
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  /* ── DATA FETCHING ── */
  const { data: properties, loading: pLoading, error: pError, refetch: pRefetch } =
    useFrappeList<Property>("Property",
      ["name", "property_code", "property_name", "property_type", "business_type", "client_name", "area_name", "city_code", "gps_lat", "gps_long", "is_active"],
      [["is_active", "=", 1]], []);

  const { data: zones, loading: zLoading, refetch: zRefetch } =
    useFrappeList<Zone>("Zone",
      ["name", "zone_code", "zone_name", "property_code", "property_name", "floor_level", "business_type", "is_active"],
      propertyFilter ? [["property_code", "=", propertyFilter], ["is_active", "=", 1]] : [["is_active", "=", 1]],
      [propertyFilter], hierarchyView !== "zone" && hierarchyView !== "sub_zone" && hierarchyView !== "base_unit");

  const { data: subZones, loading: szLoading, refetch: szRefetch } =
    useFrappeList<SubZone>("Sub Zone",
      ["name", "sub_zone_code", "sub_zone_name", "zone_code", "zone_name", "property_code", "business_type", "is_active"],
      zoneFilter ? [["zone_code", "=", zoneFilter], ["is_active", "=", 1]] : [["is_active", "=", 1]],
      [zoneFilter], hierarchyView !== "sub_zone" && hierarchyView !== "base_unit");

  const { data: baseUnits, loading: buLoading, refetch: buRefetch } =
    useFrappeList<BaseUnit>("Base Unit",
      ["name", "base_unit_code", "base_unit_name", "sub_zone_code", "sub_zone_name", "property_code", "business_type", "qr_code_ref", "gps_lat", "gps_long", "is_active"],
      subZoneFilter ? [["sub_zone_code", "=", subZoneFilter], ["is_active", "=", 1]] : [["is_active", "=", 1]],
      [subZoneFilter], hierarchyView !== "base_unit");

  const refetchAll = () => { pRefetch(); zRefetch(); szRefetch(); buRefetch(); };

  /* ── DERIVED STATE ── */
  const currentList = useMemo<AnyLoc[]>(() =>
    hierarchyView === "property" ? properties
      : hierarchyView === "zone" ? zones
        : hierarchyView === "sub_zone" ? subZones
          : baseUnits,
    [hierarchyView, properties, zones, subZones, baseUnits]
  );

  const isLoading = hierarchyView === "property" ? pLoading : hierarchyView === "zone" ? zLoading : hierarchyView === "sub_zone" ? szLoading : buLoading;

  const filtered = useMemo(() => {
    if (!search) return currentList;
    const q = search.toLowerCase();
    return currentList.filter((item) => {
      const anyItem = item as AnyLoc & Record<string, any>;
      return Object.values(anyItem).some((v) => typeof v === "string" && v.toLowerCase().includes(q));
    });
  }, [currentList, search]);

  /* ── HELPERS ── */
  const getItemLabel = (item: AnyLoc): string => {
    if (hierarchyView === "property") return (item as Property).property_name;
    if (hierarchyView === "zone") return (item as Zone).zone_name;
    if (hierarchyView === "sub_zone") return (item as SubZone).sub_zone_name;
    return (item as BaseUnit).base_unit_name;
  };

  const getItemCode = (item: AnyLoc): string => {
    if (hierarchyView === "property") return (item as Property).property_code;
    if (hierarchyView === "zone") return (item as Zone).zone_code;
    if (hierarchyView === "sub_zone") return (item as SubZone).sub_zone_code;
    return (item as BaseUnit).base_unit_code;
  };

  const getItemSub = (item: AnyLoc): string => {
    if (hierarchyView === "property") {
      const p = item as Property;
      return [p.property_type, p.area_name, p.city_code].filter(Boolean).join(" · ");
    }
    if (hierarchyView === "zone") {
      const z = item as Zone;
      return [z.property_name || z.property_code, z.floor_level ? `Floor ${z.floor_level}` : ""].filter(Boolean).join(" · ");
    }
    if (hierarchyView === "sub_zone") {
      const s = item as SubZone;
      return s.zone_name || s.zone_code;
    }
    const b = item as BaseUnit;
    return [b.sub_zone_name || b.sub_zone_code, b.qr_code_ref].filter(Boolean).join(" · ");
  };

  const handleSelect = (item: AnyLoc) => {
    const label = getItemLabel(item);
    setSelected({ level: hierarchyView as LocationLevel, name: (item as any).name, label });
    setShowNewForm(false);
    if (hierarchyView === "property") setPropertyFilter((item as any).name);
    if (hierarchyView === "zone") setZoneFilter((item as any).name);
    if (hierarchyView === "sub_zone") setSubZoneFilter((item as any).name);
    setShowDetailPanel(true);
  };

  const meta = LEVEL_META[hierarchyView as LocationLevel];
  const accentColor = meta.accent;

  /* ── RENDER ── */
  return (
    <div className="flex flex-col h-full bg-background">

      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Locations</h1>
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={refetchAll} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-56 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="Search Locations…" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <button onClick={() => { setShowNewForm(true); setSelected(null); setShowDetailPanel(false); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> New Location
          </button>
        </div>
      </div>

      {/* ══ HIERARCHY TABS ══ */}
      <div className="flex items-center gap-1 px-5 py-2.5 border-b border-border bg-card/80">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-2">View:</span>
        {(["property", "zone", "sub_zone", "base_unit"] as HierarchyView[]).map((lv) => {
          const m = LEVEL_META[lv as LocationLevel];
          const isActive = hierarchyView === lv;
          return (
            <button key={lv}
              onClick={() => { setHierarchyView(lv); setSelected(null); setShowDetailPanel(false); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all
                ${isActive ? "text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              style={isActive ? { background: m.accent } : {}}>
              {m.icon} {m.label}
            </button>
          );
        })}

        {/* filter breadcrumbs */}
        {propertyFilter && hierarchyView !== "property" && (
          <div className="ml-3 flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronRight className="w-3 h-3" />
            <span className="bg-muted border border-border px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
              <Building2 className="w-3 h-3" />
              {properties.find((p) => p.name === propertyFilter)?.property_name || propertyFilter}
              <button onClick={() => setPropertyFilter("")} className="hover:text-destructive ml-0.5 transition-colors"><X className="w-3 h-3" /></button>
            </span>
          </div>
        )}
        {zoneFilter && hierarchyView !== "zone" && hierarchyView !== "property" && (
          <div className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronRight className="w-3 h-3" />
            <span className="bg-muted border border-border px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
              <Layers className="w-3 h-3" />
              {zones.find((z) => z.name === zoneFilter)?.zone_name || zoneFilter}
              <button onClick={() => setZoneFilter("")} className="hover:text-destructive ml-0.5 transition-colors"><X className="w-3 h-3" /></button>
            </span>
          </div>
        )}
      </div>

      {/* ══ FILTER CHIPS ══ */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-border/60 bg-background">
        {[
          { icon: <Users className="w-3 h-3" />, label: "Team" },
          { icon: <MapPin className="w-3 h-3" />, label: "City" },
          { icon: <Building2 className="w-3 h-3" />, label: "Property Type" },
        ].map(({ icon, label }) => (
          <button key={label}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground hover:bg-muted hover:border-primary/30 transition-all">
            {icon} {label}
          </button>
        ))}
        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
          <Plus className="w-3 h-3" /> Add Filter
        </button>

        {/* result count */}
        <div className="ml-auto text-xs text-muted-foreground font-medium">
          {filtered.length} {meta.label}{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL — compact list ── */}
        <div className="w-[300px] min-w-[300px] border-r border-border flex flex-col bg-card overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {isLoading && <LoadingSpinner />}
            {pError && <ErrorBanner message={pError} onRetry={refetchAll} />}

            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${accentColor}12`, color: accentColor }}>
                  {meta.icon}
                </div>
                <p className="text-sm font-semibold text-foreground">No {meta.label}s found</p>
                {search && <p className="text-xs text-muted-foreground">Try a different search</p>}
              </div>
            )}

            {!isLoading && filtered.map((item) => {
              const anyItem = item as AnyLoc & { name: string; is_active?: 0 | 1 };
              const isSelected = selected?.name === anyItem.name;
              return (
                <ListRow
                  key={anyItem.name}
                  icon={
                    <span className="text-base">
                      {hierarchyView === "property"
                        ? PROPERTY_TYPE_ICONS[(item as Property).property_type || ""] || "🏢"
                        : <span style={{ color: accentColor }}>{meta.icon}</span>
                      }
                    </span>
                  }
                  code={getItemCode(anyItem)}
                  name={getItemLabel(anyItem)}
                  sub={getItemSub(anyItem)}
                  active={anyItem.is_active}
                  selected={isSelected && !showNewForm}
                  onClick={() => handleSelect(item)}
                  accentColor={accentColor}
                />
              );
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-hidden flex flex-col bg-background">
          {showNewForm ? (
            <div className="flex-1 overflow-y-auto">
              <NewLocationForm onClose={() => setShowNewForm(false)} onCreated={() => { setShowNewForm(false); refetchAll(); }} />
            </div>
          ) : hierarchyView === "property" ? (
            /* ── PROPERTY: MAP + floating detail card ── */
            <div className="relative flex-1 overflow-hidden">
              <PropertyMapView
                properties={properties}
                selected={selected}
                onSelect={(p) => {
                  setSelected({ level: "property", name: p.name, label: p.property_name });
                  setShowDetailPanel(true);
                }}
              />

              {/* floating detail card */}
              {selected && showDetailPanel && (
                <div className="absolute top-4 right-4 bottom-4 w-[360px] bg-card/97 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col anim-scale z-[999]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Property Details</span>
                    <button onClick={() => { setShowDetailPanel(false); }}
                      className="p-1 rounded-lg hover:bg-muted transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <PropertyDetail name={selected.name}
                      onDrillDown={() => { setHierarchyView("zone"); setShowDetailPanel(false); setSelected(null); }} />
                  </div>
                </div>
              )}

              {/* no-selection hint (only when detail is closed) */}
              {(!selected || !showDetailPanel) && (
                <div className="absolute bottom-4 right-4 z-[999] bg-card/90 backdrop-blur border border-border rounded-xl px-4 py-3 shadow-lg anim-scale pointer-events-none">
                  <p className="text-xs font-semibold text-foreground">Click a pin to view details</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">or select from the list on the left</p>
                </div>
              )}
            </div>
          ) : (
            /* ── ZONE / SUB ZONE / BASE UNIT: card grid + detail slide ── */
            <div className="flex-1 flex overflow-hidden">
              {/* card grid */}
              <div className={`overflow-y-auto transition-all ${selected && showDetailPanel ? "flex-1" : "flex-1"}`}>
                {isLoading
                  ? <LoadingSpinner />
                  : <CardGridOverview items={filtered} level={hierarchyView} selected={selected} onSelect={handleSelect} />
                }
              </div>

              {/* detail side panel */}
              {selected && showDetailPanel && (
                <div className="w-[360px] min-w-[360px] border-l border-border bg-card overflow-y-auto anim-slide-r">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-card/80 sticky top-0 z-10 backdrop-blur">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{meta.label} Details</span>
                    <button onClick={() => setShowDetailPanel(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  {selected.level === "zone" && (
                    <ZoneDetail name={selected.name}
                      onDrillDown={() => { setHierarchyView("sub_zone"); setShowDetailPanel(false); setSelected(null); }} />
                  )}
                  {selected.level === "sub_zone" && (
                    <SubZoneDetail name={selected.name}
                      onDrillDown={() => { setHierarchyView("base_unit"); setShowDetailPanel(false); setSelected(null); }} />
                  )}
                  {selected.level === "base_unit" && <BaseUnitDetail name={selected.name} />}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}