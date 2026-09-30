'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ── Types ─────────────────────────────────────────────── */
interface Niche { id: string; slug: string; name: string; }
interface Company { name: string; }
interface Person {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  headline: string | null;
  photoUrl: string | null;
  linkedinUrl: string;
  status: string;
  company: Company | null;
  niche: Niche | null;
  lastContactedAt: string | null;
  lastRespondedAt: string | null;
  nextFollowUpAt: string | null;
  followUpCount: number;
}

interface ActionQueue {
  pitchReady: Person[];
  followUpsDue: Person[];
  neverContacted: Person[];
  total: number;
}

interface GeneratedMessage {
  personId: string;
  type: string;
  proposedMessage: string;
}

interface Toast { id: number; type: 'info' | 'success' | 'error'; message: string; }

/* ── Helpers ─────────────────────────────────────────────── */
function initials(f: string, l: string) {
  return `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  return `hace ${diff}d`;
}

function nicheColor(slug: string | undefined): string {
  if (slug === 'abogados')  return '#fbbf24';
  if (slug === 'recruiters') return '#60a5fa';
  return '#6b7280';
}

/* ── Interaction type config ─────────────────────────────── */
const TYPE_CONFIG: Record<string, { label: string; description: string; color: string; nextStatus?: string }> = {
  INITIAL_CONTACT:    { label: '👋 Primer contacto',       description: '"Hola, gracias por conectar"',        color: '#818cf8' },
  FOLLOW_UP:          { label: '🔁 Follow-up 1',           description: 'Sin respuesta al primer mensaje',     color: '#f59e0b' },
  FOLLOW_UP_2:        { label: '🔁 Follow-up 2',           description: 'Último intento antes de archivar',   color: '#ef4444' },
  RESEARCH_PITCH:     { label: '🎯 Pitch de Investigación', description: 'Invitar a conversación de investigación', color: '#22c55e' },
  RESEARCH_FOLLOW_UP: { label: '🔁 Follow-up Pitch',       description: 'Sin respuesta al pitch',             color: '#f59e0b' },
  RESEARCH_CONFIRM:   { label: '📅 Confirmar Entrevista',   description: 'Acordar formato y horario',          color: '#818cf8' },
  RESEARCH_INTERVIEW: { label: '🎤 Guion Entrevista',       description: 'Preguntas de investigación',         color: '#a78bfa' },
};

function suggestedType(p: Person): string {
  if (p.status === 'RESPONDED')             return 'RESEARCH_PITCH';
  if (p.status === 'RESEARCH_INVITED')      return 'RESEARCH_FOLLOW_UP';
  if (p.status === 'RESEARCH_ACCEPTED')     return 'RESEARCH_CONFIRM';
  if (p.status === 'RESEARCH_IN_PROGRESS')  return 'RESEARCH_INTERVIEW';
  if (p.status === 'INITIAL_MESSAGE_SENT')  return p.followUpCount === 0 ? 'FOLLOW_UP' : 'FOLLOW_UP_2';
  return 'INITIAL_CONTACT';
}

/* ── PersonCard ─────────────────────────────────────────── */
function PersonCard({
  person,
  queueLabel,
  onActionComplete,
}: {
  person: Person;
  queueLabel: string;
  onActionComplete: () => void;
}) {
  const [expanded, setExpanded]       = useState(false);
  const [msgType, setMsgType]         = useState<string>(suggestedType(person));
  const [generated, setGenerated]     = useState<GeneratedMessage | null>(null);
  const [editedMsg, setEditedMsg]     = useState<string>('');
  const [isEditing, setIsEditing]     = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [copied, setCopied]           = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/interactions/generate?personId=${person.id}&type=${msgType}`);
      if (res.ok) {
        const data: GeneratedMessage = await res.json();
        setGenerated(data);
        setEditedMsg(data.proposedMessage);
        setIsEditing(false);
      }
    } finally { setGenerating(false); }
  };

  const markSent = async (edited: boolean) => {
    if (!generated) return;
    setSaving(true);
    try {
      // 1. Create the interaction record
      const createRes = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: person.id,
          type: msgType,
          direction: 'OUTBOUND',
          proposedMessage: generated.proposedMessage,
          status: 'PROPOSED',
        }),
      });
      if (!createRes.ok) return;
      const interaction = await createRes.json();

      // 2. Mark it as sent (with or without edits)
      await fetch(`/api/interactions/${interaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: edited ? 'SENT_EDITED' : 'SENT',
          ...(edited ? { editedMessage: editedMsg, finalMessage: editedMsg } : {}),
        }),
      });

      onActionComplete();
    } finally { setSaving(false); }
  };

  const copyAndMarkSent = async () => {
    const msg = isEditing ? editedMsg : generated?.proposedMessage ?? '';
    await navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    await markSent(isEditing);
  };

  const typeConf = TYPE_CONFIG[msgType] ?? { label: msgType, description: '', color: '#818cf8' };

  return (
    <div className="person-card">
      {/* Card header */}
      <div className="person-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          {person.photoUrl
            ? <img src={person.photoUrl} alt="" className="avatar" />
            : <div className="avatar-placeholder">{initials(person.firstName, person.lastName)}</div>
          }
          <div>
            <div style={{ fontWeight: 700, fontSize: '.95rem' }}>
              {person.firstName} {person.lastName}
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
              {person.jobTitle ?? person.headline ?? '—'}
              {person.company && <span> · {person.company.name}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          {person.niche && (
            <span className="niche-tag" style={{ color: nicheColor(person.niche.slug), borderColor: nicheColor(person.niche.slug) }}>
              {person.niche.name}
            </span>
          )}
          <span className="queue-label">{queueLabel}</span>
          <span style={{ color: 'var(--muted)', fontSize: '1rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="person-card-body">
          {/* Meta row */}
          <div className="flex gap-4" style={{ marginBottom: '1rem', fontSize: '.8rem', color: 'var(--muted)' }}>
            <span>📅 Último contacto: <strong>{daysAgo(person.lastContactedAt)}</strong></span>
            {person.lastRespondedAt && <span>💬 Respondió: <strong>{daysAgo(person.lastRespondedAt)}</strong></span>}
            {person.followUpCount > 0 && <span>🔁 Follow-ups enviados: <strong>{person.followUpCount}</strong></span>}
            <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', color: 'var(--accent)' }}>
              LinkedIn ↗
            </a>
          </div>

          {/* Type selector */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '.8rem', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '.4rem' }}>
              TIPO DE MENSAJE
            </label>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <button
                  key={k}
                  className={`msg-type-btn ${msgType === k ? 'msg-type-btn-active' : ''}`}
                  style={msgType === k ? { borderColor: v.color, color: v.color } : {}}
                  onClick={() => { setMsgType(k); setGenerated(null); setIsEditing(false); }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.3rem' }}>
              {typeConf.description}
            </div>
          </div>

          {/* Generate button */}
          {!generated && (
            <button
              className="btn"
              onClick={generate}
              disabled={generating}
              style={{ marginBottom: '1rem' }}
            >
              {generating ? '⏳ Generando…' : `✨ Generar ${typeConf.label}`}
            </button>
          )}

          {/* Message display */}
          {generated && (
            <div className="msg-box">
              <div className="msg-box-header">
                <span style={{ fontSize: '.78rem', color: 'var(--muted)', fontWeight: 600 }}>MENSAJE PROPUESTO</span>
                <div className="flex gap-2">
                  <button
                    className="btn-sm"
                    onClick={() => { setIsEditing(!isEditing); if (!isEditing) setEditedMsg(generated.proposedMessage); }}
                  >
                    {isEditing ? 'Ver original' : '✏️ Editar'}
                  </button>
                  <button
                    className="btn-sm"
                    onClick={() => { setGenerated(null); setIsEditing(false); }}
                  >
                    🔄 Regenerar
                  </button>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  className="msg-textarea"
                  value={editedMsg}
                  onChange={e => setEditedMsg(e.target.value)}
                  rows={6}
                />
              ) : (
                <pre className="msg-preview">{generated.proposedMessage}</pre>
              )}

              {/* Action buttons */}
              <div className="flex gap-2" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  id={`copy-send-btn-${person.id}`}
                  className="btn"
                  onClick={copyAndMarkSent}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  {copied ? '✅ Copiado y marcado como enviado' : saving ? '⏳ Guardando…' : '📋 Copiar y marcar como Enviado'}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => markSent(false)}
                  disabled={saving}
                  title="Marcar como enviado sin copiar (si ya lo copiaste)"
                >
                  ✓ Solo marcar enviado
                </button>
              </div>

              {isEditing && (
                <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.5rem' }}>
                  💡 Se guardará como "Enviado editado" — el original y tu versión quedarán registrados.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function AssistantPage() {
  const [queue, setQueue]   = useState<ActionQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: Toast['type'], msg: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, message: msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/interactions/queue');
      if (res.ok) setQueue(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleActionComplete = () => {
    addToast('success', 'Registrado ✅ — recargando cola…');
    setTimeout(fetchQueue, 800);
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <main style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      <div className="container">

        {/* Header */}
        <div className="flex items-center gap-3" style={{ marginBottom: '.75rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #22c55e, #4ade80)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem',
          }}>🎯</div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.2 }}>
              Asistente de Conversaciones
            </h1>
            <p className="text-sm text-muted">Tu cola de acción diaria</p>
          </div>
          <Link href="/" className="btn btn-ghost" style={{ marginLeft: 'auto' }}>
            ← Contactos
          </Link>
        </div>

        {/* Summary bar */}
        {queue && (
          <div className="flex gap-3" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div className="summary-pill summary-pitch">
              <span className="summary-num">{queue.pitchReady.length}</span>
              <span>listos para pitch</span>
            </div>
            <div className="summary-pill summary-followup">
              <span className="summary-num">{queue.followUpsDue.length}</span>
              <span>follow-ups vencidos</span>
            </div>
            <div className="summary-pill summary-new">
              <span className="summary-num">{queue.neverContacted.length}</span>
              <span>sin contactar</span>
            </div>
            <div className="summary-pill summary-total">
              <span className="summary-num">{queue.total}</span>
              <span>acciones hoy</span>
            </div>
          </div>
        )}

        {loading && (
          <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '3rem' }}>
            Cargando cola de acción…
          </p>
        )}

        {!loading && queue?.total === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '.5rem' }}>Cola vacía</h2>
            <p className="text-muted text-sm">
              No hay acciones pendientes por ahora. Los contactos con{' '}
              <strong>Responded</strong> o follow-ups vencidos aparecerán aquí.
            </p>
            <Link href="/" className="btn" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
              Ir a Contactos
            </Link>
          </div>
        )}

        {/* Queue 1: Pitch Ready */}
        {queue && queue.pitchReady.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 className="queue-section-title">
              🎯 Listos para Pitch de Investigación
              <span className="queue-count">{queue.pitchReady.length}</span>
            </h2>
            <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
              Respondieron a tu mensaje inicial — el siguiente paso es invitarlos a una conversación de investigación.
            </p>
            {queue.pitchReady.map(p => (
              <PersonCard
                key={p.id}
                person={p}
                queueLabel="🎯 Pitch"
                onActionComplete={handleActionComplete}
              />
            ))}
          </section>
        )}

        {/* Queue 2: Follow-ups due */}
        {queue && queue.followUpsDue.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 className="queue-section-title">
              🔁 Follow-ups Vencidos
              <span className="queue-count">{queue.followUpsDue.length}</span>
            </h2>
            <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
              No respondieron — toca hacer un seguimiento para aumentar la tasa de respuesta.
            </p>
            {queue.followUpsDue.map(p => (
              <PersonCard
                key={p.id}
                person={p}
                queueLabel="🔁 Follow-up"
                onActionComplete={handleActionComplete}
              />
            ))}
          </section>
        )}

        {/* Queue 3: Never contacted */}
        {queue && queue.neverContacted.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 className="queue-section-title">
              👋 Sin Contactar
              <span className="queue-count">{queue.neverContacted.length}</span>
            </h2>
            <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
              Importados hace más de 2 días sin mensaje inicial. Envíales el primer contacto.
            </p>
            {queue.neverContacted.map(p => (
              <PersonCard
                key={p.id}
                person={p}
                queueLabel="👋 Nuevo"
                onActionComplete={handleActionComplete}
              />
            ))}
          </section>
        )}

      </div>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>
    </main>
  );
}
