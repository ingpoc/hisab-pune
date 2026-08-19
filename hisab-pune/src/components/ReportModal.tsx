import { useEffect, useRef, useState } from 'react';
import { localities, nearestLocality, localityForWard } from '../data/localities';
import type { Report } from '../data/types';
import { createReport, fetchHere } from '../lib/api';
import { saveUserReport } from '../lib/storage';
import './ReportModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (report: Report) => void;
}

export function ReportModal({ open, onClose, onCreated }: Props) {
  const [note, setNote] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolved, setResolved] = useState<{
    localityId: string;
    wardId: number | null;
    wardName?: string;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locateGen = useRef(0);

  useEffect(() => {
    if (!coords) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const here = await fetchHere(coords.lat, coords.lng);
        if (!cancelled) {
          setResolved({
            localityId: here.locality.id,
            wardId: here.ward.id,
            wardName: here.ward.name,
          });
        }
      } catch {
        const loc =
          localityForWard(
            nearestLocality(coords.lat, coords.lng).electoralWardId,
            coords.lat,
            coords.lng,
          ) ?? nearestLocality(coords.lat, coords.lng);
        if (!cancelled) {
          setResolved({
            localityId: loc.id,
            wardId: loc.electoralWardId,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coords]);

  if (!open) return null;

  const locality = resolved
    ? (localities.find((l) => l.id === resolved.localityId) ?? null)
    : null;

  function locate() {
    const gen = ++locateGen.current;
    setLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser.');
      setLocating(false);
      setCoords({ lat: 18.5204, lng: 73.8567 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (gen !== locateGen.current) return;
        setError(null);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        if (gen !== locateGen.current) return;
        setError('Could not read GPS. Using Pune centre — adjust if needed.');
        setCoords({ lat: 18.5204, lng: 73.8567 });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!coords || !locality) {
      setError('Locate yourself first.');
      return;
    }
    if (!note.trim()) {
      setError('Add a short description.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { report } = await createReport({
        lat: coords.lat,
        lng: coords.lng,
        note: note.trim(),
        localityId: locality.id,
      });
      const withPhoto = { ...report, photoDataUrl };
      saveUserReport(withPhoto);
      onCreated(withPhoto);
      setNote('');
      setPhotoDataUrl(undefined);
      setCoords(null);
      setResolved(null);
      onClose();
    } catch (err) {
      // Offline / API down — keep local fallback
      const report: Report = {
        id: `user-${Date.now()}`,
        localityId: locality.id,
        lat: coords.lat,
        lng: coords.lng,
        note: note.trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
        photoDataUrl,
        source: 'user',
      };
      saveUserReport(report);
      onCreated(report);
      setNote('');
      setPhotoDataUrl(undefined);
      setCoords(null);
      setResolved(null);
      onClose();
      console.warn('API create failed, saved locally', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <button className="modal__backdrop" type="button" aria-label="Close" onClick={onClose} />
      <form className="modal__panel" onSubmit={submit}>
        <header className="modal__head">
          <h2 id="report-title">Report a blackspot</h2>
          <button type="button" className="modal__x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <p className="modal__lead">
          Location is required; photo is optional. We match you to the 2026
          electoral ward polygon, then the escalation ladder. No login required.
        </p>

        <label className="modal__field">
          <span>Photo (optional)</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {photoDataUrl && (
          <img src={photoDataUrl} alt="Selected report" className="modal__preview" />
        )}

        <div className="modal__row">
          <button type="button" className="btn btn--ghost-dark" onClick={locate} disabled={locating}>
            {locating ? 'Locating…' : 'Use my location'}
          </button>
          {locality && (
            <p className="modal__loc">
              Matched: <strong>{locality.name}</strong> · Ward{' '}
              {resolved?.wardId ?? locality.electoralWardId}
              {resolved?.wardName ? ` (${resolved.wardName})` : ''}
            </p>
          )}
        </div>

        <label className="modal__field">
          <span>What is wrong?</span>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Overflowing bins, dumping, skipped collection…"
            required
          />
        </label>

        {error && <p className="modal__error">{error}</p>}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost-dark" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--alert" disabled={submitting}>
            {submitting ? 'Saving…' : 'Pin & show escalation'}
          </button>
        </div>
      </form>
    </div>
  );
}
