import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import type { ReactNode } from "react";

import AppShell from "./layouts/AppShell";
import AppShellWithTaskSidebarAndContextSidebar from "./layouts/AppShellWithContextSidebar";
import AppShellWithTaskSidebar from "./layouts/AppShellWithTaskSidebar";
import { AuthProvider } from "./shared/auth/AuthProvider";
import RequireAuth from "./shared/auth/RequireAuth";
import RequireCapability from "./shared/auth/RequireCapability";
import type { Capability } from "./shared/auth/roleAccess";

import AuthCallbackPage from "./pages/AuthCallbackPage";
import DashboardPage from "./pages/DashboardPage";
import DestructionResultPage from "./pages/DestructionResultPage";
import TaskDefinitionDetailPage from "./pages/TaskDefinitionDetailPage";
import RecordDestructionPage from "./pages/RecordDestructionPage";
import RecordSelectionPage from "./pages/RecordSelectionPage";

import ArchivistApprovalPage from "./pages/ArchivistApprovalPage";
import ProcessOwnerApprovalPage from "./pages/ProcessOwnerApprovalPage";
import RecordReviewPage from "./pages/RecordReviewPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/auth/callback"
            element={<AuthCallbackPage />}
          />

          {/* DEFAULT */}
          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          {/* DASHBOARD */}
          <Route
            element={<ProtectedLayout><AppShell /></ProtectedLayout>}
          >
            <Route
              path="/dashboard"
              element={<CapabilityRoute capability="dashboard"><DashboardPage /></CapabilityRoute>}
            />
          </Route>

          {/* WITH TASK SIDEBAR */}
          <Route
            element={
              <ProtectedLayout><AppShellWithTaskSidebar /></ProtectedLayout>
            }
          >
            <Route
              path="/taak/:id"
              element={<CapabilityRoute capability="taskDefinition"><TaskDefinitionDetailPage /></CapabilityRoute>}
            />
          </Route>

          {/* TAAKUITVOERING MET RECHTERSIDEBAR */}
          <Route
            element={
              <ProtectedLayout><AppShellWithTaskSidebarAndContextSidebar /></ProtectedLayout>
            }
          >
            <Route
              path="/taak/:taakId/taakuitvoering/:id/selectie"
              element={
                <CapabilityRoute capability="selection"><RecordSelectionPage /></CapabilityRoute>
              }
            />
            <Route
              path="/taak/:taakId/taakuitvoering/:id/beoordeling"
              element={
                <CapabilityRoute capability="review"><RecordReviewPage /></CapabilityRoute>
              }
            />
            <Route
              path="/taak/:taakId/taakuitvoering/:id/accordering/proceseigenaar"
              element={
                <CapabilityRoute capability="processOwnerApproval"><ProcessOwnerApprovalPage /></CapabilityRoute>
              }
            />
            <Route
              path="/taak/:taakId/taakuitvoering/:id/accordering/archivaris"
              element={
                <CapabilityRoute capability="archivistApproval"><ArchivistApprovalPage /></CapabilityRoute>
              }
            />
            <Route
              path="/taak/:taakId/taakuitvoering/:id/uitvoering"
              element={
                <CapabilityRoute capability="destruction"><RecordDestructionPage /></CapabilityRoute>
              }
            />
            <Route
              path="/taak/:taakId/taakuitvoering/:id/resultaat"
              element={
                <CapabilityRoute capability="results"><DestructionResultPage /></CapabilityRoute>
              }
            />
          </Route>

          {/* NORMAL LAYOUT */}
          <Route
            element={<ProtectedLayout><AppShell /></ProtectedLayout>}
          >
            <Route
              path="/taak/:taakId/taakuitvoering/:id"
              element={
                <Navigate
                  to="selectie"
                  replace
                />
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

function CapabilityRoute({
  capability,
  children,
}: {
  capability: Capability;
  children: ReactNode;
}) {
  return <RequireCapability capability={capability}>{children}</RequireCapability>;
}
