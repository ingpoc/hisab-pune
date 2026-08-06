import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import './Hero.css';

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero__city', { y: 14, opacity: 0, duration: 0.45 })
        .from('.hero__brand', { y: 36, opacity: 0, duration: 0.7 }, '-=0.15')
        .from('.hero__line', { y: 20, opacity: 0, duration: 0.5 }, '-=0.35')
        .from('.hero__sub', { opacity: 0, duration: 0.45 }, '-=0.2')
        .from('.hero__actions', { y: 12, opacity: 0, duration: 0.4 }, '-=0.2')
        .from(
          '.hero__step',
          { x: 28, opacity: 0, duration: 0.45, stagger: 0.07 },
          '-=0.45',
        );

      gsap.to('.hero__grid', {
        backgroundPosition: '48px 48px',
        duration: 18,
        ease: 'none',
        repeat: -1,
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" ref={rootRef}>
      <div className="hero__bg" aria-hidden>
        <div className="hero__wash" />
        <div className="hero__grid" />
      </div>

      <div className="hero__inner">
        <p className="hero__city">Pune</p>
        <h1 className="hero__brand">Hisab</h1>
        <p className="hero__line">Who answers for your street?</p>
        <p className="hero__sub">
          Every locality maps to a clear escalation route — sanitation desk,
          ward officer, corporator, MLA, mayor, commissioner — then public
          pressure on X.
        </p>
        <div className="hero__actions">
          <Link to="/map?report=1" className="btn btn--signal">
            Report a blackspot
          </Link>
          <Link to="/localities" className="btn btn--ghost">
            See who is responsible
          </Link>
        </div>
      </div>

      <div className="hero__ladder-preview" aria-hidden>
        {['SWM desk', 'Ward office', 'Corporators', 'MLA', 'Commissioner'].map(
          (step, i) => (
            <div key={step} className="hero__step">
              <span>{String(i + 1).padStart(2, '0')}</span>
              {step}
            </div>
          ),
        )}
      </div>
    </section>
  );
}
