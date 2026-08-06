import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Hero.css';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__bg" aria-hidden>
        <div className="hero__wash" />
        <div className="hero__grid" />
      </div>

      <div className="hero__inner">
        <motion.p
          className="hero__city"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          Pune · पुणे
        </motion.p>

        <motion.h1
          className="hero__brand"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08 }}
        >
          Hisab
        </motion.h1>

        <motion.p
          className="hero__line"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
        >
          Who answers for your street?
        </motion.p>

        <motion.p
          className="hero__sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.32 }}
        >
          Every locality maps to a clear escalation route — sanitation desk,
          ward officer, corporator, MLA, mayor, commissioner — then public
          pressure on X.
        </motion.p>

        <motion.div
          className="hero__actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.42 }}
        >
          <Link to="/map?report=1" className="btn btn--signal">
            Report a blackspot
          </Link>
          <Link to="/localities" className="btn btn--ghost">
            See who is responsible
          </Link>
        </motion.div>
      </div>

      <motion.div
        className="hero__ladder-preview"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.35 }}
        aria-hidden
      >
        {['SWM desk', 'Ward AMC', 'Corporators', 'MLA', 'Commissioner'].map(
          (step, i) => (
            <div key={step} className="hero__step" style={{ '--i': i } as CSSProperties}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {step}
            </div>
          ),
        )}
      </motion.div>
    </section>
  );
}
