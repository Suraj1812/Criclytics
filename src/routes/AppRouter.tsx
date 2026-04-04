import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingCardGrid } from "@/components/shared/LoadingCardGrid";
import { RouteErrorPage } from "@/pages/RouteErrorPage";

const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const MatchesPage = lazy(() => import("@/pages/MatchesPage").then((module) => ({ default: module.MatchesPage })));
const MatchDetailsPage = lazy(() => import("@/pages/MatchDetailsPage").then((module) => ({ default: module.MatchDetailsPage })));
const MediaPage = lazy(() => import("@/pages/MediaPage").then((module) => ({ default: module.MediaPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: wrapRoute(<DashboardPage />)
      },
      {
        path: "live",
        element: wrapRoute(<MatchesPage status="live" />)
      },
      {
        path: "upcoming",
        element: wrapRoute(<MatchesPage status="upcoming" />)
      },
      {
        path: "completed",
        element: wrapRoute(<MatchesPage status="completed" />)
      },
      {
        path: "match/:id",
        element: wrapRoute(<MatchDetailsPage />)
      },
      {
        path: "media",
        element: wrapRoute(<MediaPage />)
      },
      {
        path: "*",
        element: wrapRoute(<NotFoundPage />)
      }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

function wrapRoute(page: React.ReactNode) {
  return <Suspense fallback={<LoadingCardGrid count={6} page />}>{page}</Suspense>;
}
