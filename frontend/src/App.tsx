import { Suspense, lazy } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';

const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })));
const History = lazy(() => import('@/pages/History').then((m) => ({ default: m.History })));
const AnalysisDetail = lazy(() =>
  import('@/pages/AnalysisDetail').then((m) => ({ default: m.AnalysisDetail })),
);

function NavBar() {
  return (
    <nav className="sticky top-0 z-10 border-b border-slate-750 bg-surface">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-base font-bold text-white hover:text-accent"
          aria-label="DeepShield home"
        >
          <ShieldIcon className="h-5 w-5 text-accent" />
          <span>DeepShield</span>
        </Link>

        <Link to="/history" className="text-sm text-slate-400 transition hover:text-white">
          History
        </Link>
      </div>
    </nav>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface font-body text-slate-200 antialiased">
        <NavBar />
        <Suspense
          fallback={
            <div className="flex h-[50vh] items-center justify-center text-slate-400">
              Loading...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:id" element={<AnalysisDetail />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}
