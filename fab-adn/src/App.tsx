import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedRouteAdmin from "./components/ProtectedRoutedAdmin";
import SessionWatcher from "./components/sessionWatcher";
import PageTransition from "./components/PageTransition";
import { PageSkeleton } from "./components/ui/skeleton";
import { AdminLayout } from "./components/admin/AdminLayout";

const Index = lazy(() => import("./pages/Index"));
const Servicios = lazy(() => import("./pages/Servicios"));
const Mecanicos = lazy(() => import("./pages/Mecanicos"));
const Contacto = lazy(() => import("./pages/Contacto"));
const Ubicacion = lazy(() => import("./pages/Ubicacion"));
const Login = lazy(() => import("./pages/Login"));
const RegistroCliente = lazy(() => import("./pages/RegistroCliente"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then(m => ({ default: m.AdminDashboard || m.default })));
const EmpleadoPanel = lazy(() => import("./pages/EmpleadoPanel"));
const ClienteHome = lazy(() => import("./pages/ClienteHome"));
const Perfil = lazy(() => import("./pages/Perfil"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const VerificarEmail = lazy(() => import("./pages/VerificarEmail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const GestionUsuarios = lazy(() => import("./pages/admin/GestionUsuarios"));
const GestionRoles = lazy(() => import("./pages/admin/GestionRoles"));
const AdminTrabajos = lazy(() => import("./pages/AdminTrabajos").then(m => ({ default: m.AdminTrabajos })));
const FacturaView = lazy(() => import("./pages/FacturaView"));
const InventarioPage = lazy(() => import("./pages/admin/InventarioPage"));
const ReportesPage = lazy(() => import("./pages/admin/ReportesPage"));
const FinanzasPage = lazy(() => import("./pages/admin/FinanzasPage"));
const MisCitas = lazy(() => import("./pages/MisCitas").then(m => ({ default: m.MisCitas })));
const HistorialClinicoPage = lazy(() => import("./pages/admin/HistorialClinicoPage"));
const MantenimientoPreventivoPage = lazy(() => import("./pages/admin/MantenimientoPreventivoPage"));

const queryClient = new QueryClient();

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <Navbar />
    <PageTransition>{children}</PageTransition>
    <Footer />
    <WhatsAppButton />
  </>
);

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Suspense fallback={<PageSkeleton />}><PublicLayout><Index /></PublicLayout></Suspense>} />
        <Route path="/servicios" element={<Suspense fallback={<PageSkeleton type="services" />}><PublicLayout><Servicios /></PublicLayout></Suspense>} />
        <Route path="/mecanicos" element={<Suspense fallback={<PageSkeleton type="mechanics" />}><PublicLayout><Mecanicos /></PublicLayout></Suspense>} />
        <Route path="/contacto" element={<Suspense fallback={<PageSkeleton />}><PublicLayout><Contacto /></PublicLayout></Suspense>} />
        <Route path="/ubicacion" element={<Suspense fallback={<PageSkeleton />}><PublicLayout><Ubicacion /></PublicLayout></Suspense>} />

        <Route path="/login" element={<Suspense fallback={<PageSkeleton />}><Login /></Suspense>} />
        <Route path="/registro" element={<Suspense fallback={<PageSkeleton />}><RegistroCliente /></Suspense>} />
        <Route path="/verificar-email" element={<Suspense fallback={<PageSkeleton />}><VerificarEmail /></Suspense>} />
        <Route path="/verify-email" element={<Suspense fallback={<PageSkeleton />}><VerifyEmail /></Suspense>} />

        <Route path="/perfil" element={
          <ProtectedRoute allowedRoles={["admin", "empleado", "cliente"]}>
            <Suspense fallback={<PageSkeleton />}>
              <Perfil />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/cliente" element={
          <ProtectedRoute allowedRoles={["cliente", "admin"]}>
            <Suspense fallback={<PageSkeleton />}>
              <ClienteHome />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/cliente/home" element={
          <ProtectedRoute allowedRoles={["cliente", "admin"]}>
            <Suspense fallback={<PageSkeleton />}>
              <ClienteHome />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Rutas de Administración con Alias Flexibles */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><AdminDashboard /></AdminLayout>
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><AdminDashboard /></AdminLayout>
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/empleado/dashboard" element={
          <ProtectedRoute allowedRoles={["empleado", "admin"]}>
            <Suspense fallback={<PageSkeleton />}><EmpleadoPanel /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/usuarios" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><GestionUsuarios /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />
        <Route path="/admin/usuarios" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><GestionUsuarios /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />

        <Route path="/trabajos" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><AdminTrabajos /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />
        <Route path="/admin/trabajos" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><AdminTrabajos /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />

        <Route path="/roles" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><GestionRoles /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />
        <Route path="/admin/roles" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><GestionRoles /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />

        <Route path="/inventario" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><InventarioPage /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />
        <Route path="/admin/inventario" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><InventarioPage /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />

        <Route path="/reportes" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><ReportesPage /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />
        <Route path="/admin/reportes" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><ReportesPage /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />

        <Route path="/finanzas" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><FinanzasPage /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />
        <Route path="/admin/finanzas" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><FinanzasPage /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />

        <Route path="/historial-vehiculo" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><HistorialClinicoPage /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />
        <Route path="/admin/historial-vehiculo" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><HistorialClinicoPage /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />

        <Route path="/mantenimiento-preventivo" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><MantenimientoPreventivoPage /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />
        <Route path="/admin/mantenimiento-preventivo" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><MantenimientoPreventivoPage /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />

        <Route path="/cliente/mis-citas" element={
          <ProtectedRoute allowedRoles={["cliente", "admin"]}>
            <Suspense fallback={<PageSkeleton />}><MisCitas /></Suspense>
          </ProtectedRoute>
        } />

        <Route path="/factura/:id" element={
          <Suspense fallback={<PageSkeleton />}><FacturaView /></Suspense>
        } />
        <Route path="/facturas/:id" element={
          <Suspense fallback={<PageSkeleton />}><FacturaView /></Suspense>
        } />
        <Route path="/admin/factura/:id" element={
          <ProtectedRouteAdmin>
            <Suspense fallback={<PageSkeleton />}>
              <AdminLayout><FacturaView /></AdminLayout>
            </Suspense>
          </ProtectedRouteAdmin>
        } />

        <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFound /></Suspense>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SessionWatcher />
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
