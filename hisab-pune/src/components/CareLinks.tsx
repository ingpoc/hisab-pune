import { useEffect, useState } from 'react';
import { attachGovTicket, fetchCareLinks } from '../lib/api';
import { attachTicketErrorMessage, readCareErrorText } from '../lib/careTicketError';
import './CareLinks.css';

export type CarePayload = {
  result: { ok: false; reason: string; message: string };
  care: { portal: string; whatsapp: string };
};

interface Props {
  reportId: string;
  existingTicket?: string | null;
}

export function CareLinks({ reportId, existingTicket }: Props) {
  const [payload, setPayload] = useState<CarePayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(existingTicket ?? null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCareLinks(reportId)
      .then((data) => {
        if (cancelled) return;
        setPayload(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(readCareErrorText(err) || 'Could not load CARE links. Try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  async function onSaveTicket(e: React.FormEvent) {
    e.preventDefault();
    const externalId = ticket.trim();
    if (externalId.length < 3) {
      setTicketError('Enter a CARE ticket number (at least 3 characters).');
      return;
    }
    setSaving(true);
    setTicketError(null);
    try {
      const data = await attachGovTicket(reportId, externalId);
      setSavedId(data.ticket.externalId);
      setTicket('');
    } catch (err) {
      setTicketError(attachTicketErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="care">
      {loading && (
        <p className="care__status" role="status">
          Getting CARE links…
        </p>
      )}
      {loadError && (
        <p className="care__error" role="alert">
          {loadError}
        </p>
      )}
      {payload && (
        <>
          <p className="care__msg">{payload.result.message}</p>
          <div className="care__links">
            <a href={payload.care.portal} target="_blank" rel="noopener noreferrer">
              CARE portal
            </a>
            <a href={payload.care.whatsapp} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
        </>
      )}

      <form className="care__form" onSubmit={onSaveTicket}>
        <label htmlFor={`care-ticket-${reportId}`}>
          CARE ticket number
          <input
            id={`care-ticket-${reportId}`}
            type="text"
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            placeholder="Paste ticket id"
            autoComplete="off"
          />
        </label>
        <button type="submit" className="care__save" disabled={saving}>
          {saving ? 'Saving…' : 'Save ticket'}
        </button>
      </form>
      {savedId && (
        <p className="care__status" role="status">
          Ticket {savedId} saved on this report.
        </p>
      )}
      {ticketError && (
        <p className="care__error" role="alert">
          {ticketError}
        </p>
      )}
    </div>
  );
}
