import { useState } from "react";
import { Search, Plus, Filter, Users, Clock, CheckCircle2, LayoutGrid, List, CalendarDays, MoreVertical, MessageSquare, Lock, Pause, Play, CheckCircle, ChevronDown, ChevronRight, Send } from "lucide-react";

interface WorkOrder {
  id: string;
  title: string;
  requester: string;
  status: "Open" | "In Progress" | "On Hold" | "Scheduled" | "Assigned" | "Done";
  priority: "Critical" | "High" | "Medium" | "Low";
  number: string;
  icon: string;
  iconBg: string;
  dueDate?: string;
  serviceRequest?: string;
  fmContract?: string;
  serviceCategory?: string;
  scheduledDate?: string;
  estimatedHours?: string;
  property?: string;
  floor?: string;
  unit?: string;
  assetType?: string;
  cafmAsset?: string;
  assignedTechnician?: string;
  contractor?: string;
  permitToWork?: string;
  actualStart?: string;
  actualEnd?: string;
  slaPolicy?: string;
  responseDeadline?: string;
  resolutionDeadline?: string;
  slaStatus?: string;
  checklist?: string[];
  comments?: { author: string; time: string; text: string }[];
}

const workOrders: WorkOrder[] = [
  {
    id: "1", title: "HVAC Quarterly PPM - Chiller A", requester: "Raj Mehta", status: "Open", priority: "High", number: "#WO-101", icon: "❄️", iconBg: "bg-blue-100",
    serviceRequest: "SR-0234", serviceCategory: "HVAC / Mechanical", scheduledDate: "Today", estimatedHours: "4 hrs",
    property: "Al Barsha Tower A", floor: "Level 3", unit: "Unit 301", assetType: "Building Asset", cafmAsset: "Chiller-A-QTR-001",
    assignedTechnician: "Raj Mehta", contractor: "GulfTech Services", permitToWork: "PTW-2026-044",
    slaPolicy: "HVAC SLA Gold", responseDeadline: "Apr 08 2026 10:00 AM", resolutionDeadline: "Apr 09 2026 10:00 AM", slaStatus: "Pending",
    checklist: ["Check refrigerant levels", "Clean condenser coils", "Verify thermostat calibration"],
    comments: [{ author: "Raj Mehta", time: "2hrs ago", text: "Parts ordered, ETA tomorrow" }],
  },
  { id: "2", title: "Burst Pipe Repair - Level 2", requester: "Sunita Rao", status: "In Progress", priority: "Critical", number: "#WO-103", icon: "🔧", iconBg: "bg-red-100",
    serviceCategory: "Plumbing", property: "Al Barsha Tower A", floor: "Level 2", assignedTechnician: "Sunita Rao",
    slaPolicy: "Emergency SLA", slaStatus: "At Risk",
    checklist: ["Isolate water supply", "Replace burst section", "Pressure test"],
    comments: [{ author: "Sunita Rao", time: "30min ago", text: "Water isolated, replacement pipe on site" }],
  },
  { id: "3", title: "DB Panel Check - Sub Station", requester: "Arjun Nair", status: "Open", priority: "High", number: "#WO-104", icon: "⚡", iconBg: "bg-yellow-100",
    serviceCategory: "Electrical", property: "Tower B", floor: "Basement", assignedTechnician: "Arjun Nair",
  },
  { id: "4", title: "CCTV Maintenance Round", requester: "Priya Shah", status: "On Hold", priority: "Medium", number: "#WO-106", icon: "📹", iconBg: "bg-purple-100",
    serviceCategory: "Security Systems", property: "Al Barsha Tower A", floor: "L1", assignedTechnician: "Priya Shah",
  },
  { id: "5", title: "Lobby Deep Clean - L1", requester: "Mohammed Ali", status: "Open", priority: "Medium", number: "#WO-107", icon: "🧹", iconBg: "bg-teal-100",
    serviceCategory: "Cleaning", property: "Al Barsha Tower A", floor: "L1", assignedTechnician: "Mohammed Ali",
  },
  { id: "6", title: "BMS Diagnostic", requester: "Raj Mehta", status: "Scheduled", priority: "Medium", number: "#WO-115", icon: "🖥️", iconBg: "bg-indigo-100",
    serviceCategory: "BMS / IT", property: "Al Barsha Tower A", assignedTechnician: "Raj Mehta",
  },
  { id: "7", title: "Water Tank Clean", requester: "Sunita Rao", status: "In Progress", priority: "High", number: "#WO-116", icon: "💧", iconBg: "bg-cyan-100",
    serviceCategory: "Plumbing", property: "Tower C", floor: "Roof", assignedTechnician: "Sunita Rao",
  },
  { id: "8", title: "Booster Pump Inspection P2", requester: "Assigned", status: "Assigned", priority: "Medium", number: "#WO-110", icon: "⚙️", iconBg: "bg-gray-100",
    serviceCategory: "Mechanical", property: "Tower B", floor: "Plant Room",
  },
];

