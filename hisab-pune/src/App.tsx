import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Nav } from './components/Nav';
import { PageTransition } from './components/PageTransition';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { LocalitiesPage } from './pages/LocalitiesPage';
import { HowPage } from './pages/HowPage';
import { WardsPage } from './pages/WardsPage';

/** Old /locality/:id URLs land on the map ledger — that is the place surface. */
function LocalityToMapRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/map?loc=${id}` : '/map'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="grain" aria-hidden />
      <Nav />
      <PageTransition>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/localities" element={<LocalitiesPage />} />
          <Route path="/wards" element={<WardsPage />} />
          <Route path="/locality/:id" element={<LocalityToMapRedirect />} />
          <Route path="/how" element={<HowPage />} />
        </Routes>
      </PageTransition>
    </BrowserRouter>
  );
}
