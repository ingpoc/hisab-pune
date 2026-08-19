import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { LocalitySearch } from './LocalitySearch';
import './Hero.css';

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(
          [
            '.hero__city',
            '.hero__brand',
            '.hero__line',
            '.hero__sub',
            '.hero__search',
            '.hero__actions',
          ],
          { clearProps: 'all', opacity: 1, y: 0, x: 0 },
        );
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.hero__city', { y: 14, opacity: 0, duration: 0.4 })
          .from('.hero__brand', { y: 36, opacity: 0, duration: 0.7 }, '-=0.12')
          .from('.hero__line', { y: 18, opacity: 0, duration: 0.45 }, '-=0.38')
          .from('.hero__sub', { opacity: 0, duration: 0.4 }, '-=0.22')
          .from(
            '.hero__search',
            { y: 14, opacity: 0, duration: 0.45 },
            '-=0.18',
          )
          .from('.hero__actions', { y: 10, opacity: 0, duration: 0.35 }, '-=0.2');

        gsap.to('.hero__grid', {
          backgroundPosition: '48px 48px',
          duration: 22,
          ease: 'none',
          repeat: -1,
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" ref={rootRef}>
      <div className="hero__bg" aria-hidden>
        <div className="hero__wash" />
        <div className="hero__grid" />
        <div className="hero__flare" />
      </div>

      <div className="hero__inner">
        <p className="hero__city">Pune</p>
        <h1 className="hero__brand">Hisab</h1>
        <p className="hero__line">Who answers for your street?</p>
        <p className="hero__sub">
          Type a locality. See open issues. Escalate when you need names.
        </p>

        <div className="hero__search">
          <LocalitySearch
            variant="hero"
            placeholder="Baner, Kothrud, Hadapsar…"
          />
        </div>

        <div className="hero__actions">
          <Link to="/map?report=1" className="btn btn--alert">
            Report an issue
          </Link>
          <Link to="/map" className="btn btn--ghost">
            Open map
          </Link>
        </div>
      </div>
    </section>
  );
}