const statusColor: Record<string, string> = {
  Open: "text-emerald-600",
  "In Progress": "text-blue-600",
  "On Hold": "text-amber-600",
  Scheduled: "text-indigo-600",
  Assigned: "text-violet-600",
  Done: "text-gray-500",
};

export default function WorkOrders() {
  const [selected, setSelected] = useState("1");
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [slaOpen, setSlaOpen] = useState(true);
  const [checkStates, setCheckStates] = useState<Record<string, boolean[]>>({});
  const [comment, setComment] = useState("");
  const wo = workOrders.find(w => w.id === selected)!;

  const toggleCheck = (woId: string, idx: number) => {
    setCheckStates(prev => {
      const arr = [...(prev[woId] || wo.checklist?.map(() => false) || [])];
      arr[idx] = !arr[idx];
      return { ...prev, [woId]: arr };
    });
  };
  const checks = checkStates[wo.id] || wo.checklist?.map(() => false) || [];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card">
        <div className="flex gap-1">
          <button className="p-2 rounded-lg bg-primary/10 text-primary"><LayoutGrid className="w-4 h-4" /></button>
          <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"><List className="w-4 h-4" /></button>
          <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"><CalendarDays className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 max-w-md">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground" placeholder="Search Work Orders…" />
          </div>
        </div>
        <button className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-4 h-4" /> New Work Order
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card">
        <button className="filter-chip"><Filter className="w-3.5 h-3.5" /> Filter</button>
        <button className="filter-chip"><Users className="w-3.5 h-3.5" /> Assigned To</button>
        <button className="filter-chip"><Clock className="w-3.5 h-3.5" /> Due Date</button>
        <button className="filter-chip"><CheckCircle2 className="w-3.5 h-3.5" /> Status</button>
        <button className="ml-auto text-sm text-primary font-medium hover:underline">⭐ My Filters</button>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="w-[380px] min-w-[380px] border-r border-border flex flex-col bg-card">
          <div className="flex border-b border-border">
            <button onClick={() => setTab("todo")} className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${tab === "todo" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>To Do</button>
            <button onClick={() => setTab("done")} className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${tab === "done" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Done</button>
          </div>
          <div className="px-4 py-2 text-xs text-muted-foreground">Sort by: <span className="text-primary font-medium cursor-pointer">Priority: Highest first ▾</span></div>
          <div className="px-4 py-2 bg-muted/50 text-xs font-semibold text-foreground border-y border-border">Assigned to your Teams</div>
          <div className="flex-1 overflow-y-auto">
            {workOrders.map(w => (
              <div key={w.id} onClick={() => setSelected(w.id)} className={`list-item-hover px-4 py-3 border-b border-border ${selected === w.id ? "selected" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${w.iconBg} flex items-center justify-center text-lg shrink-0`}>{w.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate max-w-[220px]">{w.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Requested by {w.requester}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${statusColor[w.status] || "text-muted-foreground"}`}>● {w.status}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{w.number}</span>
                      <span className={w.priority === "Critical" ? "badge-critical" : w.priority === "High" ? "badge-high" : w.priority === "Medium" ? "badge-medium" : "badge-low"}>{w.priority}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground text-center underline cursor-pointer hover:text-primary transition-colors">All Open Work Orders</div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto bg-card fade-in" key={wo.id}>
          <div className="max-w-2xl mx-auto px-6 py-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <h1 className="text-xl font-semibold text-foreground">{wo.title}</h1>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-primary font-medium hover:bg-muted transition-colors">
                  <MessageSquare className="w-4 h-4" /> Comments
                </button>
                <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"><MoreVertical className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Status stepper */}
            <div className="mb-8">
              <div className="text-xs text-muted-foreground mb-3">Click to update</div>
              <div className="flex gap-3">
                {[
                  { label: "Open", icon: Lock, status: "Open" },
                  { label: "On Hold", icon: Pause, status: "On Hold" },
                  { label: "In Progress", icon: Play, status: "In Progress" },
                  { label: "Done", icon: CheckCircle, status: "Done" },
                ].map(s => (
                  <button key={s.label} className={`status-btn ${wo.status === s.status ? "active" : ""}`}>
                    <s.icon className="w-5 h-5" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail fields */}
            <div className="space-y-0 mb-8">
              {[
                { label: "Service Request", value: wo.serviceRequest, isLink: true },
                { label: "FM Contract", value: wo.fmContract || "—" },
                { label: "Priority", value: wo.priority, isBadge: true },
                { label: "Service Category", value: wo.serviceCategory || "—" },
                { label: "Scheduled Date", value: wo.scheduledDate || "—" },
                { label: "Estimated Hours", value: wo.estimatedHours || "—" },
                { label: "Property", value: wo.property || "—" },
                { label: "Floor", value: wo.floor || "—" },
                { label: "Unit", value: wo.unit || "—" },
                { label: "Asset Type", value: wo.assetType || "—" },
                { label: "CAFM Asset", value: wo.cafmAsset || "—" },
                { label: "Assigned Technician", value: wo.assignedTechnician || "—" },
                { label: "Contractor", value: wo.contractor || "—" },
                { label: "Permit to Work", value: wo.permitToWork || "—" },
                { label: "Work Order ID", value: wo.number },
                { label: "Actual Start", value: wo.actualStart || "—" },
                { label: "Actual End", value: wo.actualEnd || "—" },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">{f.label}</span>
                  {f.isBadge ? (
                    <span className={wo.priority === "Critical" ? "badge-critical" : wo.priority === "High" ? "badge-high" : wo.priority === "Medium" ? "badge-medium" : "badge-low"}>{f.value}</span>
                  ) : f.isLink ? (
                    <span className="text-sm text-primary font-medium cursor-pointer hover:underline">{f.value}</span>
                  ) : (
                    <span className="text-sm text-foreground font-medium">{f.value}</span>
                  )}
                </div>
              ))}
            </div>

            {/* SLA Panel */}
            {wo.slaPolicy && (
              <div className="mb-8 border border-border rounded-xl overflow-hidden">
                <button onClick={() => setSlaOpen(!slaOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-semibold text-foreground">SLA Information</span>
                  {slaOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
                {slaOpen && (
                  <div className="px-4 py-3 space-y-3 bg-card">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">SLA Policy</span><span className="font-medium text-foreground">{wo.slaPolicy}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Response Deadline</span><span className="font-medium text-foreground">{wo.responseDeadline || "—"}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Resolution Deadline</span><span className="font-medium text-foreground">{wo.resolutionDeadline || "—"}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">SLA Status</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${wo.slaStatus === "At Risk" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{wo.slaStatus}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Time & Cost */}
            <div className="mb-8">
              <h2 className="text-base font-semibold text-foreground mb-3">Time & Cost Tracking</h2>
              {["Parts", "Time", "Other Costs"].map(s => (
                <div key={s} className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">{s}</span>
                  <button className="text-sm text-primary font-medium hover:underline">Add &gt;</button>
                </div>
              ))}
            </div>

            {/* Checklist */}
            {wo.checklist && (
              <div className="mb-8">
                <h2 className="text-base font-semibold text-foreground mb-3">Checklist</h2>
                <div className="space-y-2">
                  {wo.checklist.map((item, i) => (
                    <label key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <input type="checkbox" checked={checks[i] || false} onChange={() => toggleCheck(wo.id, i)} className="w-4 h-4 rounded border-border text-primary accent-primary" />
                      <span className={`text-sm ${checks[i] ? "line-through text-muted-foreground" : "text-foreground"}`}>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">Comments</h2>
              {wo.comments?.map((c, i) => (
                <div key={i} className="flex gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{c.author.split(" ").map(n => n[0]).join("")}</div>
                  <div>
                    <div className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{c.author}</span> · {c.time}</div>
                    <div className="text-sm text-foreground mt-0.5">{c.text}</div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-3">
                <input value={comment} onChange={e => setComment(e.target.value)} className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30" placeholder="Add a comment…" />
                <button className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
