/**
 * Locations.tsx
 * Facility-UI — Location Hierarchy module
 * Hierarchy: City → Area Group → Area → Property → Zone → Sub Zone → Base Unit
 * Dynamic data from Frappe REST API.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, MapPin, Building2, Grid3x3, List, X,
  Loader2, AlertCircle, RefreshCw, ChevronRight, ChevronDown,
  Camera, Paperclip, Users, QrCode, Layers, Home, Globe,
  Map, Navigation, Edit2, MoreVertical, Check, Wifi,
} from "lucide-react";

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
   TYPES — one per Frappe doctype
═══════════════════════════════════════════ */

interface City {
  name: string; city_code: string; city_name: string;
  country?: string; country_code?: string; region?: string;
  time_zone?: string; currency?: string; is_active?: 0 | 1;
}

interface AreaGroup {
  name: string; area_group_code: string; area_group_name: string;
  city_code?: string; city_name?: string; region_manager?: string; is_active?: 0 | 1;
}

interface Area {
  name: string; area_code?: string; area_name: string;
  area_group_code?: string; area_group_name?: string;
  city_code?: string; gps_lat?: string; gps_long?: string; is_active?: 0 | 1;
}

interface Property {
  name: string; property_code: string; property_name: string;
  property_type?: string; business_type?: string;
  gfa_sqm?: number; floors?: number;
  area_name?: string; city_code?: string;
  gps_lat?: number; gps_long?: number;
  location_contact?: string; contact_phone?: string;
  client_code?: string; client_name?: string;
  contract_code?: string; is_active?: 0 | 1;
}

interface Zone {
  name: string; zone_code: string; zone_name: string;
  property_code: string; property_name?: string;
  business_type?: string; floor_level?: string; is_active?: 0 | 1;
}

interface SubZone {
  name: string; sub_zone_code: string; sub_zone_name: string;
  zone_code: string; zone_name?: string;
  property_code?: string; business_type?: string; is_active?: 0 | 1;
}

interface BaseUnit {
  name: string; base_unit_code: string; base_unit_name: string;
  sub_zone_code: string; sub_zone_name?: string;
  zone_code?: string; property_code?: string;
  business_type?: string;
  gps_lat?: number; gps_long?: number;
  qr_code_ref?: string; is_active?: 0 | 1;
}

