import { NavLink } from 'react-router-dom';
import { LocalitySearch } from './LocalitySearch';
import './Nav.css';

export function Nav() {
  return (
    <header className="nav">
      <NavLink to="/" className="nav__brand" end>
        <span className="nav__mark" aria-hidden />
        Hisab
      </NavLink>
      <nav className="nav__links" aria-label="Primary">
        <NavLink to="/map">Map</NavLink>
        <NavLink to="/localities">Localities</NavLink>
        <NavLink to="/wards">Wards</NavLink>
        <NavLink to="/how">How it works</NavLink>
      </nav>
      <LocalitySearch variant="nav" placeholder="Find locality…" />
      <NavLink to="/map?report=1" className="nav__cta">
        Report issue
      </NavLink>
    </header>
  );
}
