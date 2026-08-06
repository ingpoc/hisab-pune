import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hero } from '../components/Hero';
import { localities } from '../data/localities';
import { seedReports } from '../data/seedReports';
import './HomePage.css';

export function HomePage() {
  const open = seedReports.filter((r) => r.status !== 'resolved').length;

  return (
    <main>
      <Hero />

      <section className="home-proof">
        <motion.div
          className="home-proof__stat"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <strong>{localities.length}</strong>
          <span>localities mapped</span>
        </motion.div>
        <motion.div
          className="home-proof__stat"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <strong>7</strong>
          <span>rungs in every escalation</span>
        </motion.div>
        <motion.div
          className="home-proof__stat"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.16 }}
        >
          <strong>{open}</strong>
          <span>demo open reports</span>
        </motion.div>
      </section>

      <section className="home-why">
        <div className="home-why__copy">
          <p className="eyebrow">The problem</p>
          <h2>Elected and appointed people stay invisible when streets fail.</h2>
          <p>
            Complaints vanish into apps and helplines. Hisab makes the chain public:
            who owns the shift, who owns the ward, who owns the assembly seat — then
            puts their X handles one tap away.
          </p>
          <Link to="/how" className="text-link">
            How escalation works →
          </Link>
        </div>
        <div className="home-why__visual" aria-hidden>
          <div className="home-why__stack">
            <span>Street report</span>
            <span>Named ladder</span>
            <span>Public X thread</span>
          </div>
        </div>
      </section>

      <section className="home-localities">
        <header>
          <p className="eyebrow">Start somewhere</p>
          <h2>Pick a locality</h2>
        </header>
        <ul className="home-localities__grid">
          {localities.slice(0, 8).map((loc) => (
            <li key={loc.id}>
              <Link to={`/locality/${loc.id}`}>
                <strong>{loc.name}</strong>
                <span>
                  {loc.nameMr} · MLA seat {loc.assembly}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/localities" className="btn btn--ink">
          All localities
        </Link>
      </section>
    </main>
  );
}
