import { useState } from "react";
import { Search, Plus, Filter, Edit, MoreVertical, ChevronRight, Download, FileText } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  tag: string;
  property: string;
  floor: string;
  icon: string;
  iconBg: string;
  status: "Active" | "Under Maintenance" | "Decommissioned";
  lastPM: string;
  manufacturer?: string;
  model?: string;
  serialNo?: string;
  installDate?: string;
  warrantyExpiry?: string;
  warrantyExpired?: boolean;
  nextPPM?: string;
  slaPolicy?: string;
  unit?: string;
  woHistory?: { id: string; title: string; date: string; status: string }[];
  documents?: { name: string }[];
}

const assets: Asset[] = [
  {
    id: "1", name: "Chiller Unit A", tag: "AST-001", property: "Al Barsha Tower A", floor: "L-Roof", icon: "❄️", iconBg: "bg-blue-100",
    status: "Active", lastPM: "01 Apr 2026", manufacturer: "Carrier Corporation", model: "30XA-200", serialNo: "CRR-2019-88821",
    installDate: "15 Jan 2019", warrantyExpiry: "14 Jan 2024", warrantyExpired: true, nextPPM: "01 Jul 2026", slaPolicy: "HVAC SLA Gold", unit: "N/A (Building Asset)",
    woHistory: [
      { id: "WO-101", title: "Chiller A Quarterly PPM", date: "Apr 2026", status: "Open" },
      { id: "WO-088", title: "Refrigerant Top Up", date: "Jan 2026", status: "Completed" },
      { id: "WO-071", title: "Condenser Coil Clean", date: "Oct 2025", status: "Completed" },
    ],
    documents: [{ name: "Maintenance Manual.pdf" }, { name: "Warranty Certificate.pdf" }],
  },
  { id: "2", name: "AHU Filter Bank - L3", tag: "AST-002", property: "Al Barsha Tower A", floor: "Level 3", icon: "🌀", iconBg: "bg-green-100", status: "Active", lastPM: "06 Apr 2026" },
  { id: "3", name: "DB Panel - Sub Station", tag: "AST-003", property: "Tower B", floor: "Basement", icon: "⚡", iconBg: "bg-yellow-100", status: "Under Maintenance", lastPM: "28 Mar 2026" },
  { id: "4", name: "CCTV System - Lobby", tag: "AST-004", property: "Al Barsha Tower A", floor: "L1", icon: "📹", iconBg: "bg-purple-100", status: "Active", lastPM: "03 Apr 2026" },
  { id: "5", name: "Water Tank - Roof", tag: "AST-005", property: "Tower C", floor: "Roof", icon: "💧", iconBg: "bg-cyan-100", status: "Active", lastPM: "08 Apr 2026" },
  { id: "6", name: "Booster Pump P2", tag: "AST-006", property: "Tower B", floor: "Plant Room", icon: "⚙️", iconBg: "bg-gray-200", status: "Under Maintenance", lastPM: "07 Apr 2026" },
  { id: "7", name: "Emergency Light Bank", tag: "AST-007", property: "Al Barsha Tower A", floor: "L2", icon: "💡", iconBg: "bg-amber-100", status: "Active", lastPM: "09 Apr 2026" },
];

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  "Under Maintenance": "bg-amber-100 text-amber-700",
  Decommissioned: "bg-red-100 text-red-700",
};

const woStatusStyles: Record<string, string> = {
  Open: "bg-emerald-100 text-emerald-700",
  Completed: "bg-blue-100 text-blue-700",
  "In Progress": "bg-sky-100 text-sky-700",
};

export default function Assets() {
  const [selected, setSelected] = useState("1");
  const [tab, setTab] = useState<"all" | "building" | "unit">("all");
  const asset = assets.find(a => a.id === selected)!;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card">
        <div className="flex-1 max-w-md">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground" placeholder="Search Assets…" />
          </div>
        </div>
        <button className="filter-chip"><Filter className="w-3.5 h-3.5" /> Asset Type</button>
        <button className="filter-chip">Property</button>
        <button className="filter-chip">Status</button>
        <button className="filter-chip">Category</button>
        <button className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-4 h-4" /> New Asset
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="w-[380px] min-w-[380px] border-r border-border flex flex-col bg-card">
          <div className="flex border-b border-border">
            {(["all", "building", "unit"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                {t === "all" ? "All Assets" : t === "building" ? "Building Assets" : "Unit Assets"}
              </button>
            ))}
          </div>
          <div className="px-4 py-2 bg-muted/50 text-xs font-semibold text-foreground border-b border-border">All Properties</div>
          <div className="flex-1 overflow-y-auto">
            {assets.map(a => (
              <div key={a.id} onClick={() => setSelected(a.id)} className={`list-item-hover px-4 py-3 border-b border-border ${selected === a.id ? "selected" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${a.iconBg} flex items-center justify-center text-lg shrink-0`}>{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">#{a.tag} · {a.property} · {a.floor}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyles[a.status]}`}>{a.status}</span>
                      <span className="text-[10px] text-muted-foreground">Last PM: {a.lastPM}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto bg-card fade-in" key={asset.id}>
          <div className="max-w-2xl mx-auto px-6 py-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-xl font-semibold text-foreground">{asset.name}</h1>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-primary font-medium hover:bg-muted transition-colors"><Edit className="w-3.5 h-3.5" /> Edit</button>
                <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"><MoreVertical className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[asset.status]}`}>{asset.status}</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Building Asset</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">HVAC / Mechanical</span>
            </div>

            {/* Fields */}
            <div className="space-y-0 mb-8">
              {[
                { label: "Asset Tag", value: asset.tag },
                { label: "Property", value: asset.property },
                { label: "Floor", value: asset.floor },
                { label: "Unit", value: asset.unit || "—" },
                { label: "Manufacturer", value: asset.manufacturer || "—" },
                { label: "Model", value: asset.model || "—" },
                { label: "Serial No", value: asset.serialNo || "—" },
                { label: "Install Date", value: asset.installDate || "—" },
                { label: "Warranty Expiry", value: asset.warrantyExpiry || "—", isExpired: asset.warrantyExpired },
                { label: "Last PPM", value: asset.lastPM },
                { label: "Next PPM", value: asset.nextPPM || "—" },
                { label: "SLA Policy", value: asset.slaPolicy || "—" },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">{f.label}</span>
                  <span className={`text-sm font-medium ${f.isExpired ? "text-destructive" : "text-foreground"}`}>
                    {f.value}{f.isExpired ? " (expired)" : ""}
                  </span>
                </div>
              ))}
            </div>

            {/* WO History */}
            {asset.woHistory && (
              <div className="mb-8">
                <h2 className="text-base font-semibold text-foreground mb-3">Work Order History</h2>
                <div className="space-y-0">
                  {asset.woHistory.map((w, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-primary font-medium">{w.id}</span>
                        <span className="text-sm text-foreground">{w.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{w.date}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${woStatusStyles[w.status] || "bg-muted text-muted-foreground"}`}>{w.status}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {asset.documents && (
              <div>
                <h2 className="text-base font-semibold text-foreground mb-3">Documents</h2>
                <div className="space-y-2">
                  {asset.documents.map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm text-foreground">{d.name}</span>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
