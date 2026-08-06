import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Hero } from '../components/Hero';
import { localities } from '../data/localities';
import { electoralWards } from '../data/electoralWards';
import { seedReports } from '../data/seedReports';
import './HomePage.css';

gsap.registerPlugin(ScrollTrigger);

export function HomePage() {
  const open = seedReports.filter((r) => r.status !== 'resolved').length;
  const corporators = electoralWards.reduce((n, w) => n + w.corporators.length, 0);
  const proofRef = useRef<HTMLElement>(null);
  const whyRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.home-proof__stat', {
        scrollTrigger: { trigger: proofRef.current, start: 'top 85%' },
        y: 22,
        opacity: 0,
        duration: 0.55,
        stagger: 0.1,
        ease: 'power2.out',
      });

      gsap.from('.home-why__copy > *', {
        scrollTrigger: { trigger: whyRef.current, start: 'top 80%' },
        y: 16,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
      });

      gsap.from('.home-why__stack span', {
        scrollTrigger: { trigger: whyRef.current, start: 'top 75%' },
        x: 24,
        opacity: 0,
        duration: 0.5,
        stagger: 0.12,
        ease: 'power3.out',
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <main>
      <Hero />

      <section className="home-proof" ref={proofRef}>
        <div className="home-proof__stat">
          <strong>{localities.length}</strong>
          <span>localities mapped</span>
        </div>
        <div className="home-proof__stat">
          <strong>{corporators}</strong>
          <span>corporators from 2026 poll</span>
        </div>
        <div className="home-proof__stat">
          <strong>{open}</strong>
          <span>demo open reports</span>
        </div>
      </section>

      <section className="home-why" ref={whyRef}>
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
                <span>Ward {loc.electoralWardId}</span>
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
