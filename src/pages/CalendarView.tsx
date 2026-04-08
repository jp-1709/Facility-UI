import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react";

interface CalEvent {
  time: string;
  title: string;
  color: string;
}

const eventColors: Record<string, string> = {
  cleaning: "bg-teal-500",
  maintenance: "bg-emerald-600",
  inspection: "bg-orange-500",
  security: "bg-red-500",
  ppm: "bg-blue-700",
  it: "bg-violet-500",
  landscaping: "bg-lime-500",
  pest: "bg-pink-500",
  schedule: "bg-yellow-500",
};

const legendItems = [
  { label: "Cleaning Requests", color: "bg-teal-500" },
  { label: "Maintenance", color: "bg-emerald-600" },
  { label: "Inspections", color: "bg-orange-500" },
  { label: "Security", color: "bg-red-500" },
  { label: "Preventive Maintenance", color: "bg-blue-700" },
  { label: "IT Requests", color: "bg-violet-500" },
  { label: "Landscaping", color: "bg-lime-500" },
  { label: "Pest Control", color: "bg-pink-500" },
  { label: "Schedule Requests", color: "bg-yellow-500" },
];

// April 2026 events
const eventsMap: Record<number, CalEvent[]> = {
  1: [
    { time: "09:00", title: "PPM Chiller Q1", color: eventColors.ppm },
    { time: "06:00", title: "Office L3 Clean", color: eventColors.cleaning },
  ],
  2: [{ time: "10:00", title: "Fire Ext Inspect", color: eventColors.inspection }],
  3: [
    { time: "09:00", title: "CCTV Review", color: eventColors.security },
    { time: "08:00", title: "Garden Maint", color: eventColors.landscaping },
  ],
  4: [{ time: "14:00", title: "Generator Test", color: eventColors.maintenance }],
  5: [
    { time: "06:00", title: "Lobby Deep Clean", color: eventColors.cleaning },
    { time: "07:00", title: "Pest Control", color: eventColors.pest },
  ],
  6: [
    { time: "09:00", title: "Weekly AC Service", color: eventColors.maintenance },
    { time: "07:00", title: "Lobby Clean", color: eventColors.cleaning },
    { time: "08:00", title: "CCTV Patrol", color: eventColors.security },
    { time: "10:00", title: "IT Server Check", color: eventColors.it },
  ],
  7: [
    { time: "10:00", title: "Fire Inspection", color: eventColors.inspection },
    { time: "09:00", title: "PPM Chiller A", color: eventColors.ppm },
  ],
  8: [
    { time: "06:00", title: "Pest Control", color: eventColors.pest },
    { time: "14:00", title: "Generator Test", color: eventColors.maintenance },
  ],
  9: [
    { time: "09:00", title: "Monthly HSE Audit", color: eventColors.inspection },
    { time: "11:00", title: "CCTV Quarterly", color: eventColors.security },
    { time: "14:00", title: "Landscape Review", color: eventColors.landscaping },
  ],
  12: [{ time: "08:00", title: "Elevator PM", color: eventColors.ppm }],
  14: [{ time: "09:00", title: "AC Filter Change", color: eventColors.maintenance }],
  15: [
    { time: "06:00", title: "Full Floor Clean", color: eventColors.cleaning },
    { time: "10:00", title: "Fire Drill", color: eventColors.inspection },
  ],
  20: [{ time: "09:00", title: "PPM AHU-L3", color: eventColors.ppm }],
  22: [{ time: "07:00", title: "Pest Control", color: eventColors.pest }],
  25: [{ time: "09:00", title: "BMS Health Check", color: eventColors.it }],
  28: [
    { time: "06:00", title: "Deep Clean L2", color: eventColors.cleaning },
    { time: "10:00", title: "Fire Ext Check", color: eventColors.inspection },
  ],
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TODAY = 8; // April 8

function getApril2026Grid(): (number | null)[][] {
  // April 1, 2026 is Wednesday (index 3)
  const startDay = 3;
  const daysInMonth = 30;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default function CalendarView() {
  const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const weeks = getApril2026Grid();

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Calendar</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
            <span className="text-sm font-semibold text-foreground px-2">April 2026</span>
            <button className="p-1.5 rounded hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <button className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors">Today</button>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["month", "week", "agenda"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{v}</button>
            ))}
          </div>
          <button className="filter-chip"><Filter className="w-3.5 h-3.5" /> Filter</button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"><Plus className="w-3.5 h-3.5" /> Add Event</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border flex-wrap">
        {legendItems.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
            <span className="text-[11px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2 border-r border-border last:border-r-0">{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className={`grid grid-cols-7 min-h-[120px] ${wi % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>
            {week.map((day, di) => {
              const events = day ? eventsMap[day] || [] : [];
              const isToday = day === TODAY;
              const maxShow = 3;
              return (
                <div key={di} className="border-r border-b border-border last:border-r-0 p-1.5 relative group hover:bg-primary/[0.02] transition-colors">
                  {day && (
                    <>
                      <div className="mb-1">
                        <span className={`inline-flex items-center justify-center text-xs font-semibold w-6 h-6 rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>{day}</span>
                      </div>
                      <div className="space-y-0.5">
                        {events.slice(0, maxShow).map((e, ei) => (
                          <div key={ei} className={`${e.color} text-white text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-90 transition-opacity`}>
                            {e.time} {e.title}
                          </div>
                        ))}
                        {events.length > maxShow && (
                          <div className="text-[10px] text-primary font-medium px-1.5 cursor-pointer hover:underline">+{events.length - maxShow} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
