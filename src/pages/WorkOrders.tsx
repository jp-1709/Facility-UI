import React, { useState } from "react";
import {
  Search, Plus, LayoutList, LayoutGrid, Table2, Calendar, User, CalendarDays,
  MapPin, Tag, Zap, ChevronUp, ChevronDown, MessageSquare, Edit2, MoreVertical,
  Link as LinkIcon, Lock, Pause, RefreshCw, Check, Image as ImageIcon, Send
} from "lucide-react";

// --- MOCK DATA ---
const mockWorkOrders = [
  { id: "WO-101", title: "HVAC Quarterly PPM - Chiller A", status: "Open", priority: "High", icon: "❄️", bg: "bg-blue-100", type: "HVAC" },
  { id: "WO-103", title: "Burst Pipe Repair - Level 2", status: "In Progress", priority: "Critical", icon: "💧", bg: "bg-purple-100", type: "Plumbing" },
  { id: "WO-104", title: "DB Panel Check - Sub Station", status: "Open", priority: "High", icon: "⚡", bg: "bg-orange-100", type: "Electrical" },
  { id: "WO-106", title: "CCTV Maintenance Round", status: "On Hold", priority: "Medium", icon: "🛡️", bg: "bg-red-100", type: "Security" },
  { id: "WO-107", title: "Lobby Deep Clean - L1", status: "Open", priority: "Medium", icon: "🧹", bg: "bg-teal-100", type: "Cleaning" },
  { id: "WO-115", title: "BMS Diagnostic - Roof", status: "Scheduled", priority: "Medium", icon: "🔧", bg: "bg-gray-100", type: "General" },
  { id: "WO-116", title: "Water Tank Clean", status: "In Progress", priority: "High", icon: "💧", bg: "bg-purple-100", type: "Plumbing" },
  { id: "WO-110", title: "Booster Pump Inspection", status: "Open", priority: "Low", icon: "🔧", bg: "bg-gray-100", type: "General" },
  { id: "WO-102", title: "AHU Filter Change - L3", status: "Open", priority: "Medium", icon: "❄️", bg: "bg-blue-100", type: "HVAC" },
  { id: "WO-105", title: "Generator Test - Monthly", status: "Scheduled", priority: "Low", icon: "⚡", bg: "bg-orange-100", type: "Electrical" },
];

