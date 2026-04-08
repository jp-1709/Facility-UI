import { useState } from "react";
import {
  Search, Plus, Filter, MapPin, Zap, CheckCircle2, ChevronDown, ChevronUp,
  MoreVertical, Pencil, Camera, Send, Link2, QrCode, Copy, X,
  Clock, Mail, Smartphone, MessageSquare, FileText, ChevronRight
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

/* ── types ── */
interface ServiceRequest {
  id: string;
  title: string;
  location: string;
  status: "Open" | "Pending" | "In Progress" | "Escalated" | "Closed";
  priority: "Critical" | "High" | "Medium" | "Low";
  series: string;
  timeAgo: string;
  section: "me" | "other";
  category?: string;
  requestDate?: string;
  assignedTech?: string;
  requestedBy?: string;
  customer?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  description?: string;
  property?: string;
  floor?: string;
  unit?: string;
  zone?: string;
  subZone?: string;
  assetType?: string;
  cafmAsset?: string;
  slaPolicy?: string;
  responseDeadline?: string;
  resolutionDeadline?: string;
  actualResponse?: string;
  actualResolution?: string;
  slaStatus?: string;
}

const requests: ServiceRequest[] = [
  {
    id: "1", title: "HVAC Unit Not Cooling - Office 3B", location: "Al Barsha Tower A · Level 3",
    status: "Pending", priority: "High", series: "SR-0241", timeAgo: "2h ago", section: "me",
    category: "HVAC / Mechanical", requestDate: "Apr 08, 2026", assignedTech: "Raj Mehta",
    requestedBy: "Ahmed Al Mansoori", customer: "Al Barsha Properties LLC",
    contactPerson: "Mohammed Yusuf", mobile: "+971-50-XXX-XXXX", email: "m.yusuf@albarsha.ae",
    description: "The HVAC unit in Office 3B on Level 3 is not producing cold air. The thermostat reads 28°C even when set to 20°C. Issue started this morning.",
    property: "Al Barsha Tower A", floor: "Level 3", unit: "Unit 301 (Office 3B)",
    zone: "HVAC Zone North", subZone: "North Wing", assetType: "Building Asset", cafmAsset: "AHU-301-NW",
    slaPolicy: "HVAC SLA Gold", responseDeadline: "Apr 08, 2026 12:00 PM",
    resolutionDeadline: "Apr 09, 2026 12:00 PM", slaStatus: "Pending",
  },
  {
    id: "2", title: "Water Leak Under Sink - Unit 201", location: "Tower B · Level 2",
    status: "Open", priority: "Critical", series: "SR-0239", timeAgo: "4h ago", section: "me",
    category: "Plumbing", requestDate: "Apr 08, 2026", assignedTech: "Sunita Rao",
    requestedBy: "Fatima Al Zaabi", customer: "Tower B Management",
    description: "Water is leaking from under the kitchen sink in Unit 201. Pooling on the floor.",
    property: "Tower B", floor: "Level 2", unit: "Unit 201",
    slaPolicy: "Plumbing SLA Standard", slaStatus: "At Risk",
  },
  {
    id: "3", title: "Broken Window - Maintenance Shop", location: "Warehouse 2",
    status: "Pending", priority: "Medium", series: "SR-0237", timeAgo: "Yesterday", section: "other",
    category: "Civil / Structural", requestDate: "Apr 07, 2026",
    description: "Window pane cracked in the maintenance shop area.",
    property: "Warehouse 2",
  },
  {
    id: "4", title: "CCTV Offline - Lobby", location: "Al Barsha Tower A · L1",
    status: "In Progress", priority: "High", series: "SR-0235", timeAgo: "Yesterday", section: "other",
    category: "Security", requestDate: "Apr 07, 2026", assignedTech: "Priya Shah",
    description: "Lobby CCTV camera went offline at 6:00 AM. No feed available.",
    property: "Al Barsha Tower A", floor: "L1",
    slaPolicy: "Security SLA", slaStatus: "Breached",
  },
  {
    id: "5", title: "Elevator Malfunction - Block C", location: "Tower C",
    status: "Escalated", priority: "Critical", series: "SR-0230", timeAgo: "2d ago", section: "other",
    category: "Elevator / Lift", requestDate: "Apr 06, 2026",
    description: "Elevator in Block C is stuck between floors 4 and 5. Passengers evacuated safely.",
    property: "Tower C",
    slaPolicy: "Critical SLA Platinum", slaStatus: "Breached",
  },
];

const statusColor: Record<string, string> = {
  Open: "text-emerald-600",
  Pending: "text-amber-600",
  "In Progress": "text-blue-600",
  Escalated: "text-red-600",
  Closed: "text-muted-foreground",
};
const statusDot: Record<string, string> = {
  Open: "bg-emerald-500",
  Pending: "bg-amber-500",
  "In Progress": "bg-blue-500",
  Escalated: "bg-red-500",
  Closed: "bg-gray-400",
};
const priorityClass: Record<string, string> = {
  Critical: "badge-critical",
  High: "badge-high",
  Medium: "badge-medium",
  Low: "badge-low",
};

const SERVICE_CATEGORIES = [
  "Cleaning", "Maintenance", "HVAC", "Electrical", "Plumbing",
  "Security", "IT", "Pest Control", "Civil", "Inspection",
];

/* ═══════════════ COMPONENT ═══════════════ */
export default function Requests() {
  const [selectedId, setSelectedId] = useState("1");
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [showNewForm, setShowNewForm] = useState(false);
  const [showPortals, setShowPortals] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});
  const [newPriority, setNewPriority] = useState("Medium");
  const [newCategory, setNewCategory] = useState("");

  const selected = requests.find((r) => r.id === selectedId) || requests[0];
  const myRequests = requests.filter((r) => r.section === "me");
  const otherRequests = requests.filter((r) => r.section === "other");

  const toggleSection = (key: string) =>
    setCollapsedSections((p) => ({ ...p, [key]: !p[key] }));
  const togglePanel = (key: string) =>
    setCollapsedPanels((p) => ({ ...p, [key]: !p[key] }));

  /* ── request card ── */
  const RequestCard = ({ r }: { r: ServiceRequest }) => (
    <button
      onClick={() => { setSelectedId(r.id); setShowNewForm(false); }}
      className={`list-item-hover w-full text-left px-4 py-3 border-b border-border flex gap-3 ${selectedId === r.id && !showNewForm ? "selected" : ""}`}
    >
      {/* thumbnail placeholder */}
      <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Camera className="w-4 h-4 text-muted-foreground" />
      </div>
      {/* center */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3" /> {r.location}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`flex items-center gap-1 text-xs font-medium ${statusColor[r.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[r.status]}`} />
            {r.status}
          </span>
          <span className="text-xs text-muted-foreground">{r.series}</span>
        </div>
      </div>
      {/* right */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={priorityClass[r.priority]}>{r.priority}</span>
        <span className="text-[11px] text-muted-foreground">{r.timeAgo}</span>
      </div>
    </button>
  );

  /* ── field row helper ── */
  const Field = ({ label, value, link, badge, badgeClass }: { label: string; value?: string; link?: boolean; badge?: boolean; badgeClass?: string }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      {badge ? (
        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${badgeClass}`}>{value}</span>
      ) : link ? (
        <span className="text-sm text-primary font-medium cursor-pointer hover:underline">{value}</span>
      ) : (
        <span className="text-sm text-foreground font-medium">{value || "—"}</span>
      )}
    </div>
  );

  /* ── collapsible section ── */
  const CollapsibleSection = ({ title, id, children }: { title: string; id: string; children: React.ReactNode }) => (
    <div className="border-b border-border">
      <button onClick={() => togglePanel(id)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {collapsedPanels[id] ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {!collapsedPanels[id] && <div className="px-5 pb-4 fade-in">{children}</div>}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <h1 className="text-2xl font-bold text-foreground">Requests</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPortals(true)} className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5" /> Request Portals
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-56 focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search Requests…" />
          </div>
          <button onClick={() => { setShowNewForm(true); setSelectedId(""); }} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
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

          {/* sort */}
          <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-1">
            Sort By: <span className="font-medium text-foreground">Request Date: Newest First</span> <ChevronDown className="w-3 h-3" />
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto">
            {/* section: assigned to me */}
            <button onClick={() => toggleSection("me")} className="w-full flex items-center justify-between px-4 py-2 bg-muted/60 text-xs font-bold text-foreground uppercase tracking-wide">
              <span>Assigned to Me ({myRequests.length})</span>
              {collapsedSections.me ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            {!collapsedSections.me && myRequests.map((r) => <RequestCard key={r.id} r={r} />)}

            {/* section: other teams */}
            <button onClick={() => toggleSection("other")} className="w-full flex items-center justify-between px-4 py-2 bg-muted/60 text-xs font-bold text-foreground uppercase tracking-wide">
              <span>Assigned to Other Teams ({otherRequests.length})</span>
              {collapsedSections.other ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            {!collapsedSections.other && otherRequests.map((r) => <RequestCard key={r.id} r={r} />)}
          </div>

          {/* bottom link */}
          <div className="border-t border-border py-3 text-center">
            <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer underline">All Open Requests</span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-y-auto bg-background">
          {showNewForm ? (
            /* ═══ NEW REQUEST FORM ═══ */
            <div className="max-w-2xl mx-auto py-6 px-6 fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">New Request</h2>
                <button onClick={() => setShowNewForm(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
              </div>

              {/* auto series */}
              <div className="mb-5">
                <span className="px-3 py-1 bg-muted rounded-full text-xs font-semibold text-muted-foreground">SR-0242</span>
              </div>

              {/* subject */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Subject <span className="text-destructive">*</span></label>
                <input className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Enter request subject…" />
              </div>

              {/* category */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Service Category <span className="text-destructive">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_CATEGORIES.map((c) => (
                    <button key={c} onClick={() => setNewCategory(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${newCategory === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:border-primary hover:text-primary"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* priority */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Priority <span className="text-destructive">*</span></label>
                <div className="flex gap-2">
                  {["Low", "Medium", "High", "Critical"].map((p) => (
                    <button key={p} onClick={() => setNewPriority(p)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${newPriority === p ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* photo */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Photo</label>
                <div className="border-2 border-dashed border-border rounded-lg py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer">
                  <Camera className="w-6 h-6" />
                  <span className="text-sm">Attach photo or drag here</span>
                </div>
              </div>

              {/* description */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Description <span className="text-destructive">*</span></label>
                <textarea className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-none" placeholder="Describe the issue in detail…" />
              </div>

              {/* customer */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Customer / Requester</label>
                <input className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search customer…" />
              </div>

              {/* location cascade */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-2">Location <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {["🌆 City", "🏘 Area Group", "🗺 Area", "🏢 Property", "🏗 Floor", "🔲 Zone", "🏠 Unit"].map((lbl) => (
                    <select key={lbl} className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option>{lbl}</option>
                    </select>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Dubai &gt; Marina &gt; Cluster B &gt; Tower A &gt; L3 &gt; Zone N &gt; Unit 301
                </div>
              </div>

              {/* asset */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Asset</label>
                <div className="flex gap-2 mb-2">
                  {["Building Asset", "Unit Asset"].map((a) => (
                    <button key={a} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border text-foreground hover:border-primary">{a}</button>
                  ))}
                </div>
                <input className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search asset by name or tag…" />
              </div>

              {/* fault code */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Fault Code</label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground mb-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" /> Show asset-linked fault codes only
                </label>
                <input className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search fault code…" />
              </div>

              {/* assigned tech */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Assigned Technician</label>
                <input className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search technician…" />
              </div>

              {/* notifications */}
              <div className="mb-6 flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="rounded border-border" /> ✉️ Send Email Notification</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="rounded border-border" /> 📱 Send SMS Notification</label>
              </div>

              {/* submit */}
              <button className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
                Submit Request
              </button>
            </div>
          ) : (
            /* ═══ DETAIL VIEW ═══ */
            <div className="fade-in">
              {/* top */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
                <h2 className="text-xl font-bold text-foreground">{selected.title}</h2>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-muted"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              </div>

              <div className="px-5 py-4">
                {/* status & basic fields */}
                <CollapsibleSection title="Status & Details" id="status">
                  <Field label="Status" value={selected.status} badge badgeClass={`${selected.status === "Pending" ? "bg-amber-100 text-amber-700" : selected.status === "Open" ? "bg-emerald-100 text-emerald-700" : selected.status === "In Progress" ? "bg-blue-100 text-blue-700" : selected.status === "Escalated" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`} />
                  <Field label="SLA Status" value={selected.slaStatus || "—"} badge badgeClass={`${selected.slaStatus === "Pending" ? "bg-amber-100 text-amber-700" : selected.slaStatus === "At Risk" ? "bg-orange-100 text-orange-700" : selected.slaStatus === "Breached" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`} />
                  <Field label="Priority" value={selected.priority} badge badgeClass={priorityClass[selected.priority]} />
                  <Field label="Category" value={selected.category} />
                  <Field label="Series" value={selected.series} />
                  <Field label="Request Date" value={selected.requestDate} />
                </CollapsibleSection>

                {/* assignment */}
                <CollapsibleSection title="Assignment" id="assignment">
                  <Field label="Assigned Technician" value={selected.assignedTech} />
                  <Field label="Requested By" value={selected.requestedBy} />
                  <Field label="Customer" value={selected.customer} />
                  <Field label="Contact Person" value={selected.contactPerson} />
                  <Field label="Mobile No" value={selected.mobile} />
                  <Field label="Email" value={selected.email} />
                </CollapsibleSection>

                {/* description */}
                <CollapsibleSection title="Description" id="description">
                  <p className="text-sm text-foreground leading-relaxed">{selected.description || "—"}</p>
                  <div className="mt-3 w-24 h-20 rounded-lg bg-muted flex items-center justify-center">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CollapsibleSection>

                {/* location */}
                <CollapsibleSection title="Location & Routing" id="location">
                  <Field label="Property" value={selected.property} />
                  <Field label="Floor" value={selected.floor} />
                  <Field label="Unit" value={selected.unit} />
                  <Field label="Zone" value={selected.zone} />
                  <Field label="Sub Zone" value={selected.subZone} />
                  <Field label="Asset Type" value={selected.assetType} />
                  <Field label="CAFM Asset" value={selected.cafmAsset} link />
                </CollapsibleSection>

                {/* SLA */}
                <CollapsibleSection title="SLA & Deadlines" id="sla">
                  <Field label="SLA Policy" value={selected.slaPolicy} />
                  <Field label="Response Deadline" value={selected.responseDeadline} />
                  <Field label="Resolution Deadline" value={selected.resolutionDeadline} />
                  <Field label="Actual Response" value={selected.actualResponse} />
                  <Field label="Actual Resolution" value={selected.actualResolution} />
                </CollapsibleSection>

                {/* notifications */}
                <div className="border-b border-border py-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Notifications</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> Send Email Notification</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground flex items-center gap-2"><Smartphone className="w-4 h-4 text-muted-foreground" /> Send SMS Notification</span>
                      <Switch />
                    </div>
                  </div>
                </div>

                {/* internal notes */}
                <div className="border-b border-border py-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Internal Notes</h3>
                  <textarea className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none" placeholder="Add internal notes…" />
                </div>

                {/* convert button */}
                <div className="py-5">
                  <button className="w-full py-3 border-2 border-primary text-primary rounded-lg text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2">
                    <ChevronRight className="w-4 h-4" /> Convert to Work Order
                  </button>
                </div>
              </div>
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
              <button onClick={() => setShowPortals(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
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

              {/* sample portal */}
              <div className="border border-border rounded-xl p-4 flex gap-3">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Lobby Request Portal</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Al Barsha Tower A · Lobby</p>
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
