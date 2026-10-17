import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Nav } from './components/Nav';
import { WakeBanner } from './components/WakeBanner';
import { PageTransition } from './components/PageTransition';
import { HomePage } from './pages/HomePage';

const MapPage = lazy(() =>
  import('./pages/MapPage').then((m) => ({ default: m.MapPage })),
);
const LocalitiesPage = lazy(() =>
  import('./pages/LocalitiesPage').then((m) => ({ default: m.LocalitiesPage })),
);
const HowPage = lazy(() =>
  import('./pages/HowPage').then((m) => ({ default: m.HowPage })),
);
const WardsPage = lazy(() =>
  import('./pages/WardsPage').then((m) => ({ default: m.WardsPage })),
);

/** Old /locality/:id URLs land on the map ledger — that is the place surface. */
function LocalityToMapRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/map?loc=${id}` : '/map'} replace />;
}

/**
 * Reserve the same vertical slot as a full route so the lazy chunk does not
 * collapse the page (CLS) or flash a contrasting empty shell.
 */
function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="grain" aria-hidden />
      <Nav />
      <WakeBanner />
      <PageTransition>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/localities" element={<LocalitiesPage />} />
            <Route path="/wards" element={<WardsPage />} />
            <Route path="/locality/:id" element={<LocalityToMapRedirect />} />
            <Route path="/how" element={<HowPage />} />
          </Routes>
        </Suspense>
      </PageTransition>
    </BrowserRouter>
  );
}
