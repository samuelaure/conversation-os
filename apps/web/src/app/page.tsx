'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

/* ── Types ─────────────────────────────────────────────── */
interface Niche {
  id: string;
  slug: string;
  name: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  headline: string | null;
  location: string | null;
  photoUrl: string | null;
  linkedinUrl: string;
  layer: number;
  status: string;
  tags: string[];
  company: { name: string; logoUrl: string | null } | null;
  niche: Niche | null;
  createdAt: string;
}

interface Toast { id: number; type: 'info' | 'success' | 'error'; message: string; }

interface StatusOption { value: string; label: string; }

/* ── Status Configuration ────────────────────────────────── */
const IMPORT_STATUS_OPTIONS: StatusOption[] = [
  { value: 'RESPONDED',  label: 'Responded' },
  { value: 'CONNECTED',  label: 'Connected' },
  { value: 'INITIAL_MESSAGE_SENT', label: 'Msg Sent' },
];

const ALL_STATUS_OPTIONS: StatusOption[] = [
  { value: 'RESPONDED',             label: 'Responded' },
  { value: 'CONNECTED',             label: 'Connected' },
  { value: 'INITIAL_MESSAGE_SENT',  label: 'Msg Sent' },
  { value: 'CONNECTION_REQUESTED',  label: 'Conn. Requested' },
  { value: 'DISCOVERED',            label: 'Discovered' },
  { value: 'RESEARCH_INVITED',      label: 'Research Invited' },
  { value: 'RESEARCH_ACCEPTED',     label: 'Research Accepted' },
  { value: 'RESEARCH_IN_PROGRESS',  label: 'Research In Progress' },
  { value: 'RESEARCH_COMPLETED',    label: 'Research Completed' },
  { value: 'OPPORTUNITY_IDENTIFIED',label: 'Opportunity ID' },
  { value: 'PROPOSAL_SENT',         label: 'Proposal Sent' },
  { value: 'CLIENT',                label: 'Client' },
  { value: 'NO_RESPONSE',           label: 'No Response' },
  { value: 'PAUSED',                label: 'Paused' },
  { value: 'NOT_A_FIT',             label: 'Not a Fit' },
  { value: 'REJECTED',              label: 'Rejected' },
  { value: 'DEFERRED',              label: 'Deferred' },
  { value: 'LOST',                  label: 'Lost' },
];

function statusClass(status: string) {
  const k = status.toLowerCase();
  if (k === 'responded')             return 'status-dropdown-responded';
  if (k === 'connected')             return 'status-dropdown-connected';
  if (k === 'connection_requested' || k === 'initial_message_sent') return 'status-dropdown-connection_requested';
  if (k.startsWith('research'))      return 'status-dropdown-research';
  return 'status-dropdown-default';
}

function nicheClass(slug: string | undefined) {
  if (slug === 'abogados')  return 'niche-abogados';
  if (slug === 'recruiters') return 'niche-recruiters';
  if (slug === 'otros')     return 'niche-otros';
  return 'niche-unset';
}

