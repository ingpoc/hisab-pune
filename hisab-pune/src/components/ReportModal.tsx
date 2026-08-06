import { useState } from 'react';
import { nearestLocality } from '../data/localities';
import type { Report } from '../data/types';
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
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const locality = coords ? nearestLocality(coords.lat, coords.lng) : null;

  function locate() {
    setLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation not supported. Drop a pin near your area on the map instead.');
      setLocating(false);
      // Fallback: Pune center
      setCoords({ lat: 18.5204, lng: 73.8567 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError('Could not read GPS. Using Pune centre — adjust after submit if needed.');
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!coords || !locality) {
      setError('Locate yourself first.');
      return;
    }
    if (!note.trim()) {
      setError('Add a short description.');
      return;
    }
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
    onClose();
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
          Photo + location → we pin the locality and show who must answer.
          No login required for this MVP.
        </p>

        <label className="modal__field">
          <span>Photo</span>
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
              Nearest: <strong>{locality.name}</strong> · Ward {locality.wardNo}
            </p>
          )}
        </div>

        <label className="modal__field">
          <span>What&apos;s wrong?</span>
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
          <button type="submit" className="btn btn--alert">
            Pin &amp; show escalation
          </button>
        </div>
      </form>
    </div>
  );
}
