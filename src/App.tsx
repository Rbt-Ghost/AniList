import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import './index.css'
import LoadingPage from "./pages/Loading.tsx";

const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const PeakFiction = lazy(() => import("./pages/PeakFiction.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

export default function App() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/peak-fiction" element={<PeakFiction />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}