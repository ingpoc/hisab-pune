import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav';
import { PageTransition } from './components/PageTransition';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { LocalitiesPage } from './pages/LocalitiesPage';
import { LocalityPage } from './pages/LocalityPage';
import { HowPage } from './pages/HowPage';
import { WardsPage } from './pages/WardsPage';

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
          <Route path="/locality/:id" element={<LocalityPage />} />
          <Route path="/how" element={<HowPage />} />
        </Routes>
      </PageTransition>
    </BrowserRouter>
  );
}