/* ── StatusDropdown ─────────────────────────────────────── */
function StatusDropdown({ id, value, onChange, options = ALL_STATUS_OPTIONS, disabled = false }:
  { id?: string; value: string; onChange: (v: string) => void; options?: StatusOption[]; disabled?: boolean }) {
  return (
    <select
      id={id}
      className={`status-dropdown ${statusClass(value)}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ── NicheDropdown ──────────────────────────────────────── */
function NicheDropdown({ id, value, niches, onChange, disabled = false }:
  { id?: string; value: string | null; niches: Niche[]; onChange: (slug: string | null) => void; disabled?: boolean }) {
  const currentSlug = value ?? '';
  return (
    <select
      id={id}
      className={`niche-dropdown ${nicheClass(currentSlug || undefined)}`}
      value={currentSlug}
      onChange={e => onChange(e.target.value || null)}
      disabled={disabled}
    >
      <option value="">— Sin nicho —</option>
      {niches.map(n => <option key={n.slug} value={n.slug}>{n.name}</option>)}
    </select>
  );
}

/* ── Label (sub-niche) config ────────────────────────────── */
const LABEL_OPTIONS = [
  { value: '',           label: '— Sin etiqueta —', cls: 'label-unset' },
  { value: 'market',     label: '🎯 Mercado',         cls: 'label-market' },
  { value: 'competitor', label: '⚔️ Competencia',      cls: 'label-competitor' },
  { value: 'partner',    label: '🤝 Aliado',           cls: 'label-partner' },
  { value: 'reference',  label: '📚 Referencia',       cls: 'label-reference' },
];

function getLabel(tags: string[]): string {
  const tag = tags.find(t => t.startsWith('label:'));
  return tag ? tag.replace('label:', '') : '';
}

/* ── LabelDropdown ──────────────────────────────────────── */
function LabelDropdown({ id, tags, onChange, disabled = false }:
  { id?: string; tags: string[]; onChange: (label: string | null) => void; disabled?: boolean }) {
  const current = getLabel(tags);
  const opt = LABEL_OPTIONS.find(o => o.value === current) ?? LABEL_OPTIONS[0];
  return (
    <select
      id={id}
      className={`label-dropdown ${opt.cls}`}
      value={current}
      onChange={e => onChange(e.target.value || null)}
      disabled={disabled}
    >
      {LABEL_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── Helpers ────────────────────────────────────────────── */
function initials(f: string, l: string) {
  return `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();
}

/* ── Page ────────────────────────────────────────────────── */
export default function ContactsPage() {
  const [url, setUrl]             = useState('');
  const [importStatus, setImportStatus] = useState<string>('RESPONDED');
  const [loading, setLoading]     = useState(false);
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [niches, setNiches]       = useState<Niche[]>([]);
  const [toasts, setToasts]       = useState<Toast[]>([]);
  const [pollingJobs, setPollingJobs] = useState<string[]>([]);
  const [updatingId, setUpdatingId]   = useState<string | null>(null);

  // Filters
  const [filterNiche,  setFilterNiche]  = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch]             = useState<string>('');

  /* Fetch */
  const fetchContacts = useCallback(async () => {
    const res = await fetch('/api/contacts');
    if (res.ok) setContacts(await res.json());
  }, []);

  const fetchNiches = useCallback(async () => {
    const res = await fetch('/api/contacts/niches');
    if (res.ok) setNiches(await res.json());
  }, []);

  useEffect(() => { fetchContacts(); fetchNiches(); }, [fetchContacts, fetchNiches]);

  /* Toast */
  const addToast = (type: Toast['type'], message: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  /* Poll job */
  const pollJob = useCallback((jobId: string) => {
    setPollingJobs(j => [...j, jobId]);
    const interval = setInterval(async () => {
      const res  = await fetch(`/api/contacts/jobs/${jobId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.state === 'completed') {
        clearInterval(interval);
        setPollingJobs(j => j.filter(x => x !== jobId));
        addToast('success', 'Contact imported successfully!');
        fetchContacts();
      } else if (data.state === 'failed') {
        clearInterval(interval);
        setPollingJobs(j => j.filter(x => x !== jobId));
        addToast('error', `Import failed: ${data.failedReason ?? 'unknown error'}`);
      }
    }, 3000);
  }, [fetchContacts]);

  /* Import */
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: url.trim(), status: importStatus }),
      });
      if (!res.ok) { addToast('error', (await res.json()).message ?? 'Failed'); return; }
      const { jobId } = await res.json();
      addToast('info', `Import queued (job ${jobId}). ~30s…`);
      setUrl('');
      pollJob(String(jobId));
    } catch { addToast('error', 'Network error — is the API running?'); }
    finally { setLoading(false); }
  };

  /* Update status */
  const handleStatusChange = async (contactId: string, newStatus: string) => {
    const prev = [...contacts];
    setContacts(cs => cs.map(c => c.id === contactId ? { ...c, status: newStatus } : c));
    setUpdatingId(contactId);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      addToast('success', `Status → ${newStatus.replace(/_/g, ' ')}`);
    } catch { setContacts(prev); addToast('error', 'Could not update status'); }
    finally { setUpdatingId(null); }
  };

  /* Update niche */
  const handleNicheChange = async (contactId: string, nicheSlug: string | null) => {
    const prev = [...contacts];
    const newNiche = niches.find(n => n.slug === nicheSlug) ?? null;
    setContacts(cs => cs.map(c => c.id === contactId ? { ...c, niche: newNiche } : c));
    setUpdatingId(contactId);
    try {
      const res = await fetch(`/api/contacts/${contactId}/niche`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicheSlug }),
      });
      if (!res.ok) throw new Error();
      addToast('success', `Niche → ${newNiche?.name ?? 'unset'}`);
    } catch { setContacts(prev); addToast('error', 'Could not update niche'); }
    finally { setUpdatingId(null); }
  };

  /* Update label */
  const handleLabelChange = async (contactId: string, label: string | null) => {
    const prev = [...contacts];
    // Optimistic update: swap the label:* tag
    setContacts(cs => cs.map(c => {
      if (c.id !== contactId) return c;
      const otherTags = (c.tags ?? []).filter((t: string) => !t.startsWith('label:'));
      return { ...c, tags: label ? [...otherTags, `label:${label}`] : otherTags };
    }));
    setUpdatingId(contactId);
    try {
      const res = await fetch(`/api/contacts/${contactId}/label`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error();
      const labelName = LABEL_OPTIONS.find(o => o.value === (label ?? ''))?.label ?? 'Sin etiqueta';
      addToast('success', `Etiqueta → ${labelName}`);
    } catch { setContacts(prev); addToast('error', 'Could not update label'); }
    finally { setUpdatingId(null); }
  };

  /* Filtered contacts */
  const filtered = useMemo(() => {
    return contacts.filter(c => {
      if (filterNiche !== 'all') {
        if (filterNiche === 'unset' && c.niche !== null) return false;
        if (filterNiche !== 'unset' && c.niche?.slug !== filterNiche) return false;
      }
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = `${c.firstName} ${c.lastName}`.toLowerCase();
        const company = (c.company?.name ?? '').toLowerCase();
        const job = (c.jobTitle ?? c.headline ?? '').toLowerCase();
        if (!name.includes(q) && !company.includes(q) && !job.includes(q)) return false;
      }
      return true;
    });
  }, [contacts, filterNiche, filterStatus, search]);

  /* Niche counts */
  const nicheCounts = useMemo(() => {
    const counts: Record<string, number> = { unset: 0 };
    niches.forEach(n => counts[n.slug] = 0);
    contacts.forEach(c => {
      if (c.niche) counts[c.niche.slug] = (counts[c.niche.slug] ?? 0) + 1;
      else counts['unset']++;
    });
    return counts;
  }, [contacts, niches]);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <main style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      <div className="container">

        {/* Header */}
        <div className="flex items-center gap-3" style={{ marginBottom: '2rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem',
          }}>🧠</div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.2 }}>
              Conversation OS
            </h1>
            <p className="text-sm text-muted">Contact import &amp; management</p>
          </div>
          <Link href="/assistant" className="btn" style={{ marginLeft: 'auto' }}>
            🎯 Asistente de Conversaciones
          </Link>
        </div>

        {/* Niche summary pills */}
        <div className="flex gap-2" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {niches.map(n => (
            <button
              key={n.slug}
              className={`niche-pill ${nicheClass(n.slug)} ${filterNiche === n.slug ? 'niche-pill-active' : ''}`}
              onClick={() => setFilterNiche(filterNiche === n.slug ? 'all' : n.slug)}
            >
              {n.name} <span className="niche-pill-count">{nicheCounts[n.slug] ?? 0}</span>
            </button>
          ))}
          <button
            className={`niche-pill niche-unset ${filterNiche === 'unset' ? 'niche-pill-active' : ''}`}
            onClick={() => setFilterNiche(filterNiche === 'unset' ? 'all' : 'unset')}
          >
            Sin nicho <span className="niche-pill-count">{nicheCounts['unset'] ?? 0}</span>
          </button>
          <button
            className={`niche-pill niche-all ${filterNiche === 'all' ? 'niche-pill-active' : ''}`}
            onClick={() => setFilterNiche('all')}
          >
            Todos <span className="niche-pill-count">{contacts.length}</span>
          </button>
        </div>

        {/* Import form */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Import LinkedIn Profile
          </h2>
          <form onSubmit={handleImport} className="flex gap-3 items-center">
            <input
              id="linkedin-url-input"
              className="input"
              type="url"
              placeholder="https://www.linkedin.com/in/username"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <StatusDropdown
              id="import-status-dropdown"
              value={importStatus}
              onChange={setImportStatus}
              options={IMPORT_STATUS_OPTIONS}
              disabled={loading}
            />
            <button
              id="import-btn"
              className="btn"
              type="submit"
              disabled={loading || !url.trim()}
            >
              {loading ? 'Queuing…' : 'Import'}
            </button>
          </form>
          {pollingJobs.length > 0 && (
            <p className="text-sm text-muted mt-2">
              ⏳ {pollingJobs.length} job{pollingJobs.length > 1 ? 's' : ''} in progress…
            </p>
          )}
        </div>

        {/* Contacts table */}
        <div className="card mt-6">
          {/* Table header + filters */}
          <div style={{ marginBottom: '1rem' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Contacts</h2>
              <span className="badge badge-layer">{filtered.length} / {contacts.length}</span>
            </div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <input
                className="input"
                placeholder="🔍 Buscar por nombre, empresa, cargo…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <select
                className="status-dropdown status-dropdown-default"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{ minWidth: 150 }}
              >
                <option value="all">All statuses</option>
                {ALL_STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-muted text-sm" style={{ padding: '2rem 0', textAlign: 'center' }}>
              {contacts.length === 0
                ? 'No contacts yet. Import a LinkedIn profile above.'
                : 'No contacts match the current filters.'}
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Role</th>
                    <th>Company</th>
                    <th>Nicho</th>
                    <th>Etiqueta</th>
                    <th>Status</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {c.photoUrl
                            ? <img src={c.photoUrl} alt="" className="avatar" />
                            : <div className="avatar-placeholder">{initials(c.firstName, c.lastName)}</div>
                          }
                          <div>
                            <div className="font-bold" style={{ fontSize: '.9rem' }}>
                              {c.firstName} {c.lastName}
                            </div>
                            <a
                              href={c.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-muted"
                              style={{ fontSize: '.78rem' }}
                            >
                              LinkedIn ↗
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm">{c.jobTitle ?? c.headline ?? '—'}</td>
                      <td className="text-sm">{c.company?.name ?? '—'}</td>
                      <td>
                        <NicheDropdown
                          id={`niche-dropdown-${c.id}`}
                          value={c.niche?.slug ?? null}
                          niches={niches}
                          onChange={slug => handleNicheChange(c.id, slug)}
                          disabled={updatingId === c.id}
                        />
                      </td>
                      <td>
                        <LabelDropdown
                          id={`label-dropdown-${c.id}`}
                          tags={c.tags ?? []}
                          onChange={label => handleLabelChange(c.id, label)}
                          disabled={updatingId === c.id}
                        />
                      </td>
                      <td>
                        <StatusDropdown
                          id={`status-dropdown-${c.id}`}
                          value={c.status}
                          onChange={val => handleStatusChange(c.id, val)}
                          disabled={updatingId === c.id}
                        />
                      </td>
                      <td className="text-sm text-muted">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>
    </main>
  );
}
