import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, getCategory, type CategoryId } from '../data/categories';
import { localities, nearestLocality, localityForWard } from '../data/localities';
import type { PublishAs, Report } from '../data/types';
import { createReport, fetchHere } from '../lib/api';
import { ensureSession, loadSession } from '../lib/session';
import { saveUserReport } from '../lib/storage';
import './ReportModal.css';

/** Shown after createReport fails (including exhausted cold-start retries). */
export const PUBLISH_FAIL_COPY =
  'Could not publish to Hisab. Free hosting may still be starting — Retry.';

export const SAVE_DEVICE_ONLY_LABEL = 'Save on this device only';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (report: Report) => void;
  /** When set (e.g. map `?loc=`), seed pin to that locality instead of Pune centre. */
  preferredLocalityId?: string | null;
}

const PUNE_CENTRE = { lat: 18.5204, lng: 73.8567 };

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(event: KeyboardEvent, root: HTMLElement) {
  const nodes = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.getAttribute('aria-hidden') !== 'true',
  );
  if (nodes.length === 0) {
    event.preventDefault();
    root.focus();
    return;
  }
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !root.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !root.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

export function ReportModal({
  open,
  onClose,
  onCreated,
  preferredLocalityId = null,
}: Props) {
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('solid_waste');
  const [publishAs, setPublishAs] = useState<PublishAs>('anonymous');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolved, setResolved] = useState<{
    localityId: string;
    wardId: number | null;
    wardName?: string;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishFailed, setPublishFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anonId, setAnonId] = useState<string | null>(null);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const locateGen = useRef(0);
  const dialogRef = useRef<HTMLFormElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const preferredLocality = preferredLocalityId
    ? localities.find((l) => l.id === preferredLocalityId)
    : undefined;

  useEffect(() => {
    if (!open) return;
    ensureSession()
      .then((s) => setAnonId(s.anonymousPostingId))
      .catch(() => setAnonId(loadSession()?.anonymousPostingId ?? null));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPublishFailed(false);
    if (preferredLocality) {
      setCoords({ lat: preferredLocality.lat, lng: preferredLocality.lng });
      setResolved({
        localityId: preferredLocality.id,
        wardId: preferredLocality.electoralWardId,
      });
      setLocationHint(
        `Using ${preferredLocality.name} from the map. Use GPS to refine.`,
      );
    } else {
      setCoords(null);
      setResolved(null);
      setLocationHint(null);
    }
  }, [open, preferredLocality]);

  useEffect(() => {
    if (!coords) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Keep map-selected locality when pin is still that locality's centre.
      if (
        preferredLocality &&
        coords.lat === preferredLocality.lat &&
        coords.lng === preferredLocality.lng
      ) {
        setResolved({
          localityId: preferredLocality.id,
          wardId: preferredLocality.electoralWardId,
        });
        return;
      }
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
  }, [coords, preferredLocality]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    restoreFocusRef.current = prev instanceof HTMLElement ? prev : null;
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        trapFocus(event, dialogRef.current);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const locality = resolved
    ? (localities.find((l) => l.id === resolved.localityId) ?? null)
    : null;
  const category = getCategory(categoryId);

  function applyFallbackLocation(reason: string) {
    if (preferredLocality) {
      setError(`${reason} Using ${preferredLocality.name}.`);
      setLocationHint(null);
      setCoords({ lat: preferredLocality.lat, lng: preferredLocality.lng });
      setResolved({
        localityId: preferredLocality.id,
        wardId: preferredLocality.electoralWardId,
      });
      return;
    }
    setError(`${reason} Using Pune centre — adjust if needed.`);
    setLocationHint(null);
    setCoords(PUNE_CENTRE);
  }

  function locate() {
    const gen = ++locateGen.current;
    setLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      applyFallbackLocation('Geolocation not supported in this browser.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (gen !== locateGen.current) return;
        setError(null);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationHint(null);
        setLocating(false);
      },
      () => {
        if (gen !== locateGen.current) return;
        applyFallbackLocation('Could not read GPS.');
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
        categoryId,
        publishAs,
      });
      const withPhoto = { ...report, photoDataUrl };
      saveUserReport(withPhoto);
      onCreated(withPhoto);
      resetForm();
      onClose();
    } catch {
      setPublishFailed(true);
      setError(PUBLISH_FAIL_COPY);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setNote('');
    setPhotoDataUrl(undefined);
    setCoords(null);
    setResolved(null);
    setCategoryId('solid_waste');
    setPublishAs('anonymous');
    setPublishFailed(false);
    setError(null);
  }

  function saveOnThisDeviceOnly() {
    if (!coords || !locality || !note.trim()) {
      setError('Locate yourself and add a short description first.');
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
      categoryId,
      publishAs,
      authorLabel: anonId ?? 'R-LOCAL',
    };
    saveUserReport(report);
    onCreated(report);
    resetForm();
    onClose();
  }

  return (
    <div className="modal">
      <button className="modal__backdrop" type="button" aria-label="Close" onClick={onClose} />
      <form
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        tabIndex={-1}
        ref={dialogRef}
        onSubmit={submit}
      >
        <header className="modal__head">
          <h2 id="report-title">Report an issue</h2>
          <button type="button" className="modal__x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <p className="modal__anon">
          Posted as <strong>{anonId ?? '…'}</strong> by default
        </p>

        <fieldset className="modal__field">
          <legend className="sr-only">Category</legend>
          <span>Category</span>
          <div className="modal__chips" role="listbox" aria-label="Issue category">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={categoryId === c.id}
                className={`modal__chip${categoryId === c.id ? ' is-on' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                {c.label.replace(/ \/ .+$/, '')}
              </button>
            ))}
          </div>
          <span className="modal__hint">Routes tip: {category.deptTip}</span>
        </fieldset>

        <div className="modal__place">
          {locality ? (
            <p className="modal__place-name">
              <span className="modal__place-ok" aria-hidden />
              {locality.name}
              <span style={{ fontWeight: 500, color: 'var(--mist)' }}>
                · Ward {resolved?.wardId ?? locality.electoralWardId}
              </span>
            </p>
          ) : (
            <p className="modal__place-name" style={{ fontWeight: 500, color: 'var(--mist)' }}>
              Location not set
            </p>
          )}
          <button
            type="button"
            className="modal__place-btn"
            onClick={locate}
            disabled={locating}
          >
            {locating ? 'Locating…' : locality ? 'Refine with GPS' : 'Use my location'}
          </button>
        </div>
        {locationHint && !error && <p className="modal__hint">{locationHint}</p>}

        <label className="modal__field">
          <span>What happened?</span>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Short factual note…"
            required
          />
        </label>

        <label className="modal__photo">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          {photoDataUrl ? 'Change photo' : 'Add photo (optional)'}
          <span>PNG, JPG</span>
        </label>
        {photoDataUrl && (
          <img src={photoDataUrl} alt="Selected report" className="modal__preview" />
        )}

        <fieldset className="modal__field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sr-only">Public author</legend>
          <label className="modal__check" style={{ display: 'flex', gap: '0.45rem', fontWeight: 500 }}>
            <input
              type="radio"
              name="publishAs"
              checked={publishAs === 'anonymous'}
              onChange={() => setPublishAs('anonymous')}
            />
            Anonymous ({anonId ?? 'assigned id'})
          </label>
        </fieldset>

        {error && (
          <p className="modal__error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          {publishFailed && (
            <button
              type="button"
              className="modal__local-only"
              onClick={saveOnThisDeviceOnly}
              disabled={submitting}
            >
              {SAVE_DEVICE_ONLY_LABEL}
            </button>
          )}
          <button type="button" className="modal__cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--alert" disabled={submitting}>
            {submitting ? 'Publishing…' : publishFailed ? 'Retry' : 'Publish report'}
          </button>
        </div>
      </form>
    </div>
  );
}
