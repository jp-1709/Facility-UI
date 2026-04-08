import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from "recharts";

const lineData = [
  { date: "01/07", created: 20, reactive: 98 },
  { date: "01/14", created: 100, reactive: 107 },
  { date: "01/21", created: 90, reactive: 79 },
  { date: "01/28", created: 140, reactive: 123 },
  { date: "02/04", created: 175, reactive: 119 },
  { date: "02/11", created: 300, reactive: 97 },
];

const barData = [
  { date: "01/07", reactive: 98, other: 44 },
  { date: "01/14", reactive: 107, other: 52 },
  { date: "01/21", reactive: 79, other: 31 },
  { date: "01/28", reactive: 123, other: 85 },
  { date: "02/04", reactive: 119, other: 28 },
  { date: "02/11", reactive: 97, other: 47 },
];

const statusData = [
  { name: "Open", value: 332, color: "#2196F3" },
  { name: "On Hold", value: 90, color: "#FF9800" },
  { name: "In Progress", value: 271, color: "#4CAF50" },
  { name: "Done", value: 346, color: "#00BCD4" },
];

const priorityData = [
  { name: "None", value: 351, color: "#2196F3" },
  { name: "Low", value: 235, color: "#4CAF50" },
  { name: "Medium", value: 408, color: "#FF9800" },
  { name: "High", value: 31, color: "#f44336" },
];

const tabs = ["Summary", "Reporting Details", "Recent Activity", "Export Data >"];

export default function Reporting() {
  const [activeTab, setActiveTab] = useState("Summary");

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div>
          <h1 className="text-lg font-semibold text-primary">Monthly Reports ▾</h1>
          <p className="text-xs text-muted-foreground">Showing from May 2020 to December 2020</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Organizations</button>
          <button className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Filter</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border bg-card px-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Charts Row 1 */}
        <div className="grid grid-cols-2 gap-6">
          {/* Line Chart */}
          <div className="bg-card border border-border rounded-xl p-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,92%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215,14%,46%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215,14%,46%)" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(214,20%,92%)" }} />
                <Line type="monotone" dataKey="created" stroke="#2196F3" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="reactive" stroke="#00BCD4" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="bg-card border border-border rounded-xl p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,92%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215,14%,46%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215,14%,46%)" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(214,20%,92%)" }} />
                <Bar dataKey="reactive" fill="#2196F3" radius={[2, 2, 0, 0]} />
                <Bar dataKey="other" fill="#64B5F6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-end gap-2 mt-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-sm bg-[#2196F3] inline-block" /> Reactive: <strong className="text-foreground">401</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Charts Row 2 - Donuts */}
        <div className="grid grid-cols-2 gap-6">
          {/* Status Donut */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-base font-semibold text-foreground mb-1">Status &gt;</h3>
            <div className="flex items-center gap-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {statusData.map((s) => (
                  <div key={s.name}>
                    <div className="text-3xl font-bold text-foreground">{s.value}</div>
                    <span className="donut-label mt-1" style={{ borderColor: s.color, color: s.color }}>
                      {s.name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-[180px] h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({ value }) => value}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Priority Donut */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-base font-semibold text-foreground mb-1">Priority &gt;</h3>
            <div className="flex items-center gap-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {priorityData.map((p) => (
                  <div key={p.name}>
                    <div className="text-3xl font-bold text-foreground">{p.value}</div>
                    <span className="donut-label mt-1" style={{ borderColor: p.color, color: p.color }}>
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-[180px] h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({ value }) => value}>
                      {priorityData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Inspections */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground">Inspections & Timing</h3>
          <p className="text-sm text-muted-foreground mt-1">Detailed inspection reports will appear here.</p>
        </div>
      </div>
    </div>
  );
}
