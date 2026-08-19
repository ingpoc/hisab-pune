import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  getLocality,
  searchLocalities,
  SUGGESTED_LOCALITY_IDS,
} from '../data/localities';
import type { Locality } from '../data/types';
import './LocalitySearch.css';

type Variant = 'hero' | 'nav' | 'page';

interface Props {
  variant?: Variant;
  placeholder?: string;
  autoFocus?: boolean;
  /** Live query for host pages that also filter a directory list. */
  onQueryChange?: (query: string) => void;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function LocalitySearch({
  variant = 'hero',
  placeholder = 'Search your locality…',
  autoFocus = false,
  onQueryChange,
}: Props) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const suggestions = useMemo(
    () =>
      SUGGESTED_LOCALITY_IDS.map((id) => getLocality(id)).filter(
        (loc): loc is Locality => Boolean(loc),
      ),
    [],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return open ? suggestions : [];
    return searchLocalities(q, variant === 'nav' ? 6 : 8);
  }, [query, open, suggestions, variant]);

  const goMap = useCallback(
    (loc: Locality) => {
      setQuery('');
      onQueryChange?.('');
      setOpen(false);
      navigate(`/map?loc=${loc.id}`);
    },
    [navigate, onQueryChange],
  );

  const goReport = useCallback(
    (loc: Locality) => {
      setQuery('');
      onQueryChange?.('');
      setOpen(false);
      navigate(`/map?loc=${loc.id}&report=1`);
    },
    [navigate, onQueryChange],
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !open || results.length === 0) return;
    if (prefersReducedMotion()) return;

    const items = list.querySelectorAll('.loc-search__item');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        list,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' },
      );
      gsap.fromTo(
        items,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          stagger: 0.035,
          ease: 'power2.out',
          delay: 0.04,
        },
      );
    }, list);
    return () => ctx.revert();
  }, [open, results]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const loc = results[active];
      if (loc) goMap(loc);
    }
  };

  const emptyTyped = query.trim().length > 0 && results.length === 0;
  const showing = open && (results.length > 0 || emptyTyped);

  return (
    <div
      ref={rootRef}
      className={`loc-search loc-search--${variant}`}
      role="combobox"
      aria-expanded={showing}
      aria-haspopup="listbox"
      aria-controls={listId}
    >
      <label className="loc-search__label" htmlFor={`${listId}-input`}>
        <span className="sr-only">Search locality</span>
        <svg
          className="loc-search__icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path
            d="M20 20l-3.5-3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          className="loc-search__input"
          type="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={query}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={
            showing && results[active]
              ? `${listId}-opt-${results[active].id}`
              : undefined
          }
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onQueryChange?.(next);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className="loc-search__clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              onQueryChange?.('');
              inputRef.current?.focus();
            }}
          >
            Clear
          </button>
        )}
      </label>

      {showing && (
        <ul
          ref={listRef}
          id={listId}
          className="loc-search__list"
          role="listbox"
          aria-label="Localities"
        >
          {emptyTyped ? (
            <li className="loc-search__empty" role="presentation">
              No locality matches “{query.trim()}”
            </li>
          ) : (
            <>
              {!query.trim() && (
                <li className="loc-search__hint" role="presentation">
                  Open on map
                </li>
              )}
              {results.map((loc, i) => (
                <li
                  key={loc.id}
                  id={`${listId}-opt-${loc.id}`}
                  role="option"
                  aria-selected={i === active}
                  className={
                    i === active
                      ? 'loc-search__item loc-search__item--active'
                      : 'loc-search__item'
                  }
                  onMouseEnter={() => setActive(i)}
                >
                  <button
                    type="button"
                    className="loc-search__pick"
                    onClick={() => goMap(loc)}
                  >
                    <strong>{loc.name}</strong>
                    <span>
                      Ward {loc.electoralWardId} · {loc.zone}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="loc-search__report"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goReport(loc);
                    }}
                  >
                    Report
                  </button>
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
