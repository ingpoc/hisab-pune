import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { ReportModal } from '../components/ReportModal';
import { EscalationLadder } from '../components/EscalationLadder';
import { localities, getLocality } from '../data/localities';
import type { Report } from '../data/types';
import { loadReportsWithOverrides, updateReportStatus } from '../lib/storage';
import { escalationChain } from '../lib/escalation';
import { buildEscalationTweet, xIntentUrl } from '../lib/twitter';
import './MapPage.css';

export function MapPage() {
  const [params, setParams] = useSearchParams();
  const [reports, setReports] = useState<Report[]>(() => loadReportsWithOverrides());
  const [selectedId, setSelectedId] = useState<string | null>(params.get('loc'));
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(params.get('report') === '1');

  useEffect(() => {
    if (params.get('report') === '1') setReportOpen(true);
  }, [params]);

  const selected = selectedId ? getLocality(selectedId) : null;
  const activeReport = reports.find((r) => r.id === activeReportId);

  const focus = useMemo(() => {
    if (activeReport) return { lat: activeReport.lat, lng: activeReport.lng };
    if (selected) return { lat: selected.lat, lng: selected.lng };
    return null;
  }, [activeReport, selected]);

  const onSelectLocality = useCallback((id: string) => {
    setSelectedId(id);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('loc', id);
      next.delete('report');
      return next;
    });
  }, [setParams]);

  function onCreated(report: Report) {
    setReports(loadReportsWithOverrides());
    setSelectedId(report.localityId);
    setActiveReportId(report.id);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('loc', report.localityId);
      next.delete('report');
      return next;
    });
  }

  function escalate(report: Report) {
    const loc = getLocality(report.localityId);
    if (!loc) return;
    updateReportStatus(report.id, 'escalated');
    setReports(loadReportsWithOverrides());
    const tweet = buildEscalationTweet({
      locality: loc,
      note: report.note,
      officials: escalationChain(loc),
    });
    window.open(xIntentUrl(tweet), '_blank', 'noopener,noreferrer');
  }

  return (
    <main className="map-page">
      <div className="map-page__map">
        <MapView
          reports={reports}
          localities={localities}
          selectedId={selectedId}
          selectedWardId={selected?.electoralWardId ?? null}
          onSelectLocality={onSelectLocality}
          onSelectReport={setActiveReportId}
          focus={focus}
        />
        <button
          type="button"
          className="map-page__fab btn btn--alert"
          onClick={() => setReportOpen(true)}
        >
          Report
        </button>
      </div>

      <aside className="map-page__side">
        {selected ? (
          <>
            {activeReport && (
              <article className="map-page__report">
                <p className="eyebrow">Selected report</p>
                <p className="map-page__note">{activeReport.note}</p>
                <p className="map-page__status">
                  Status: <strong>{activeReport.status}</strong>
                </p>
                {activeReport.photoDataUrl && (
                  <img src={activeReport.photoDataUrl} alt="" className="map-page__photo" />
                )}
                {activeReport.status !== 'resolved' && (
                  <button
                    type="button"
                    className="btn btn--signal"
                    onClick={() => escalate(activeReport)}
                  >
                    Escalate on X
                  </button>
                )}
              </article>
            )}
            <EscalationLadder
              locality={selected}
              note={activeReport?.note}
            />
            <Link className="text-link" to={`/locality/${selected.id}`}>
              Open locality page →
            </Link>
          </>
        ) : (
          <div className="map-page__empty">
            <h1>City map</h1>
            <p>
              Tap a red pin or locality marker to see who is responsible — then
              escalate on X with their handles prefilled.
            </p>
            <ul>
              {reports
                .filter((r) => r.status !== 'resolved')
                .slice(0, 5)
                .map((r) => {
                  const loc = getLocality(r.localityId);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReportId(r.id);
                          onSelectLocality(r.localityId);
                        }}
                      >
                        <strong>{loc?.name ?? r.localityId}</strong>
                        <span>{r.note}</span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}
      </aside>

      <ReportModal
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
          setParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('report');
            return next;
          });
        }}
        onCreated={onCreated}
      />
    </main>
  );
}
