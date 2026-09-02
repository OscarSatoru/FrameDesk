import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import Index from './pages/Index';
import QuoteEditor from './pages/QuoteEditor';
import PrintPreview from './pages/PrintPreview';
import Admin from './pages/Admin';
import ClientPortal from './pages/ClientPortal';
import { getCurrentUser } from '@/lib/storage';

const queryClient = new QueryClient();

function RequireAdmin({ children }: { children: ReactNode }) {
  const user = getCurrentUser();
  const role = (user?.role as string) || '';
  const hasAccess = role === 'admin' || role === 'sub_admin' || role === 'מנהל';
  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RequireStaff({ children }: { children: ReactNode }) {
  const user = getCurrentUser();
  if (user?.role === 'viewer') {
    return <Navigate to="/portal" replace />;
  }
  return <>{children}</>;
}

function MainView() {
  const user = getCurrentUser();
  if (user?.role === 'viewer') {
    return <ClientPortal />;
  }
  return <Index />;
}

const AppRoutes = () => (
  <AppShell>
    <Routes>
      <Route path="/" element={<MainView />} />
      <Route path="/portal" element={<ClientPortal />} />
      <Route
        path="/quotes/new"
        element={
          <RequireStaff>
            <QuoteEditor />
          </RequireStaff>
        }
      />
      <Route
        path="/quotes/:id"
        element={
          <RequireStaff>
            <QuoteEditor />
          </RequireStaff>
        }
      />
      <Route path="/quotes/:id/print" element={<PrintPreview />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <Admin />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AppShell>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="bottom-right" richColors />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
export { AppRoutes };