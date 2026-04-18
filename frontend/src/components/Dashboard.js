import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard, fetchPendingReminders } from '../store/interactionsSlice';

const SENT_COLORS = { positive: '#22c55e', neutral: '#f59e0b', negative: '#ef4444' };

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ borderTopColor: color || 'var(--accent)' }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function SentimentBar({ pos, neu, neg }) {
  const total = pos + neu + neg || 1;
  return (
    <div className="sentiment-bar-wrap">
      <div className="sentiment-bar-label">Sentiment Distribution</div>
      <div className="sentiment-bar">
        <div className="sb-seg positive" style={{ width: `${(pos/total)*100}%` }} title={`Positive: ${pos}`} />
        <div className="sb-seg neutral"  style={{ width: `${(neu/total)*100}%` }} title={`Neutral: ${neu}`} />
        <div className="sb-seg negative" style={{ width: `${(neg/total)*100}%` }} title={`Negative: ${neg}`} />
      </div>
      <div className="sb-legend">
        <span><span className="dot positive" />Positive ({pos})</span>
        <span><span className="dot neutral"  />Neutral ({neu})</span>
        <span><span className="dot negative" />Negative ({neg})</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const dispatch  = useDispatch();
  const { dashboard, dashboardLoading, reminders } = useSelector(s => s.interactions);

  useEffect(() => {
    dispatch(fetchDashboard());
    dispatch(fetchPendingReminders());
  }, [dispatch]);

  if (dashboardLoading || !dashboard) {
    return (
      <div className="loading-state">
        <div className="spinner" /><p>Loading dashboard…</p>
      </div>
    );
  }

  const d = dashboard;
  const positiveRate = d.total_interactions
    ? Math.round((d.positive_count / d.total_interactions) * 100) : 0;

  return (
    <div className="dashboard-page">
      {/* KPI row */}
      <div className="kpi-grid">
        <StatCard icon="📊" label="Total Interactions" value={d.total_interactions} color="var(--accent)" />
        <StatCard icon="😊" label="Positive"  value={d.positive_count}  color="#22c55e" sub={`${positiveRate}% of total`} />
        <StatCard icon="😐" label="Neutral"   value={d.neutral_count}   color="#f59e0b" />
        <StatCard icon="😟" label="Negative"  value={d.negative_count}  color="#ef4444" />
        <StatCard icon="🔔" label="Pending Reminders" value={d.pending_reminders} color="#a78bfa" />
      </div>

      {/* Middle row */}
      <div className="dash-mid">
        {/* Sentiment bar */}
        <div className="dash-panel">
          <SentimentBar pos={d.positive_count} neu={d.neutral_count} neg={d.negative_count} />

          {/* By type */}
          <div className="section-title" style={{ marginTop: 24 }}>Interactions by Type</div>
          <div className="type-bars">
            {Object.entries(d.interactions_by_type).map(([type, count]) => {
              const pct = Math.round((count / d.total_interactions) * 100);
              return (
                <div key={type} className="type-bar-row">
                  <div className="type-bar-label">{type}</div>
                  <div className="type-bar-track">
                    <div className="type-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="type-bar-count">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top HCPs */}
        <div className="dash-panel">
          <div className="section-title">Top HCPs</div>
          {d.top_hcps.length === 0
            ? <p className="empty-hint">No data yet</p>
            : d.top_hcps.map((h, i) => (
              <div key={h.name} className="hcp-rank-row">
                <div className="hcp-rank-num">#{i+1}</div>
                <div className="hcp-rank-name">{h.name}</div>
                <div className="hcp-rank-count">{h.count} visits</div>
              </div>
            ))}

          {/* Products */}
          {d.products_mentioned.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 24 }}>Top Products</div>
              <div className="product-chips-dash">
                {d.products_mentioned.map(p => (
                  <span key={p.name} className="prod-chip-dash">
                    💊 {p.name} <span className="prod-count">{p.count}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="dash-panel reminders-panel">
          <div className="section-title">🔔 Upcoming Reminders</div>
          <div className="reminders-list">
            {reminders.map(r => (
              <div key={r.id} className="reminder-row">
                <div className="reminder-hcp">{r.hcp_name}</div>
                <div className="reminder-date">
                  {new Date(r.reminder_date).toLocaleString('en-IN', {
                    day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
                  })}
                </div>
                {r.reminder_note && <div className="reminder-note">{r.reminder_note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent interactions */}
      <div className="dash-panel">
        <div className="section-title">Recent Interactions</div>
        {d.recent_interactions.map(r => (
          <div key={r.id} className="recent-row">
            <div
              className="recent-sentiment-dot"
              style={{ background: SENT_COLORS[r.sentiment] || '#888' }}
            />
            <div className="recent-info">
              <div className="recent-hcp">{r.hcp_name}</div>
              <div className="recent-meta">{r.interaction_type} · {new Date(r.date_time).toLocaleDateString('en-IN', {day:'numeric',month:'short'})}</div>
            </div>
            <div className={`recent-badge sentiment-${r.sentiment}`}>{r.sentiment}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
