import { useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardList, BarChart3, MessageSquare, Tag, Package, FileText,
  Gauge, MapPin, Users, Truck, HelpCircle, Inbox, CalendarDays
} from "lucide-react";

const navItems = [
  { icon: ClipboardList, label: "Work Orders", path: "/" },
  { icon: BarChart3, label: "Reporting", path: "/reporting" },
  { icon: Inbox, label: "Requests", path: "/requests" },
  { icon: Package, label: "Assets", path: "/assets" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
  { icon: MessageSquare, label: "Messages", path: "/messages" },
  { icon: Tag, label: "Categories", path: "/categories" },
  { icon: Package, label: "Parts Inventory", path: "/parts" },
  { icon: FileText, label: "Procedure Library", path: "/procedures" },
  { icon: Gauge, label: "Meters", path: "/meters" },
  { icon: MapPin, label: "Locations", path: "/locations" },
  { icon: Users, label: "Teams / Users", path: "/teams" },
  { icon: Truck, label: "Vendors", path: "/vendors" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="w-[200px] min-w-[200px] bg-card border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex flex-col items-center">
        <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-2">
          <span className="text-primary-foreground text-3xl font-extrabold">Q</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 mb-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="text-xs truncate">2 Main Demo (0...</span>
          <span className="ml-auto text-[10px]">▾</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item-base w-full ${isActive ? "nav-item-active" : ""}`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <button className="text-sm text-primary hover:underline font-medium">Contact Support</button>
      </div>
    </aside>
  );
}
