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
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.home-proof__stat', {
          scrollTrigger: {
            trigger: proofRef.current,
            start: 'top 85%',
            once: true,
          },
          y: 18,
          opacity: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
        });

        gsap.from('.home-why__copy > *', {
          scrollTrigger: {
            trigger: whyRef.current,
            start: 'top 80%',
            once: true,
          },
          y: 14,
          opacity: 0,
          duration: 0.45,
          stagger: 0.07,
          ease: 'power2.out',
        });

        gsap.from('.home-why__rail span', {
          scrollTrigger: {
            trigger: whyRef.current,
            start: 'top 75%',
            once: true,
          },
          x: 20,
          opacity: 0,
          duration: 0.45,
          stagger: 0.1,
          ease: 'power3.out',
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <main>
      <Hero />

      <section className="home-proof" ref={proofRef} aria-label="Coverage">
        <div className="home-proof__stat">
          <strong>{localities.length}</strong>
          <span>localities mapped</span>
        </div>
        <div className="home-proof__stat">
          <strong>{corporators}</strong>
          <span>corporators · 2026 poll</span>
        </div>
        <div className="home-proof__stat">
          <strong>{open}</strong>
          <span>open demo reports</span>
        </div>
      </section>

      <section className="home-why" ref={whyRef}>
        <div className="home-why__copy">
          <p className="eyebrow">Mechanism</p>
          <h2>Name the chain. Make the pressure public.</h2>
          <p>
            Helplines hide faces. Hisab maps each street to sanitation, ward
            office, corporators, MLA, mayor, and commissioner — then puts their
            handles one tap away on X.
          </p>
          <Link to="/how" className="text-link">
            How escalation works →
          </Link>
        </div>
        <div className="home-why__visual" aria-hidden>
          <div className="home-why__rail">
            <span>Street report</span>
            <span>Named ladder</span>
            <span>Public X thread</span>
          </div>
        </div>
      </section>
    </main>
  );
}
