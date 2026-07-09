import { lazy, Suspense, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/ThemeProvider"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Layout } from "@/components/layout/Layout"
import { PageLoading } from "@/components/PageLoading"
import { Toaster } from "sonner"
import { SWRConfig } from "swr"
import { swrFetcher } from "@/lib/api"
import { mutate } from "swr"
import { syncChannel, type SyncEventPayload } from "@/lib/broadcast"

// Lazy load pages to optimize bundle size
const Login = lazy(() => import("@/pages/Login").then(m => ({ default: m.Login })))
const Home = lazy(() => import("@/pages/Home").then(m => ({ default: m.Home })))
const Dashboard = lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.Dashboard })))
const Inventory = lazy(() => import("@/pages/Inventory").then(m => ({ default: m.Inventory })))
const Transactions = lazy(() => import("@/pages/Transactions").then(m => ({ default: m.Transactions })))
const Reports = lazy(() => import("@/pages/Reports").then(m => ({ default: m.Reports })))
const Settings = lazy(() => import("@/pages/Settings").then(m => ({ default: m.Settings })))
const AuditLogs = lazy(() => import("@/pages/AuditLogs").then(m => ({ default: m.AuditLogs })))
const Approvals = lazy(() => import("@/pages/Approvals").then(m => ({ default: m.Approvals })))
const Payroll = lazy(() => import("@/pages/Payroll").then(m => ({ default: m.Payroll })))
const Piutang = lazy(() => import("@/pages/Piutang").then(m => ({ default: m.Piutang })))
const Hutang = lazy(() => import("@/pages/Hutang").then(m => ({ default: m.Hutang })))
const Customers = lazy(() => import("@/pages/Customers").then(m => ({ default: m.Customers })))
const Suppliers = lazy(() => import("@/pages/Suppliers").then(m => ({ default: m.Suppliers })))

const Services = lazy(() => import("@/pages/Services").then(m => ({ default: m.Services })))

const StockOpname = lazy(() => import("@/pages/StockOpname").then(m => ({ default: m.StockOpname })))
const StockTransfer = lazy(() => import("@/pages/StockTransfer").then(m => ({ default: m.StockTransfer })))
const NotFound = lazy(() => import("@/pages/NotFound").then(m => ({ default: m.NotFound })))
const PublicInvoice = lazy(() => import("@/pages/PublicInvoice").then(m => ({ default: m.PublicInvoice })))
const PublicServiceReceipt = lazy(() => import("@/pages/PublicServiceReceipt").then(m => ({ default: m.PublicServiceReceipt })))
const Procurement = lazy(() => import("@/pages/Procurement").then(m => ({ default: m.Procurement })))
const CrmManagement = lazy(() => import("@/pages/CrmManagement").then(m => ({ default: m.CrmManagement })))
const Reconciliation = lazy(() => import("@/pages/Reconciliation").then(m => ({ default: m.Reconciliation })))
const PublicCatalog = lazy(() => import("@/pages/PublicCatalog").then(m => ({ default: m.PublicCatalog })))
const LandingPage = lazy(() => import("@/pages/LandingPage").then(m => ({ default: m.LandingPage })))
const DigitalPassport = lazy(() => import("@/pages/DigitalPassport").then(m => ({ default: m.DigitalPassport })))

function App() {
  useEffect(() => {
    const channel = syncChannel.getInstance();
    
    const handleMessage = (event: MessageEvent<SyncEventPayload>) => {
      if (event.data?.type === 'api.mutated' && event.data?.route) {
        mutate(
          (key) => typeof key === 'string' && key.startsWith(event.data.route),
          undefined,
          { revalidate: true }
        );
      }
    };
    
    channel.addEventListener('message', handleMessage);
    
    return () => {
      channel.removeEventListener('message', handleMessage);
      // We don't close the singleton channel here because it might be used by apiFetch,
      // but cleaning up the listener prevents memory leaks!
    };
  }, []);

  return (
    <ErrorBoundary>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <SWRConfig 
        value={{ 
          fetcher: swrFetcher,
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
              <Route path="/" element={<LandingPage />} />

              <Route element={<Layout />}>
                <Route path="/admin" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/passports" element={<DigitalPassport />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/piutang" element={<Piutang />} />
                <Route path="/hutang" element={<Hutang />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/technicians" element={<Navigate to="/payroll?tab=teknisi" replace />} />
                <Route path="/services" element={<Services />} />
                <Route path="/opname" element={<StockOpname />} />
                <Route path="/transfer" element={<StockTransfer />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/audit" element={<AuditLogs />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/procurement" element={<Procurement />} />
                <Route path="/crm" element={<CrmManagement />} />
                <Route path="/reconciliation" element={<Reconciliation />} />
                <Route path="/financial" element={<Navigate to="/reports" replace />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SWRConfig>
      <Toaster position="top-center" richColors theme="system" className="mt-4 md:mt-4" />
    </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
