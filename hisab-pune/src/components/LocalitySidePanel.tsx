import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategory } from '../data/categories';
import { getElectoralWard } from '../data/electoralWards';
import { mlas } from '../data/cityOfficials';
import type { Locality, Report } from '../data/types';
import { escalationChain } from '../lib/escalation';
import { formatIssueAge } from '../lib/issueAge';
import { TweetAction } from './TweetAction';
import './LocalitySidePanel.css';

type IssueTab = 'open' | 'closed';

interface Props {
  locality: Locality;
  reports: Report[];
  activeReportId: string | null;
  onSelectReport: (id: string | null) => void;
  onEscalate: (report: Report) => void;
  escalationOpen: boolean;
  onEscalationOpenChange: (open: boolean) => void;
}

function sortNewest(a: Report, b: Report) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function LocalitySidePanel({
  locality,
  reports,
  activeReportId,
  onSelectReport,
  onEscalate,
  escalationOpen,
  onEscalationOpenChange,
}: Props) {
  const [tab, setTab] = useState<IssueTab>('open');
  const [draftOpen, setDraftOpen] = useState(false);

  useEffect(() => {
    setTab('open');
    setDraftOpen(false);
  }, [locality.id]);

  useEffect(() => {
    setDraftOpen(false);
  }, [activeReportId]);

  const openIssues = useMemo(
    () => reports.filter((r) => r.status !== 'resolved').sort(sortNewest),
    [reports],
  );
  const closedIssues = useMemo(
    () => reports.filter((r) => r.status === 'resolved').sort(sortNewest),
    [reports],
  );

  const visible = tab === 'open' ? openIssues : closedIssues;
  const active = reports.find((r) => r.id === activeReportId) ?? null;
  const activeCat = active ? getCategory(active.categoryId) : null;
  const ward = getElectoralWard(locality.electoralWardId);
  const mla = mlas[locality.assemblyId];
  const assemblyLabel = mla?.title.replace(/^MLA — /, '') ?? locality.assemblyId;
  const chain = escalationChain(locality);

  function openDraft() {
    setDraftOpen((v) => !v);
  }

  return (
    <div className="loc-panel">
      <header className="loc-panel__head">
        <p className="loc-panel__eyebrow">Locality</p>
        <h1 className="loc-panel__title">{locality.name}</h1>
        <p className="loc-panel__meta">
          Ward {locality.electoralWardId}
          {ward ? ` · ${ward.name}` : ''} · {locality.zone} · {assemblyLabel}
        </p>
        <p className="loc-panel__counts">
          <strong>{openIssues.length}</strong> open
          <span aria-hidden>·</span>
          <strong>{closedIssues.length}</strong> closed
        </p>
      </header>

      <div className="loc-panel__tabs" role="tablist" aria-label="Issue status">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'open'}
          className={tab === 'open' ? 'is-active' : undefined}
          onClick={() => setTab('open')}
        >
          Open
          <span className="loc-panel__tab-n">{openIssues.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'closed'}
          className={tab === 'closed' ? 'is-active' : undefined}
          onClick={() => setTab('closed')}
        >
          Closed
          <span className="loc-panel__tab-n">{closedIssues.length}</span>
        </button>
      </div>

      <ul className="loc-panel__issues" role="tabpanel">
        {visible.length === 0 ? (
          <li className="loc-panel__empty">
            {tab === 'open'
              ? 'No open issues here yet.'
              : 'No closed issues recorded.'}
          </li>
        ) : (
          visible.map((r) => {
            const cat = getCategory(r.categoryId);
            const selected = r.id === activeReportId;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  className={`loc-panel__issue${selected ? ' is-selected' : ''}`}
                  onClick={() => onSelectReport(selected ? null : r.id)}
                  aria-pressed={selected}
                >
                  <span className={`pill pill--${r.status}`}>{r.status}</span>
                  <span className="loc-panel__issue-cat">{cat.label}</span>
                  <span className="loc-panel__issue-note">{r.note}</span>
                  <span className="loc-panel__issue-meta">
                    {r.authorLabel ?? 'Resident'}
                    <span>{formatIssueAge(r.createdAt, r.status)}</span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {active && activeCat && (
        <section className="loc-panel__focus" aria-label="Selected issue">
          <div className="loc-panel__focus-bar">
            <p className="loc-panel__eyebrow">Selected</p>
            <button
              type="button"
              className="loc-panel__dismiss"
              onClick={() => onSelectReport(null)}
              aria-label="Deselect issue"
            >
              ✕
            </button>
          </div>
          <div className="loc-panel__facts">
            <span className={`pill pill--${active.status}`}>{active.status}</span>
            <span>{activeCat.label}</span>
            <span>{formatIssueAge(active.createdAt, active.status)}</span>
          </div>
          <p className="loc-panel__focus-note">{active.note}</p>
          <p className="loc-panel__focus-author">
            {active.authorLabel ?? 'Resident'}
          </p>
          {active.photoDataUrl && (
            <img
              src={active.photoDataUrl}
              alt=""
              className="loc-panel__focus-photo"
            />
          )}
          {active.status !== 'resolved' && (
            <div className="loc-panel__focus-actions">
              <button
                type="button"
                className="btn btn--signal"
                onClick={() => onEscalate(active)}
              >
                Escalate on X
              </button>
              <button
                type="button"
                className="loc-panel__text-btn"
                aria-expanded={draftOpen}
                onClick={openDraft}
              >
                {draftOpen ? 'Hide draft' : 'Edit draft'}
              </button>
              {draftOpen && (
                <TweetAction
                  key={active.id}
                  locality={locality}
                  officials={chain}
                  note={active.note}
                />
              )}
            </div>
          )}
        </section>
      )}

      <button
        type="button"
        className={`loc-panel__escalate-btn${escalationOpen ? ' is-open' : ''}`}
        aria-expanded={escalationOpen}
        onClick={() => {
          setDraftOpen(false);
          onEscalationOpenChange(!escalationOpen);
        }}
      >
        <span className="loc-panel__disclose-title">Escalation route</span>
        <span className="loc-panel__disclose-hint">
          {chain.length} contacts · {escalationOpen ? 'hide left rail' : 'open left rail'}
        </span>
      </button>

      <Link
        className="btn btn--alert loc-panel__report"
        to={`/map?loc=${locality.id}&report=1`}
      >
        Report in {locality.name}
      </Link>
    </div>
  );
}
