import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Overview from "./pages/Overview";
import AccountantReport from "./pages/AccountantReport";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import PublicUpload from "./pages/PublicUpload";
import Admin from "./pages/Admin";
import Suppliers from "./pages/Suppliers";
import Analytics from "./pages/Analytics";
import Trash from "./pages/Trash";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" dir="rtl" />
      <BrowserRouter>
        <Routes>
          {/* Public routes - no AppLayout */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/upload/:linkCode" element={<PublicUpload />} />
          <Route path="/report" element={<AccountantReport />} />

          {/* Protected routes with AppLayout */}
          <Route
            path="/dashboard"
            element={
              <AppLayout>
                <Overview />
              </AppLayout>
            }
          />
          <Route
            path="/invoices"
            element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <AppLayout>
                <Settings />
              </AppLayout>
            }
          />
          <Route
            path="/admin"
            element={
              <AppLayout>
                <Admin />
              </AppLayout>
            }
          />

          {/* Feature routes */}
          <Route
            path="/suppliers"
            element={
              <AppLayout>
                <Suppliers />
              </AppLayout>
            }
          />

          {/* Feature routes */}
          <Route
            path="/analytics"
            element={
              <AppLayout>
                <Analytics />
              </AppLayout>
            }
          />
          <Route
            path="/categories"
            element={
              <AppLayout>
                <div className="p-6">
                  <h1 className="text-3xl font-bold">קטגוריות</h1>
                  <p className="text-muted-foreground mt-2">בקרוב...</p>
                </div>
              </AppLayout>
            }
          />
          <Route
            path="/upload-links"
            element={
              <AppLayout>
                <div className="p-6">
                  <h1 className="text-3xl font-bold">העלאות ציבוריות</h1>
                  <p className="text-muted-foreground mt-2">בקרוב...</p>
                </div>
              </AppLayout>
            }
          />
          <Route
            path="/trash"
            element={
              <AppLayout>
                <Trash />
              </AppLayout>
            }
          />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
