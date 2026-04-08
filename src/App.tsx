import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import WorkOrders from "@/pages/WorkOrders";
import Reporting from "@/pages/Reporting";
import Assets from "@/pages/Assets";
import CalendarView from "@/pages/CalendarView";
import PlaceholderPage from "@/pages/PlaceholderPage";
import Requests from "@/pages/Requests";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<WorkOrders />} />
            <Route path="/reporting" element={<Reporting />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/messages" element={<PlaceholderPage title="Messages" />} />
            <Route path="/categories" element={<PlaceholderPage title="Categories" />} />
            <Route path="/parts" element={<PlaceholderPage title="Parts Inventory" />} />
            <Route path="/procedures" element={<PlaceholderPage title="Procedure Library" />} />
            <Route path="/meters" element={<PlaceholderPage title="Meters" />} />
            <Route path="/locations" element={<PlaceholderPage title="Locations" />} />
            <Route path="/teams" element={<PlaceholderPage title="Teams / Users" />} />
            <Route path="/vendors" element={<PlaceholderPage title="Vendors" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
