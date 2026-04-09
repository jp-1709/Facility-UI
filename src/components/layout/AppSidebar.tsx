import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardList, BarChart3, MessageSquare, Tag, Package, FileText,
  Gauge, MapPin, Users, Truck, HelpCircle, Inbox, CalendarDays,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { icon: ClipboardList, label: "Work Orders", path: "/" },
  { icon: BarChart3, label: "Reporting", path: "/reporting" },
  { icon: Inbox, label: "Requests", path: "/requests" },
  { icon: Package, label: "Assets", path: "/assets" },
  { icon: FileText, label: "Contracts", path: "/contracts" },
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={`
        ${isCollapsed ? "w-[70px]" : "w-[220px]"} 
        transition-all duration-300 ease-in-out 
        bg-card border-r border-border flex flex-col h-full relative
      `}
    >
      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-12 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center z-50 hover:bg-accent text-muted-foreground transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Logo */}
      <div className={`px-4 pt-6 pb-4 flex flex-col items-center transition-all ${isCollapsed ? "px-2" : "px-4"}`}>
        <div className={`
          ${isCollapsed ? "w-10 h-10 rounded-lg" : "w-14 h-14 rounded-xl"} 
          bg-primary flex items-center justify-center transition-all duration-300
        `}>
          <span className={`${isCollapsed ? "text-xl" : "text-2xl"} text-primary-foreground font-extrabold transition-all`}>Q</span>
        </div>
      </div>

      {/* Search/Location Area */}
      <div className={`px-3 mb-2 transition-all duration-300 ${isCollapsed ? "scale-0 opacity-0 h-0 mb-0" : "scale-100 opacity-100 h-auto"}`}>
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="text-xs truncate">2 Main Demo (0...</span>
          <span className="ml-auto text-[10px]">▾</span>
        </div>
      </div>

      {/* Nav */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 overflow-y-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            const content = (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  nav-item-base w-full mb-0.5
                  ${isActive ? "nav-item-active" : ""} 
                  ${isCollapsed ? "justify-center px-0 rounded-md mx-2 w-[calc(100%-16px)]" : "rounded-r-full pr-4"}
                  transition-all duration-200
                `}
              >
                <item.icon className={`${isCollapsed ? "w-5 h-5" : "w-4 h-4"} shrink-0 transition-all`} />
                {!isCollapsed && <span className="truncate font-medium">{item.label}</span>}
              </button>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    {content}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="ml-2">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return content;
          })}
        </nav>
      </TooltipProvider>

      {/* Footer */}
      <div className={`border-t border-border py-4 transition-all duration-300 ${isCollapsed ? "px-2 items-center" : "px-4"}`}>
        <button className={`
          text-sm text-primary hover:underline font-medium transition-all group flex items-center gap-2
          ${isCollapsed ? "justify-center w-full" : ""}
        `}>
          <HelpCircle className={`w-4 h-4 shrink-0 ${isCollapsed ? "text-primary" : "hidden"}`} />
          {!isCollapsed && <span>Contact Support</span>}
        </button>
      </div>
    </aside>
  );
}
