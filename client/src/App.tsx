import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/NotFound";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Route, Switch, Redirect } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const Home = lazy(() => import("@/pages/Home"));
const { WorkspaceHome, MentorsPage, CategoriesPage, ProfilePage, AdminPage } = {
  WorkspaceHome: lazy(() => import("@/pages/Portal").then(module => ({ default: module.WorkspaceHome }))),
  MentorsPage: lazy(() => import("@/pages/Portal").then(module => ({ default: module.MentorsPage }))),
  CategoriesPage: lazy(() => import("@/pages/Portal").then(module => ({ default: module.CategoriesPage }))),
  ProfilePage: lazy(() => import("@/pages/Portal").then(module => ({ default: module.ProfilePage }))),
  AdminPage: lazy(() => import("@/pages/Portal").then(module => ({ default: module.AdminPage }))),
};

function PageLoading() {
  return <div className="flex min-h-[50vh] items-center justify-center bg-[#f6f0e4] text-sm text-[#607084]">Opening your next chapter…</div>;
}

function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  return user?.role === "admin" ? <AdminPage /> : <Redirect to="/app" />;
}

function WithWorkspace({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return <Suspense fallback={<PageLoading />}><Switch>
    <Route path="/" component={Home} />
    <Route path="/app" component={() => <WithWorkspace><WorkspaceHome /></WithWorkspace>} />
    <Route path="/app/mentors" component={() => <WithWorkspace><MentorsPage /></WithWorkspace>} />
    <Route path="/app/categories" component={() => <WithWorkspace><CategoriesPage /></WithWorkspace>} />
    <Route path="/app/profile" component={() => <WithWorkspace><ProfilePage /></WithWorkspace>} />
    <Route path="/app/admin" component={() => <WithWorkspace><AdminRoute /></WithWorkspace>} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