export default function WorkOrders() {
  const [viewMode, setViewMode] = useState<"detail" | "new">("detail");
  const [selectedId, setSelectedId] = useState("WO-101");
  const [locOpen, setLocOpen] = useState(true);
  const [slaOpen, setSlaOpen] = useState(true);

  // Helper for priority badge colors
  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-red-100 text-red-700";
      case "High": return "bg-orange-100 text-orange-700";
      case "Medium": return "bg-amber-100 text-amber-700";
      case "Low": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-slate-800 font-sans">
      
      {/* ═════════ TOP BAR ═════════ */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold text-slate-900">Work Orders</h1>
          <div className="flex space-x-2">
            <button className="p-1.5 bg-slate-100 rounded hover:bg-slate-200"><LayoutList className="w-[18px] h-[18px] text-slate-500" /></button>
            <button className="p-1.5 rounded hover:bg-slate-100"><LayoutGrid className="w-[18px] h-[18px] text-slate-500" /></button>
            <button className="p-1.5 rounded hover:bg-slate-100"><Table2 className="w-[18px] h-[18px] text-slate-500" /></button>
            <button className="p-1.5 rounded hover:bg-slate-100"><Calendar className="w-[18px] h-[18px] text-slate-500" /></button>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search Work Orders…" 
              className="w-72 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button 
            onClick={() => setViewMode("new")}
            className="flex items-center px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" /> New Work Order
          </button>
        </div>
      </div>

      {/* ═════════ FILTER ROW ═════════ */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center space-x-2">
          <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50">
            <User className="w-4 h-4 mr-2 text-slate-400" /> Assigned To
          </button>
          <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50">
            <CalendarDays className="w-4 h-4 mr-2 text-slate-400" /> Due Date
          </button>
          <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50">
            <MapPin className="w-4 h-4 mr-2 text-slate-400" /> Location
          </button>
          <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50">
            <Tag className="w-4 h-4 mr-2 text-slate-400" /> Type
          </button>
          <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50">
            <Zap className="w-4 h-4 mr-2 text-slate-400" /> Priority
          </button>
          <button className="flex items-center px-3 py-1.5 text-sm text-slate-600 border border-dashed border-slate-300 rounded-full hover:bg-slate-50">
            <Plus className="w-4 h-4 mr-1" /> Add Filter
          </button>
        </div>
        <button className="text-sm font-medium text-[#2563EB] hover:underline">⭐ My Filters</button>
      </div>

      {/* ═════════ SPLIT PANEL ═════════ */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ═════════ LEFT PANEL (LIST) ═════════ */}
        <div className="w-[380px] border-r border-slate-200 flex flex-col bg-white">
          <div className="flex border-b border-slate-200">
            <button className="flex-1 py-3 text-sm font-medium text-[#2563EB] border-b-2 border-[#2563EB]">To Do</button>
            <button className="flex-1 py-3 text-sm font-medium text-slate-500 hover:text-slate-700">Done</button>
          </div>
          <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100">
            <span className="text-sm text-slate-500">Sort By: <span className="text-[#2563EB] cursor-pointer">Last Updated: Most Recent First ▾</span></span>
            <button className="text-slate-400 hover:text-slate-600"><User className="w-4 h-4" /></button>
          </div>
          <div className="px-4 py-2 bg-slate-50 flex items-center justify-between border-b border-slate-200">
            <span className="text-sm font-semibold text-slate-700">Assigned to Me (3)</span>
            <ChevronUp className="w-4 h-4 text-slate-500" />
          </div>

          <div className="flex-1 overflow-y-auto">
            {mockWorkOrders.map((wo) => (
              <div 
                key={wo.id} 
                onClick={() => { setSelectedId(wo.id); setViewMode("detail"); }}
                className={`flex items-center px-4 h-[48px] border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${selectedId === wo.id && viewMode === "detail" ? "bg-blue-50/50" : ""}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mr-3 ${wo.bg}`}>
                  {wo.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-sm font-semibold text-[#1E293B] truncate pr-2">{wo.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityClasses(wo.priority)}`}>{wo.priority}</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <span className="text-slate-600 hover:text-slate-800 cursor-pointer mr-2">🔒 {wo.status} ▾</span>
                    <span className="text-slate-400">{wo.id}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="py-4 text-center">
              <button className="text-sm text-[#2563EB] font-medium hover:underline">All Open Work Orders →</button>
            </div>
          </div>
        </div>

        {/* ═════════ RIGHT PANEL ═════════ */}
        <div className="flex-1 overflow-y-auto bg-white">
          
          {viewMode === "detail" ? (
            /* --- DETAIL VIEW --- */
            <div className="max-w-4xl mx-auto p-8">
              {/* Top Bar Detail */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">HVAC Quarterly PPM - Chiller A</h2>
                  <button className="flex items-center text-xs text-[#2563EB] mt-1 hover:underline">
                    <LinkIcon className="w-3 h-3 mr-1" /> Copy Link
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md">💬 Comments</button>
                  <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md">✏️ Edit</button>
                  <button className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md"><MoreVertical className="w-5 h-5" /></button>
                </div>
              </div>

              {/* Status Stepper */}
              <div className="mt-8 mb-10">
                <p className="text-sm text-[#64748B] mb-2">Status (Click to Update)</p>
                <div className="flex space-x-2">
                  <button className="flex-1 h-[80px] flex flex-col items-center justify-center rounded-lg bg-[#2563EB] text-white font-medium">
                    <Lock className="w-5 h-5 mb-1" /> Open
                  </button>
                  <button className="flex-1 h-[80px] flex flex-col items-center justify-center rounded-lg bg-white border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 font-medium">
                    <Pause className="w-5 h-5 mb-1 text-slate-400" /> On Hold
                  </button>
                  <button className="flex-1 h-[80px] flex flex-col items-center justify-center rounded-lg bg-white border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 font-medium">
                    <RefreshCw className="w-5 h-5 mb-1 text-slate-400" /> In Progress
                  </button>
                  <button className="flex-1 h-[80px] flex flex-col items-center justify-center rounded-lg bg-white border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 font-medium">
                    <Check className="w-5 h-5 mb-1 text-slate-400" /> Done
                  </button>
                </div>
              </div>

              {/* Detail Fields */}
              <div className="mb-10 border-t border-slate-200">
                {[
                  { label: "Work Order ID", value: "#WO-101", isLink: false },
                  { label: "Service Request", value: "SR-0234", isLink: true },
                  { label: "FM Contract", value: "FMC-2026-008", isLink: true },
                  { label: "Priority", value: "High", badge: true },
                  { label: "Service Category", value: "HVAC / Mechanical", isLink: false },
                  { label: "Scheduled Date", value: "Apr 08, 2026", isLink: false },
                  { label: "Estimated Hours", value: "4 hrs", isLink: false },
                  { label: "Due Date", value: "Apr 09, 2026", isLink: false },
                  { label: "Assigned To", value: "Raj Mehta", avatar: "RM" },
                  { label: "Contractor", value: "GulfTech Services LLC", isLink: false },
                ].map((field, idx) => (
                  <div key={idx} className="flex py-3 border-b border-slate-200">
                    <div className="w-1/3 text-sm text-slate-500">{field.label}</div>
                    <div className="w-2/3 text-sm text-slate-900 font-medium flex items-center">
                      {field.badge ? (
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">🟠 {field.value}</span>
                      ) : field.isLink ? (
                        <span className="text-[#2563EB] hover:underline cursor-pointer">{field.value}</span>
                      ) : field.avatar ? (
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs mr-2">{field.avatar}</div>
                          {field.value}
                        </div>
                      ) : (
                        field.value
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Location Section */}
              <div className="mb-6">
                <button 
                  onClick={() => setLocOpen(!locOpen)} 
                  className="w-full flex items-center justify-between py-2 text-lg font-semibold text-slate-900 border-b border-slate-200 mb-2"
                >
                  Location {locOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {locOpen && (
                  <div className="space-y-3 pt-2">
                    {[
                      { label: "Property", value: "Al Barsha Tower A" },
                      { label: "Floor", value: "Level 3" },
                      { label: "Unit", value: "Unit 301" },
                      { label: "Zone", value: "HVAC Zone North" },
                      { label: "Asset Type", value: "Building Asset" },
                      { label: "CAFM Asset", value: "Chiller-A-QTR-001" },
                    ].map((loc, i) => (
                      <div key={i} className="flex">
                        <div className="w-1/3 text-sm text-slate-500">{loc.label}</div>
                        <div className="w-2/3 text-sm text-slate-900">{loc.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SLA Section */}
              <div className="mb-8">
                <button 
                  onClick={() => setSlaOpen(!slaOpen)} 
                  className="w-full flex items-center justify-between py-2 text-lg font-semibold text-slate-900 border-b border-slate-200 mb-2"
                >
                  SLA & Deadlines {slaOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {slaOpen && (
                  <div className="space-y-3 pt-2">
                    <div className="flex"><div className="w-1/3 text-sm text-slate-500">SLA Policy</div><div className="w-2/3 text-sm text-slate-900">HVAC SLA Gold</div></div>
                    <div className="flex"><div className="w-1/3 text-sm text-slate-500">Response Deadline</div><div className="w-2/3 text-sm text-slate-900">Apr 08, 2026 10:00 AM</div></div>
                    <div className="flex"><div className="w-1/3 text-sm text-slate-500">Resolution Deadline</div><div className="w-2/3 text-sm text-slate-900">Apr 09, 2026 10:00 AM</div></div>
                    <div className="flex"><div className="w-1/3 text-sm text-slate-500">SLA Status</div><div className="w-2/3 text-sm"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">Pending</span></div></div>
                    <div className="flex"><div className="w-1/3 text-sm text-slate-500">Response (Actual)</div><div className="w-2/3 text-sm text-slate-400">—</div></div>
                    <div className="flex"><div className="w-1/3 text-sm text-slate-500">Resolution (Actual)</div><div className="w-2/3 text-sm text-slate-400">—</div></div>
                  </div>
                )}
              </div>

              {/* Time & Cost Tracking */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Time & Cost Tracking</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-sm text-slate-700">Parts</span><button className="text-sm text-[#2563EB] hover:underline">Add &gt;</button></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-slate-700">Time</span><button className="text-sm text-[#2563EB] hover:underline">Add &gt;</button></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-slate-700">Other Costs</span><button className="text-sm text-[#2563EB] hover:underline">Add &gt;</button></div>
                </div>
              </div>

              {/* Procedure / Checklist */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Procedure</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center mb-4">
                  <p className="text-sm text-slate-600 mb-3">📋 Create or attach new Form, Procedure or Checklist</p>
                  <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50">+ Add Procedure</button>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 text-sm text-slate-700"><input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-[#2563EB]" /> <span>Check refrigerant levels and pressure</span></label>
                  <label className="flex items-center space-x-3 text-sm text-slate-700"><input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-[#2563EB]" /> <span>Clean condenser coils and fins</span></label>
                  <label className="flex items-center space-x-3 text-sm text-slate-500 line-through"><span className="text-green-500">✅</span> <span>Inspect thermal expansion valve</span></label>
                </div>
              </div>

              {/* Permits */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Permit</h3>
                <div className="flex mb-2"><div className="w-1/3 text-sm text-slate-500">Permit to Work</div><div className="w-2/3 text-sm text-[#2563EB] hover:underline cursor-pointer">PTW-2026-044</div></div>
                <div className="flex"><div className="w-1/3 text-sm text-slate-500">Risk Assessment</div><div className="w-2/3 text-sm text-[#2563EB] hover:underline cursor-pointer">RA-2026-012</div></div>
              </div>

              {/* Comments */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Comments</h3>
                <div className="flex space-x-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">RM</div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1"><span className="font-semibold text-slate-900">Raj Mehta</span> · 2 hrs ago</div>
                    <p className="text-sm text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">Parts ordered, ETA tomorrow</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="text" placeholder="Add a comment…" className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" />
                  <button className="p-2 bg-[#2563EB] text-white rounded-md hover:bg-blue-700"><Send className="w-4 h-4" /></button>
                </div>
              </div>

            </div>
          ) : (
            /* --- NEW WORK ORDER FORM --- */
            <div className="max-w-4xl mx-auto p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">New Work Order</h2>
              
              <div className="space-y-6">
                {/* General Details */}
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-medium text-slate-800">General Details</div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">WO Title *</label>
                        <input type="text" className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">WO Number</label>
                        <input type="text" className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-slate-50" readOnly placeholder="Auto-generated" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">WO Type *</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]" required>
                          <option value="">Select Type...</option>
                          <option>Reactive Maintenance</option>
                          <option>Planned Preventive</option>
                          <option>Project</option>
                          <option>Inspection</option>
                          <option>Callout</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">WO Sub Type</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                          <option value="">Select Sub Type...</option>
                          <option>Reactive Maintenance</option>
                          <option>Planned Preventive</option>
                          <option>Scheduled</option>
                          <option>Emergency</option>
                          <option>AdHoc</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">WO Source</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                          <option value="">Select Source...</option>
                          <option>Service Request</option>
                          <option>PM Schedule</option>
                          <option>Project</option>
                          <option>Inspection</option>
                          <option>Manual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Service Request</label>
                        <input type="text" className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" placeholder="Select Service Request..." />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client & Contract */}
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-medium text-slate-800">Client & Contract</div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]" required>
                          <option value="">Select Client...</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contract *</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]" required>
                          <option value="">Select Contract...</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Location */}
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-medium text-slate-800">Property Location</div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Property *</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]" required>
                          <option value="">Select Property...</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Zone</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                          <option value="">Select Zone...</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sub Zone</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                          <option value="">Select Sub Zone...</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Base Unit</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                          <option value="">Select Base Unit...</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Reporting Level</label>
                      <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                        <option value="">Select Reporting Level...</option>
                        <option>Property</option>
                        <option>Zone</option>
                        <option>Sub Zone</option>
                        <option>Base Unit</option>
                        <option>Asset</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Asset & Fault */}
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-medium text-slate-800">Asset & Fault</div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Asset</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                          <option value="">Select Asset...</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fault Code</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                          <option value="">Select Fault Code...</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Default Priority</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                          <option value="">Select Priority...</option>
                          <option>P1 - Critical</option>
                          <option>P2 - High</option>
                          <option>P3 - Medium</option>
                          <option>P4 - Low</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Actual Priority *</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]" required>
                          <option value="">Select Priority...</option>
                          <option>P1 - Critical</option>
                          <option>P2 - High</option>
                          <option>P3 - Medium</option>
                          <option>P4 - Low</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Priority Change Reason</label>
                      <textarea rows={2} className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" placeholder="Reason for priority change..."></textarea>
                    </div>
                  </div>
                </div>

                {/* Assignment */}
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-medium text-slate-800">Assignment</div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                          <option value="">Select Assignee...</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assigned By</label>
                        <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]">
                          <option value="">Select Assigner...</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Assignment Change</label>
                      <textarea rows={2} className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" placeholder="Reason for assignment change..."></textarea>
                    </div>
                  </div>
                </div>

                {/* Scheduling */}
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-medium text-slate-800">Scheduling</div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Start Date</label>
                        <input type="date" className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Start Time</label>
                        <input type="time" className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled End Time</label>
                        <input type="time" className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Planned Duration (min)</label>
                        <input type="number" className="w-full p-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#2563EB]" placeholder="Minutes" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-medium text-slate-800">Status</div>
                  <div className="p-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">WO Status *</label>
                      <select className="w-full p-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#2563EB]" required>
                        <option value="Draft">Draft</option>
                        <option value="Open">Open</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Pending Parts">Pending Parts</option>
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="Completed">Completed</option>
                        <option value="Closed">Closed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex space-x-4 pt-4">
                  <button className="flex-1 py-3 bg-[#2563EB] text-white font-semibold rounded-md hover:bg-blue-700 h-[44px]">
                    Create Work Order
                  </button>
                  <button 
                    onClick={() => setViewMode("detail")}
                    className="flex-1 py-3 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300 h-[44px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}