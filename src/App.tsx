import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import './index.css'
import LoadingPage from "./pages/Loading.tsx";

const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));

function getInitialDarkMode(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return JSON.parse(saved) as boolean;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  } catch {
    return true;
  }
}

export default function App() {
  const [isDark, setIsDark] = useState(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("darkMode", JSON.stringify(isDark));
    } catch {
      // ignore
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/" element={<Dashboard isDark={isDark} onToggleTheme={toggleTheme} />} />
      </Routes>
    </Suspense>
  );
}