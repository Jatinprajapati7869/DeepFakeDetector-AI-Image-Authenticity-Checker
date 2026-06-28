import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Home } from '@/pages/Home';
import { History } from '@/pages/History';

function NavBar() {
  return (
    <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-bold text-gray-900 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
          aria-label="DeepFakeDetector home"
        >
          <span aria-hidden="true">🛡️</span>
          <span>DeepFakeDetector</span>
        </Link>

        <Link
          to="/history"
          className="text-sm text-gray-500 transition hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          History
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
