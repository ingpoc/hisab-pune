import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Nav.css';

export function Nav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="nav">
      <NavLink to="/" className="nav__brand" end>
        <span className="nav__mark" aria-hidden />
        Hisab
      </NavLink>
      <button
        type="button"
        className="nav__toggle"
        aria-expanded={open}
        aria-controls="primary-nav"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Close' : 'Menu'}
      </button>
      <nav
        id="primary-nav"
        className={`nav__links${open ? ' is-open' : ''}`}
        aria-label="Primary"
      >
        <NavLink to="/map">Map</NavLink>
        <NavLink to="/localities">Localities</NavLink>
        <NavLink to="/wards">Wards</NavLink>
        <NavLink to="/how">How it works</NavLink>
      </nav>
      <NavLink to="/map?report=1" className="nav__cta">
        Report garbage
      </NavLink>
    </header>
  );
}