/* union for selected item */
type LocationLevel = "city" | "area_group" | "area" | "property" | "zone" | "sub_zone" | "base_unit";
interface SelectedLocation {
  level: LocationLevel;
  name: string;
  label: string;
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
   HIERARCHY CONFIG
═══════════════════════════════════════════ */

const LEVEL_META: Record<LocationLevel, { label: string; icon: React.ReactNode; color: string }> = {
  city:       { label: "City",       icon: <Globe className="w-4 h-4" />,      color: "text-blue-600 bg-blue-50" },
  area_group: { label: "Area Group", icon: <Map className="w-4 h-4" />,         color: "text-violet-600 bg-violet-50" },
  area:       { label: "Area",       icon: <Navigation className="w-4 h-4" />,  color: "text-teal-600 bg-teal-50" },
  property:   { label: "Property",   icon: <Building2 className="w-4 h-4" />,   color: "text-primary bg-primary/10" },
  zone:       { label: "Zone",       icon: <Layers className="w-4 h-4" />,      color: "text-orange-600 bg-orange-50" },
  sub_zone:   { label: "Sub Zone",   icon: <Home className="w-4 h-4" />,        color: "text-emerald-600 bg-emerald-50" },
  base_unit:  { label: "Base Unit",  icon: <QrCode className="w-4 h-4" />,      color: "text-pink-600 bg-pink-50" },
};

const PROPERTY_TYPE_ICONS: Record<string, string> = {
  Headquarters: "🏛️", Branch: "🏦", "Data Centre": "🖥️",
  Warehouse: "🏭", "Remote ATM Site": "🏧", Other: "🏢",
};

/* ═══════════════════════════════════════════
   SMALL HELPERS
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
    <div className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg m-3">
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="text-xs font-semibold text-destructive underline">Retry</button>}
    </div>
  );
}

function LevelBadge({ level }: { level: LocationLevel }) {
  const m = LEVEL_META[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.color}`}>
      {m.icon} {m.label}
    </span>
  );
}

function ActiveDot({ active }: { active?: 0 | 1 | boolean }) {
  return (
    <span className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-emerald-500" : "bg-gray-300"}`} />
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground font-medium w-36 shrink-0">{label}</span>
      <span className={`text-sm text-foreground font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LIST ITEM ROW
═══════════════════════════════════════════ */

interface ListRowProps {
  icon: React.ReactNode;
  code?: string;
  name: string;
  sub?: string;
  active?: 0 | 1 | boolean;
  selected?: boolean;
  onClick: () => void;
  gridView?: boolean;
}

function ListRow({ icon, code, name, sub, active, selected, onClick, gridView }: ListRowProps) {
  if (gridView) {
    return (
      <button onClick={onClick}
        className={`text-left p-4 rounded-xl border transition-all hover:shadow-sm hover:border-primary/30
          ${selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
          <ActiveDot active={active} />
        </div>
        {code && <p className="text-[10px] font-mono text-muted-foreground mb-0.5">{code}</p>}
        <p className="text-sm font-semibold text-foreground leading-tight truncate">{name}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
      </button>
    );
  }
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border flex items-center gap-3 transition-colors
        ${selected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40"}`}>
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        {sub && <p className="text-xs text-muted-foreground truncate mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {code && <span className="text-[10px] font-mono text-muted-foreground">{code}</span>}
        <ActiveDot active={active} />
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   NEW LOCATION FORM
═══════════════════════════════════════════ */

type NewLocLevel = "property" | "zone" | "sub_zone" | "base_unit" | "city" | "area";

interface NewLocForm {
  level: NewLocLevel;
  // shared
  name_field: string;
  is_active: boolean;
  // property
  property_code: string; property_type: string; business_type: string;
  gfa_sqm: string; floors: string;
  city_code: string; area_name: string;
  gps_lat: string; gps_long: string;
  location_contact: string; contact_phone: string;
  client_code: string; contract_code: string;
  // zone
  zone_code: string; property_link: string; floor_level: string;
  // sub_zone
  sub_zone_code: string; zone_link: string;
  // base_unit
  base_unit_code: string; sub_zone_link: string; qr_code_ref: string;
  // city
  city_name: string; city_code_field: string; country: string; region: string; time_zone: string;
  // area
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

  /* linked data */
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

  const Input = ({ label, fk, placeholder, type = "text", required }: {
    label: string; fk: keyof NewLocForm; placeholder?: string; type?: string; required?: boolean;
  }) => (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input type={type} value={String(form[fk])} onChange={(e) => set(fk)(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );

  const Select = ({ label, fk, options, required }: {
    label: string; fk: keyof NewLocForm; options: { v: string; l: string }[]; required?: boolean;
  }) => (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-foreground mb-1">
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
    <div className="h-full flex flex-col fade-in">
      {/* header */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">New Location</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
        </div>

        {/* level selector */}
        <div className="flex flex-wrap gap-2">
          {(["city", "area", "property", "zone", "sub_zone", "base_unit"] as NewLocLevel[]).map((lv) => {
            const m = LEVEL_META[lv as LocationLevel];
            return (
              <button key={lv} onClick={() => set("level")(lv)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all
                  ${form.level === lv ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary"}`}>
                {m.icon} {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {saveError && <ErrorBanner message={saveError} onRetry={() => setSaveError(null)} />}

        {/* COMMON: name */}
        {form.level !== "city" && (
          <div className="mb-4">
            <label className="block text-sm font-bold text-foreground mb-1.5 border-b border-border pb-1">
              Enter Location Name <span className="text-destructive">*</span>
            </label>
            <input
              value={form.name_field}
              onChange={(e) => set("name_field")(e.target.value)}
              placeholder={`Enter ${LEVEL_META[form.level as LocationLevel]?.label || ""} name…`}
              className="w-full px-0 py-2 border-0 border-b-2 border-primary text-lg font-semibold bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        {/* photo upload */}
        <div className="mb-5">
          <div className="border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer bg-muted/20">
            <Camera className="w-6 h-6" />
            <span className="text-sm">Add or drag pictures</span>
          </div>
        </div>

        {/* ── CITY FIELDS ── */}
        {form.level === "city" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="City Code" fk="city_code_field" placeholder="e.g. MCT" />
              <Input label="City Name" fk="city_name" placeholder="e.g. Muscat" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Country" fk="country" placeholder="e.g. Oman" />
              <Input label="Region" fk="region" placeholder="e.g. Middle East" />
            </div>
            <Input label="Time Zone" fk="time_zone" placeholder="e.g. Asia/Muscat" />
          </>
        )}

        {/* ── AREA FIELDS ── */}
        {form.level === "area" && (
          <>
            <Input label="Area Code" fk="area_code_field" placeholder="e.g. A001" />
            <Input label="Area Name" fk="area_name_field" placeholder="e.g. Al Khuwair" required />
            <Select label="City" fk="city_code"
              options={cities.map((c) => ({ v: c.name, l: `${c.city_code} — ${c.city_name}` }))} />
            <Input label="Area Group Code" fk="area_group_code" placeholder="e.g. AG001" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="GPS Latitude" fk="gps_lat" type="number" placeholder="23.5880" />
              <Input label="GPS Longitude" fk="gps_long" type="number" placeholder="58.3829" />
            </div>
          </>
        )}

        {/* ── PROPERTY FIELDS ── */}
        {form.level === "property" && (
          <>
            <Input label="Property Code" fk="property_code" placeholder="e.g. P10001" required />
            <Select label="Property Type" fk="property_type" required
              options={["Headquarters", "Branch", "Data Centre", "Warehouse", "Remote ATM Site", "Other"].map((v) => ({ v, l: v }))} />
            <Select label="Business Type" fk="business_type"
              options={["Bank HQ Areas", "Bank Branch Areas", "Bank Staff Areas", "Bank Infrastructure Areas", "Bank ATM Areas", "Data Centre Areas", "Other"].map((v) => ({ v, l: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="GFA (sqm)" fk="gfa_sqm" type="number" placeholder="2400" />
              <Input label="Number of Floors" fk="floors" type="number" placeholder="5" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 mt-3">Location Hierarchy</p>
            <Select label="City" fk="city_code"
              options={cities.map((c) => ({ v: c.name, l: `${c.city_code} — ${c.city_name}` }))} />
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 mt-3">GPS Coordinates</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Latitude" fk="gps_lat" type="number" placeholder="23.5880" />
              <Input label="Longitude" fk="gps_long" type="number" placeholder="58.3829" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 mt-3">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Location Contact" fk="location_contact" placeholder="Contact name" />
              <Input label="Phone" fk="contact_phone" placeholder="+968-XXXX-XXXX" type="tel" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 mt-3">Client & Contract</p>
            <Select label="Client" fk="client_code" required
              options={clients.map((c) => ({ v: c.name, l: c.client_name }))} />
            <Input label="Contract Code" fk="contract_code" placeholder="CON-2026-001" />
          </>
        )}

        {/* ── ZONE FIELDS ── */}
        {form.level === "zone" && (
          <>
            <Input label="Zone Code" fk="zone_code" placeholder="e.g. ZN0001" required />
            <Select label="Property" fk="property_link" required
              options={properties.map((p) => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))} />
            <Select label="Business Type" fk="business_type"
              options={["Bank HQ Areas", "Bank Branch Areas", "Bank Staff Areas", "Bank Infrastructure Areas", "Bank ATM Areas", "Data Centre Areas", "Other"].map((v) => ({ v, l: v }))} />
            <Input label="Floor Level" fk="floor_level" placeholder="e.g. G, 1, B1, Roof" />
          </>
        )}

        {/* ── SUB ZONE FIELDS ── */}
        {form.level === "sub_zone" && (
          <>
            <Input label="Sub Zone Code" fk="sub_zone_code" placeholder="e.g. SZ0001" required />
            <Select label="Property" fk="property_link"
              options={properties.map((p) => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))}
              required />
            <Select label="Zone" fk="zone_link" required
              options={zones.map((z) => ({ v: z.name, l: `${z.zone_code} — ${z.zone_name}` }))} />
          </>
        )}

        {/* ── BASE UNIT FIELDS ── */}
        {form.level === "base_unit" && (
          <>
            <Input label="Base Unit Code" fk="base_unit_code" placeholder="e.g. BU00001" required />
            <Select label="Property" fk="property_link"
              options={properties.map((p) => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))} />
            <Select label="Zone" fk="zone_link"
              options={zones.map((z) => ({ v: z.name, l: `${z.zone_code} — ${z.zone_name}` }))} />
            <Select label="Sub Zone" fk="sub_zone_link" required
              options={subZones.map((s) => ({ v: s.name, l: `${s.sub_zone_code} — ${s.sub_zone_name}` }))} />
            <Input label="QR Code Reference" fk="qr_code_ref" placeholder="e.g. QR-BU10001" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="GPS Latitude" fk="gps_lat" type="number" placeholder="23.5880" />
              <Input label="GPS Longitude" fk="gps_long" type="number" placeholder="58.3829" />
            </div>
          </>
        )}

        {/* COMMON: teams in charge */}
        <div className="mb-3 mt-2">
          <label className="block text-xs font-semibold text-foreground mb-1">Teams in Charge</label>
          <div className="flex items-center border border-border rounded-lg px-3 py-2 gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <input placeholder="Start typing…" className="flex-1 text-sm bg-transparent focus:outline-none" />
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* address */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-foreground mb-1">Address</label>
          <input placeholder="Enter address" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* description */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
          <textarea rows={3} placeholder="Add a description"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>

        {/* files */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-foreground mb-2">Files</label>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted transition-colors">
            <Paperclip className="w-4 h-4" /> Attach files
          </button>
        </div>

        {/* is active */}
        <div className="flex items-center gap-3 mb-6">
          <label className="text-sm font-semibold text-foreground">Is Active</label>
          <button onClick={() => set("is_active")(!form.is_active)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${form.is_active ? "border-primary bg-primary" : "border-border"}`}>
            {form.is_active && <Check className="w-3 h-3 text-white" />}
          </button>
        </div>

        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Create"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DETAIL VIEW (Property / Zone / etc.)
═══════════════════════════════════════════ */

function PropertyDetail({ name }: { name: string }) {
  const { data: p, loading, error } = useFrappeDoc<Property>("Property", name);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!p) return null;

  return (
    <div className="fade-in">
      <div className="px-6 pt-6 pb-4 border-b border-border bg-card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{PROPERTY_TYPE_ICONS[p.property_type || ""] || "🏢"}</span>
              <h2 className="text-xl font-bold text-foreground">{p.property_name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <LevelBadge level="property" />
              <span className="text-xs font-mono text-muted-foreground">{p.property_code}</span>
              <ActiveDot active={p.is_active} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button className="p-1.5 rounded-lg hover:bg-muted">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Classification</p>
          <Field label="Property Type" value={p.property_type} />
          <Field label="Business Type" value={p.business_type} />
          <Field label="GFA (sqm)" value={p.gfa_sqm ? `${p.gfa_sqm.toLocaleString()} m²` : "—"} />
          <Field label="Floors" value={p.floors ? String(p.floors) : "—"} />
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Location</p>
          <Field label="Area" value={p.area_name} />
          <Field label="City" value={p.city_code} />
          {(p.gps_lat || p.gps_long) && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Navigation className="w-3.5 h-3.5" />
              <span className="font-mono">{p.gps_lat}, {p.gps_long}</span>
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Contact</p>
          <Field label="Contact" value={p.location_contact} />
          <Field label="Phone" value={p.contact_phone} />
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Client & Contract</p>
          <Field label="Client" value={p.client_name || p.client_code} />
          <Field label="Contract" value={p.contract_code} />
        </div>
      </div>
    </div>
  );
}

function ZoneDetail({ name }: { name: string }) {
  const { data: z, loading, error } = useFrappeDoc<Zone>("Zone", name);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!z) return null;

  return (
    <div className="fade-in px-6 py-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{z.zone_name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <LevelBadge level="zone" />
            <span className="text-xs font-mono text-muted-foreground">{z.zone_code}</span>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>
      <Field label="Property" value={z.property_name || z.property_code} />
      <Field label="Business Type" value={z.business_type} />
      <Field label="Floor Level" value={z.floor_level} />
      <Field label="Active" value={z.is_active ? "Yes" : "No"} />
    </div>
  );
}

function SubZoneDetail({ name }: { name: string }) {
  const { data: s, loading, error } = useFrappeDoc<SubZone>("Sub Zone", name);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!s) return null;

  return (
    <div className="fade-in px-6 py-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{s.sub_zone_name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <LevelBadge level="sub_zone" />
            <span className="text-xs font-mono text-muted-foreground">{s.sub_zone_code}</span>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>
      <Field label="Zone" value={s.zone_name || s.zone_code} />
      <Field label="Property" value={s.property_code} />
      <Field label="Business Type" value={s.business_type} />
      <Field label="Active" value={s.is_active ? "Yes" : "No"} />
    </div>
  );
}

function BaseUnitDetail({ name }: { name: string }) {
  const { data: b, loading, error } = useFrappeDoc<BaseUnit>("Base Unit", name);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!b) return null;

  return (
    <div className="fade-in px-6 py-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{b.base_unit_name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <LevelBadge level="base_unit" />
            <span className="text-xs font-mono text-muted-foreground">{b.base_unit_code}</span>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>
      <Field label="Sub Zone" value={b.sub_zone_name || b.sub_zone_code} />
      <Field label="Property" value={b.property_code} />
      <Field label="Business Type" value={b.business_type} />
      <Field label="QR Code" value={b.qr_code_ref} mono />
      {(b.gps_lat || b.gps_long) && (
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Navigation className="w-3.5 h-3.5" />
          <span className="font-mono">{b.gps_lat}, {b.gps_long}</span>
        </div>
      )}
      {b.qr_code_ref && (
        <div className="mt-4 p-4 bg-muted/40 rounded-xl flex items-center gap-3">
          <QrCode className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="text-xs font-semibold text-foreground">QR Code Tag</p>
            <p className="text-xs font-mono text-muted-foreground">{b.qr_code_ref}</p>
          </div>
          <Wifi className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

type HierarchyView = "property" | "zone" | "sub_zone" | "base_unit";

export default function Locations() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [hierarchyView, setHierarchyView] = useState<HierarchyView>("property");
  const [selected, setSelected] = useState<SelectedLocation | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [subZoneFilter, setSubZoneFilter] = useState("");

  /* fetch all levels */
  const { data: properties, loading: pLoading, error: pError, refetch: pRefetch } =
    useFrappeList<Property>("Property", ["name", "property_code", "property_name", "property_type", "business_type", "client_name", "area_name", "city_code", "is_active"], [["is_active", "=", 1]], []);

  const { data: zones, loading: zLoading, refetch: zRefetch } =
    useFrappeList<Zone>("Zone", ["name", "zone_code", "zone_name", "property_code", "property_name", "floor_level", "is_active"],
      propertyFilter ? [["property_code", "=", propertyFilter], ["is_active", "=", 1]] : [["is_active", "=", 1]],
      [propertyFilter], hierarchyView !== "zone" && hierarchyView !== "sub_zone" && hierarchyView !== "base_unit");

  const { data: subZones, loading: szLoading, refetch: szRefetch } =
    useFrappeList<SubZone>("Sub Zone", ["name", "sub_zone_code", "sub_zone_name", "zone_code", "zone_name", "property_code", "is_active"],
      zoneFilter ? [["zone_code", "=", zoneFilter], ["is_active", "=", 1]] : [["is_active", "=", 1]],
      [zoneFilter], hierarchyView !== "sub_zone" && hierarchyView !== "base_unit");

  const { data: baseUnits, loading: buLoading, refetch: buRefetch } =
    useFrappeList<BaseUnit>("Base Unit", ["name", "base_unit_code", "base_unit_name", "sub_zone_code", "sub_zone_name", "property_code", "qr_code_ref", "is_active"],
      subZoneFilter ? [["sub_zone_code", "=", subZoneFilter], ["is_active", "=", 1]] : [["is_active", "=", 1]],
      [subZoneFilter], hierarchyView !== "base_unit");

  const refetchAll = () => { pRefetch(); zRefetch(); szRefetch(); buRefetch(); };

  /* current list based on hierarchy view */
  const currentList = hierarchyView === "property" ? properties
    : hierarchyView === "zone" ? zones
    : hierarchyView === "sub_zone" ? subZones
    : baseUnits;

  const isLoading = hierarchyView === "property" ? pLoading : hierarchyView === "zone" ? zLoading : hierarchyView === "sub_zone" ? szLoading : buLoading;

  /* search */
  type AnyLoc = Property | Zone | SubZone | BaseUnit;
  const filtered = (currentList as AnyLoc[]).filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const anyItem = item as Record<string, unknown>;
    return Object.values(anyItem).some((v) => String(v).toLowerCase().includes(q));
  });

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

  const levelIcon = (lv: HierarchyView) => LEVEL_META[lv as LocationLevel].icon;

  return (
    <div className="flex flex-col h-full">
      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Locations</h1>
          {/* view toggle */}
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
        <div className="flex items-center gap-3">
          <button onClick={refetchAll} className="p-2 rounded-lg hover:bg-muted" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-56 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search Locations…" />
          </div>
          <button onClick={() => { setShowNewForm(true); setSelected(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Location
          </button>
        </div>
      </div>

      {/* hierarchy level tabs */}
      <div className="flex items-center gap-1 px-5 py-2.5 border-b border-border bg-card">
        <span className="text-xs text-muted-foreground font-medium mr-1">View:</span>
        {(["property", "zone", "sub_zone", "base_unit"] as HierarchyView[]).map((lv) => {
          const m = LEVEL_META[lv as LocationLevel];
          return (
            <button key={lv}
              onClick={() => { setHierarchyView(lv); setSelected(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${hierarchyView === lv ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              {m.icon} {m.label}
            </button>
          );
        })}

        {/* filter breadcrumb */}
        {propertyFilter && hierarchyView !== "property" && (
          <div className="ml-3 flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronRight className="w-3 h-3" />
            <span className="bg-muted px-2 py-0.5 rounded flex items-center gap-1">
              {properties.find((p) => p.name === propertyFilter)?.property_name || propertyFilter}
              <button onClick={() => setPropertyFilter("")}><X className="w-3 h-3" /></button>
            </span>
          </div>
        )}
        {zoneFilter && hierarchyView !== "zone" && hierarchyView !== "property" && (
          <div className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronRight className="w-3 h-3" />
            <span className="bg-muted px-2 py-0.5 rounded flex items-center gap-1">
              {zones.find((z) => z.name === zoneFilter)?.zone_name || zoneFilter}
              <button onClick={() => setZoneFilter("")}><X className="w-3 h-3" /></button>
            </span>
          </div>
        )}
      </div>

      {/* Team filter chip */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-border bg-card">
        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
          <Users className="w-3 h-3" /> Team
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
          <MapPin className="w-3 h-3" /> City
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
          <Building2 className="w-3 h-3" /> Property Type
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
          <Plus className="w-3 h-3" /> Add Filter
        </button>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL ── */}
        <div className="w-[340px] min-w-[340px] border-r border-border flex flex-col bg-card overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {isLoading && <LoadingSpinner />}
            {pError && <ErrorBanner message={pError} onRetry={refetchAll} />}

            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <MapPin className="w-8 h-8" />
                <p className="text-sm">No locations found</p>
              </div>
            )}

            {!isLoading && !viewMode && null /* always list in left */}

            {!isLoading && filtered.map((item) => {
              const anyItem = item as AnyLoc;
              const isSelected = selected?.name === anyItem.name;
              const meta = LEVEL_META[hierarchyView as LocationLevel];
              return (
                <ListRow
                  key={anyItem.name}
                  icon={<span className="text-base">{
                    hierarchyView === "property"
                      ? PROPERTY_TYPE_ICONS[(item as Property).property_type || ""] || "🏢"
                      : meta.icon
                  }</span>}
                  code={getItemCode(anyItem)}
                  name={getItemLabel(anyItem)}
                  sub={getItemSub(anyItem)}
                  active={(anyItem as Record<string, unknown>).is_active as (0 | 1)}
                  selected={isSelected && !showNewForm}
                  onClick={() => {
                    setSelected({ level: hierarchyView as LocationLevel, name: anyItem.name, label: getItemLabel(anyItem) });
                    setShowNewForm(false);
                    // set breadcrumb filters for drill-down
                    if (hierarchyView === "property") setPropertyFilter(anyItem.name);
                    if (hierarchyView === "zone") setZoneFilter(anyItem.name);
                    if (hierarchyView === "sub_zone") setSubZoneFilter(anyItem.name);
                  }}
                  gridView={false}
                />
              );
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-y-auto bg-background">
          {showNewForm ? (
            <NewLocationForm onClose={() => setShowNewForm(false)} onCreated={() => { setShowNewForm(false); refetchAll(); }} />
          ) : selected ? (
            <div className="fade-in">
              {selected.level === "property" && <PropertyDetail name={selected.name} />}
              {selected.level === "zone" && <ZoneDetail name={selected.name} />}
              {selected.level === "sub_zone" && <SubZoneDetail name={selected.name} />}
              {selected.level === "base_unit" && <BaseUnitDetail name={selected.name} />}

              {/* drill-down buttons */}
              {selected.level !== "base_unit" && (
                <div className="px-6 pb-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 mt-4">Drill Down</p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.level === "property" && (
                      <button onClick={() => { setHierarchyView("zone"); setPropertyFilter(selected.name); setSelected(null); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors">
                        {levelIcon("zone")} View Zones
                      </button>
                    )}
                    {selected.level === "zone" && (
                      <button onClick={() => { setHierarchyView("sub_zone"); setZoneFilter(selected.name); setSelected(null); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors">
                        {levelIcon("sub_zone")} View Sub Zones
                      </button>
                    )}
                    {selected.level === "sub_zone" && (
                      <button onClick={() => { setHierarchyView("base_unit"); setSubZoneFilter(selected.name); setSelected(null); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors">
                        {levelIcon("base_unit")} View Base Units
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <MapPin className="w-10 h-10" />
              <p className="text-sm">Select a location to view details</p>
              <p className="text-xs text-muted-foreground/70">or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
