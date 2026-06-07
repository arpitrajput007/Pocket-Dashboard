import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://pocket-dashboard-mwjn.onrender.com';
const POLL_MS = 2000;

// Keep completed jobs visible for 30s so user can see the summary
const COMPLETION_LINGER_MS = 30_000;

const STATUS_ICON = {
  pending:  { icon: '○', cls: 'sync-phase-pending'  },
  running:  { icon: '◉', cls: 'sync-phase-running'  },
  done:     { icon: '✓', cls: 'sync-phase-done'      },
  error:    { icon: '✗', cls: 'sync-phase-error'     },
  skipped:  { icon: '–', cls: 'sync-phase-pending'  },
};

function PhaseRow({ phase }) {
  const s = STATUS_ICON[phase.status] || STATUS_ICON.pending;
  const pct = phase.pct ?? 0;
  return (
    <div className={`sync-phase-row ${s.cls}`}>
      <span className={`sync-phase-icon ${phase.status === 'running' ? 'spin' : ''}`}>{s.icon}</span>
      <div className="sync-phase-info">
        <span className="sync-phase-label">{phase.label}</span>
        {phase.detail && <span className="sync-phase-detail">{phase.detail}</span>}
      </div>
      {phase.status === 'running' && pct > 0 && (
        <div className="sync-phase-bar">
          <div className="sync-phase-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      {phase.status === 'done' && (
        <div className="sync-phase-bar">
          <div className="sync-phase-bar-fill done" style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
}

async function cancelSync(storeId) {
  try {
    await fetch(`${API_URL}/api/sync-cancel/${storeId}`, { method: 'POST' });
  } catch(_) {}
}

export default function SyncProgressDrawer({ storeId }) {
  const [job, setJob]         = useState(null);
  const [open, setOpen]       = useState(false);
  const [minimized, setMin]   = useState(false);
  const [stopping, setStopping] = useState(false);
  const logsEndRef            = useRef(null);
  const lingerTimer           = useRef(null);
  const pollRef               = useRef(null);

  const clearLinger = () => { if (lingerTimer.current) { clearTimeout(lingerTimer.current); lingerTimer.current = null; } };

  const poll = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`${API_URL}/api/sync-progress/${storeId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.running) {
        clearLinger();
        setJob(data);
        setOpen(true);
      } else if (data.endedAt) {
        // Just finished
        setJob(data);
        setOpen(true);
        setMin(false);
        clearLinger();
        lingerTimer.current = setTimeout(() => {
          setOpen(false);
          setJob(null);
        }, COMPLETION_LINGER_MS);
      } else {
        // No job
        if (job?.running) {
          // Was running, now gone — treat as finished
          setOpen(false);
        }
      }
    } catch (_) {}
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start polling
  useEffect(() => {
    if (!storeId) return;
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => {
      clearInterval(pollRef.current);
      clearLinger();
    };
  }, [storeId, poll]);

  // Auto-scroll logs
  useEffect(() => {
    if (open && !minimized && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [job?.logs?.length, open, minimized]);

  if (!open || !job) return null;

  const isRunning   = job.running;
  const isCancelled = !!job.cancelled;
  const isError     = !!job.error && !isCancelled;
  const isDone      = !isRunning && !isError && !isCancelled;
  const typeLabel   = job.type === 'shiprocket' ? 'Shiprocket' : 'Shopify';
  const elapsed     = job.endedAt
    ? `${Math.round((new Date(job.endedAt) - new Date(job.startedAt)) / 1000)}s`
    : '';
  // Badge shown next to title: "First Setup" (full backfill) vs "Incremental"
  const modeBadge = job.type === 'shiprocket' && job.syncMode
    ? job.syncMode === 'full'
      ? { label: 'First Setup', color: 'rgba(251,191,36,1)', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' }
      : { label: 'Incremental', color: 'rgba(52,211,153,1)',  bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)' }
    : null;

  const overallPct = job.phases.length === 0 ? 0
    : Math.round(job.phases.reduce((s, p) => s + (p.pct ?? 0), 0) / job.phases.length);

  const handleStop = async (e) => {
    e.stopPropagation();
    setStopping(true);
    await cancelSync(storeId);
    setStopping(false);
  };

  return (
    <div className={`sync-drawer ${minimized ? 'minimized' : ''} ${isDone ? 'done' : ''} ${isError ? 'error' : ''} ${isCancelled ? 'cancelled' : ''}`}>
      {/* Header */}
      <div className="sync-drawer-header" onClick={() => setMin(m => !m)}>
        <div className="sync-drawer-title">
          {isRunning   && <span className="sync-spinner" />}
          {isDone      && <span className="sync-done-dot" />}
          {isError     && <span className="sync-error-dot" />}
          {isCancelled && <span className="sync-cancel-dot" />}
          <span>
            {isRunning   ? `Syncing ${typeLabel}…`
            : isDone      ? `${typeLabel} Sync Complete`
            : isCancelled ? `${typeLabel} Sync Stopped`
            :               `${typeLabel} Sync Error`}
          </span>
          {modeBadge && (
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px',
              background: modeBadge.bg, color: modeBadge.color, border: `1px solid ${modeBadge.border}`,
              letterSpacing: '0.3px', flexShrink: 0,
            }}>
              {modeBadge.label}
            </span>
          )}
          {isRunning && overallPct > 0 && <span className="sync-header-pct">{overallPct}%</span>}
          {elapsed   && <span className="sync-header-elapsed">{elapsed}</span>}
        </div>
        <div className="sync-drawer-actions">
          {/* Stop button — only while running */}
          {isRunning && (
            <button
              className="sync-stop-btn"
              onClick={handleStop}
              disabled={stopping}
              title="Stop sync"
            >
              {stopping ? '…' : '⏹ Stop'}
            </button>
          )}
          <button className="sync-action-btn" onClick={e => { e.stopPropagation(); setMin(m => !m); }}
            title={minimized ? 'Expand' : 'Minimise'}>
            {minimized ? '▲' : '▼'}
          </button>
          {!isRunning && (
            <button className="sync-action-btn" onClick={e => { e.stopPropagation(); setOpen(false); clearLinger(); }}
              title="Close">✕</button>
          )}
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="sync-drawer-body">
          {/* Overall progress bar */}
          {isRunning && (
            <div className="sync-overall-bar">
              <div className="sync-overall-fill" style={{ width: `${overallPct}%` }} />
            </div>
          )}

          {/* Phases */}
          {job.phases.length > 0 && (
            <div className="sync-phases">
              {job.phases.map(p => <PhaseRow key={p.id} phase={p} />)}
            </div>
          )}

          {/* Result summary */}
          {isDone && job.result && (
            <div className="sync-result">
              ✅ {job.result.totalSynced?.toLocaleString() ?? 0} records synced
              {job.result.historicalResolved > 0 && ` · ${job.result.historicalResolved} order lookups`}
              {job.syncMode === 'incremental' && ' · incremental update'}
              {job.syncMode === 'full' && ' · full backfill complete'}
            </div>
          )}
          {isCancelled && (
            <div className="sync-result cancelled">🛑 Sync stopped — partial data may have been saved</div>
          )}
          {isError && (
            <div className="sync-result error">❌ {job.error}</div>
          )}

          {/* Live logs */}
          <div className="sync-logs">
            <div className="sync-logs-label">Logs</div>
            <div className="sync-logs-body">
              {(job.logs || []).map((l, i) => (
                <div key={i} className="sync-log-line">
                  <span className="sync-log-time">{new Date(l.time).toLocaleTimeString()}</span>
                  <span className="sync-log-msg">{l.msg}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
