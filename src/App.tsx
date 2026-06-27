import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/ThemeProvider"
import { Layout } from "@/components/layout/Layout"
import { PageLoading } from "@/components/PageLoading"
import { Toaster } from "sonner"
import { SWRConfig } from "swr"

// Lazy load pages to optimize bundle size
const Login = lazy(() => import("@/pages/Login").then(m => ({ default: m.Login })))
const Home = lazy(() => import("@/pages/Home").then(m => ({ default: m.Home })))
const Dashboard = lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.Dashboard })))
const Inventory = lazy(() => import("@/pages/Inventory").then(m => ({ default: m.Inventory })))
const Transactions = lazy(() => import("@/pages/Transactions").then(m => ({ default: m.Transactions })))
const Reports = lazy(() => import("@/pages/Reports").then(m => ({ default: m.Reports })))
const Settings = lazy(() => import("@/pages/Settings").then(m => ({ default: m.Settings })))
const Payroll = lazy(() => import("@/pages/Payroll").then(m => ({ default: m.Payroll })))
const Piutang = lazy(() => import("@/pages/Piutang").then(m => ({ default: m.Piutang })))
const Hutang = lazy(() => import("@/pages/Hutang").then(m => ({ default: m.Hutang })))
const Customers = lazy(() => import("@/pages/Customers").then(m => ({ default: m.Customers })))
const Suppliers = lazy(() => import("@/pages/Suppliers").then(m => ({ default: m.Suppliers })))
const Technicians = lazy(() => import("@/pages/Technicians").then(m => ({ default: m.Technicians })))
const Services = lazy(() => import("@/pages/Services").then(m => ({ default: m.Services })))
const WarrantyCheck = lazy(() => import("@/pages/WarrantyCheck").then(m => ({ default: m.WarrantyCheck })))
const StockOpname = lazy(() => import("@/pages/StockOpname").then(m => ({ default: m.StockOpname })))
const StockTransfer = lazy(() => import("@/pages/StockTransfer").then(m => ({ default: m.StockTransfer })))
const NotFound = lazy(() => import("@/pages/NotFound").then(m => ({ default: m.NotFound })))
const PublicInvoice = lazy(() => import("@/pages/PublicInvoice").then(m => ({ default: m.PublicInvoice })))
const PublicServiceReceipt = lazy(() => import("@/pages/PublicServiceReceipt").then(m => ({ default: m.PublicServiceReceipt })))
const Procurement = lazy(() => import("@/pages/Procurement").then(m => ({ default: m.Procurement })))
const CrmManagement = lazy(() => import("@/pages/CrmManagement").then(m => ({ default: m.CrmManagement })))
const Reconciliation = lazy(() => import("@/pages/Reconciliation").then(m => ({ default: m.Reconciliation })))
const PublicCatalog = lazy(() => import("@/pages/PublicCatalog").then(m => ({ default: m.PublicCatalog })))

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <SWRConfig 
        value={{ 
          fetcher: async (url: string) => {
            const res = await fetch(url, {
              credentials: 'include',
              headers: {
                'x-store-id': localStorage.getItem('selectedStoreId') || 'all'
              }
            });
            if (!res.ok) {
              const errorBody = await res.json().catch(() => ({ error: res.statusText }));
              const error = new Error(errorBody.error || `HTTP ${res.status}`);
              (error as any).status = res.status;
              (error as any).info = errorBody;
              throw error;
            }
            return res.json();
          },
          revalidateOnFocus: false, // MATIKAN auto-refresh saat pindah tab (Hemat Turso Reads)
          revalidateOnReconnect: true,
          dedupingInterval: 5000,
          onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
            // Don't retry on auth errors
            if ((error as any).status === 401 || (error as any).status === 403) return;
            // Only retry up to 3 times
            if (retryCount >= 3) return;
            setTimeout(() => revalidate({ retryCount }), 5000);
          },
        }}
      >
        <BrowserRouter>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/nota/:id" element={<PublicInvoice />} />
              <Route path="/nota-servis/:id" element={<PublicServiceReceipt />} />
              <Route path="/catalog/:slug" element={<PublicCatalog />} />

              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/piutang" element={<Piutang />} />
                <Route path="/hutang" element={<Hutang />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/technicians" element={<Technicians />} />
                <Route path="/services" element={<Services />} />
                <Route path="/warranty" element={<WarrantyCheck />} />
                <Route path="/opname" element={<StockOpname />} />
                <Route path="/transfer" element={<StockTransfer />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/procurement" element={<Procurement />} />
                <Route path="/crm" element={<CrmManagement />} />
                <Route path="/reconciliation" element={<Reconciliation />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SWRConfig>
      <Toaster position="top-center" richColors theme="system" className="mt-4 md:mt-4" />
    </ThemeProvider>
  )
}

export default App
