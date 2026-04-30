import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import './index.css'
import LoadingPage from "./pages/Loading.tsx";

const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const AnimeListPage = lazy(() => import("./pages/AnimeList.tsx"));
const PeakFiction = lazy(() => import("./pages/PeakFiction.tsx"));
const AnimeDetail = lazy(() => import("./pages/AnimeDetail.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

export default function App() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lists/:status" element={<AnimeListPage />} />
        <Route path="/anime/:id" element={<AnimeDetail />} />
        <Route path="/peak-fiction" element={<PeakFiction />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}