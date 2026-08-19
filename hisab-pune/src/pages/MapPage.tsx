import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapView, type UnmappedWard } from '../components/MapView';
import { ReportModal } from '../components/ReportModal';
import { LocalitySidePanel } from '../components/LocalitySidePanel';
import { EscalationLadder } from '../components/EscalationLadder';
import { localities, getLocality } from '../data/localities';
import type { Report } from '../data/types';
import { loadReportsWithOverrides, updateReportStatus } from '../lib/storage';
import { fetchReports } from '../lib/api';
import { escalationChain } from '../lib/escalation';
import { buildEscalationTweet, xIntentUrl } from '../lib/twitter';
import './MapPage.css';

export function MapPage() {
  const [params, setParams] = useSearchParams();
  const [reports, setReports] = useState<Report[]>(() => loadReportsWithOverrides());
  const [selectedId, setSelectedId] = useState<string | null>(params.get('loc'));
  const [unmappedWard, setUnmappedWard] = useState<UnmappedWard | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(params.get('report') === '1');
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetDrag = useRef<{ y: number; id: number } | null>(null);
  const skipSheetClick = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchReports()
      .then((apiReports) => {
        if (cancelled) return;
        const local = loadReportsWithOverrides().filter((r) => r.source === 'user');
        const byId = new Map<string, Report>();
        for (const r of apiReports) byId.set(r.id, r);
        for (const r of local) byId.set(r.id, r);
        setReports([...byId.values()]);
      })
      .catch(() => {
        /* keep local/seed fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loc = params.get('loc');
    setSelectedId(loc);
    setReportOpen(params.get('report') === '1');
    if (loc) setUnmappedWard(null);
  }, [params]);

  useEffect(() => {
    setEscalationOpen(false);
    setSheetExpanded(false);
  }, [selectedId]);

  const onSheetHandlePointerDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      sheetDrag.current = { y: e.clientY, id: e.pointerId };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );

  const onSheetHandlePointerUp = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      const start = sheetDrag.current;
      sheetDrag.current = null;
      if (!start || start.id !== e.pointerId) return;
      const dy = e.clientY - start.y;
      if (Math.abs(dy) < 40) return;
      skipSheetClick.current = true;
      setSheetExpanded(dy < 0);
    },
    [],
  );

  const onSheetHandleClick = useCallback(() => {
    if (skipSheetClick.current) {
      skipSheetClick.current = false;
      return;
    }
    setSheetExpanded((open) => !open);
  }, []);

  const selected = selectedId ? getLocality(selectedId) : null;
  const activeReport = reports.find((r) => r.id === activeReportId);

  useEffect(() => {
    if (!activeReportId || !selectedId) return;
    const r = reports.find((x) => x.id === activeReportId);
    if (r && r.localityId !== selectedId) setActiveReportId(null);
  }, [selectedId, activeReportId, reports]);

  const localityReports = useMemo(
    () => (selectedId ? reports.filter((r) => r.localityId === selectedId) : []),
    [reports, selectedId],
  );

  const focus = useMemo(() => {
    if (activeReport) return { lat: activeReport.lat, lng: activeReport.lng };
    if (selected) return { lat: selected.lat, lng: selected.lng };
    return null;
  }, [activeReport, selected]);

  const onSelectLocality = useCallback(
    (id: string) => {
      setUnmappedWard(null);
      setSelectedId((prev) => {
        if (prev !== id) setActiveReportId(null);
        return id;
      });
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('loc', id);
        next.delete('report');
        return next;
      });
    },
    [setParams],
  );

  const onUnmappedWard = useCallback(
    (ward: UnmappedWard) => {
      setUnmappedWard(ward);
      setSelectedId(null);
      setActiveReportId(null);
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('loc');
        next.delete('report');
        return next;
      });
    },
    [setParams],
  );

  function onCreated(report: Report) {
    setReports((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));
      map.set(report.id, report);
      return [...map.values()];
    });
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
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, status: 'escalated' as const } : r)),
    );
    setEscalationOpen(true);
    const tweet = buildEscalationTweet({
      locality: loc,
      note: report.note,
      officials: escalationChain(loc),
    });
    window.open(xIntentUrl(tweet), '_blank', 'noopener,noreferrer');
  }

  return (
    <main
      className={`map-page${escalationOpen && selected ? ' map-page--escalating' : ''}${sheetExpanded ? ' map-page--sheet-expanded' : ''}`}
    >
      {escalationOpen && selected && (
        <aside className="map-page__escalate" aria-label="Escalation route">
          <EscalationLadder
            locality={selected}
            note={activeReport?.note}
            variant="rail"
            onClose={() => setEscalationOpen(false)}
          />
        </aside>
      )}

      <div className="map-page__map">
        <MapView
          reports={reports}
          localities={localities}
          selectedId={selectedId}
          selectedWardId={selected?.electoralWardId ?? unmappedWard?.id ?? null}
          onSelectLocality={onSelectLocality}
          onUnmappedWard={onUnmappedWard}
          onSelectReport={setActiveReportId}
          focus={focus}
        />
      </div>

      <aside className="map-page__side">
        <button
          type="button"
          className="map-page__sheet-handle"
          aria-expanded={sheetExpanded}
          aria-controls="locality-sheet"
          aria-label={sheetExpanded ? 'Collapse locality sheet' : 'Expand locality sheet'}
          onPointerDown={onSheetHandlePointerDown}
          onPointerUp={onSheetHandlePointerUp}
          onClick={onSheetHandleClick}
          onPointerCancel={() => {
            sheetDrag.current = null;
          }}
        />
        <div id="locality-sheet" className="map-page__sheet-body">
        {selected ? (
          <LocalitySidePanel
            locality={selected}
            reports={localityReports}
            activeReportId={activeReportId}
            onSelectReport={setActiveReportId}
            onEscalate={escalate}
            escalationOpen={escalationOpen}
            onEscalationOpenChange={setEscalationOpen}
          />
        ) : unmappedWard ? (
          <div className="map-page__empty">
            <p className="eyebrow">Electoral ward</p>
            <h1>Ward {unmappedWard.id}</h1>
            <p>{unmappedWard.name}</p>
            <p>No named locality pin yet — add centroid mapping next.</p>
            <Link className="text-link" to="/wards">
              Open wards directory →
            </Link>
          </div>
        ) : (
          <div className="map-page__empty">
            <h1>City map</h1>
            <p>
              Pick a locality to see open and closed issues — then escalate when
              you need the ladder.
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
                          setSelectedId(r.localityId);
                          setActiveReportId(r.id);
                          setParams((prev) => {
                            const next = new URLSearchParams(prev);
                            next.set('loc', r.localityId);
                            next.delete('report');
                            return next;
                          });
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
        </div>
      </aside>

      <ReportModal
        open={reportOpen}
        preferredLocalityId={selectedId}
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
