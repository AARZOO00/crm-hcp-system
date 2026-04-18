import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTimeline } from '../store/interactionsSlice';

const SENT_COLOR = { positive: '#22c55e', neutral: '#f59e0b', negative: '#ef4444' };
const SENT_BG    = { positive: '#052e16', neutral: '#451a03', negative: '#450a0a' };
const TYPE_ICON  = {
  'In-Person Visit': '🤝', 'Phone Call': '📞',
  'Email': '📧', 'Conference': '🎤', 'Webinar': '💻', 'Other': '📝',
};

function ScoreMeter({ score }) {
  const pct = ((score + 1) / 2) * 100; // -1…1 → 0…100
  const color = score > 0.2 ? '#22c55e' : score < -0.2 ? '#ef4444' : '#f59e0b';
  return (
    <div className="score-meter">
      <div className="score-track">
        <div className="score-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="score-val" style={{ color }}>{score >= 0 ? '+' : ''}{score.toFixed(2)}</span>
    </div>
  );
}

export default function Timeline() {
  const dispatch = useDispatch();
  const { timeline } = useSelector(s => s.interactions);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    dispatch(fetchTimeline(search));
  }, [dispatch, search]);

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="timeline-page">
      <div className="timeline-header">
        <h2 className="history-title">Interaction Timeline</h2>
        <input
          className="field-input timeline-search"
          placeholder="🔍 Filter by HCP name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {timeline.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🕐</div><h3>No interactions yet</h3></div>
      ) : (
        <div className="timeline-wrap">
          <div className="timeline-spine" />
          {timeline.map((item, idx) => {
            const open  = !!expanded[item.id];
            const color = SENT_COLOR[item.sentiment] || '#888';
            const bg    = SENT_BG[item.sentiment]    || '#1a1a2e';
            const date  = new Date(item.date_time);
            return (
              <div key={item.id} className={`tl-item ${idx % 2 === 0 ? 'tl-left' : 'tl-right'}`}>
                {/* Connector dot */}
                <div className="tl-dot" style={{ borderColor: color, boxShadow: `0 0 8px ${color}44` }} />

                <div className="tl-card" style={{ borderLeftColor: color }} onClick={() => toggle(item.id)}>
                  <div className="tl-card-top">
                    <span className="tl-type-icon">{TYPE_ICON[item.interaction_type] || '📝'}</span>
                    <div className="tl-meta">
                      <div className="tl-hcp">{item.hcp_name}</div>
                      <div className="tl-date">
                        {date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                        {' · '}{date.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                      </div>
                    </div>
                    <div className="tl-sent-badge" style={{ background: bg, color }}>
                      {item.sentiment}
                    </div>
                    <span className="tl-toggle">{open ? '▲' : '▼'}</span>
                  </div>

                  <ScoreMeter score={item.sentiment_score || 0} />

                  {item.products_discussed?.length > 0 && (
                    <div className="tl-products">
                      {item.products_discussed.map(p => (
                        <span key={p} className="product-chip">💊 {p}</span>
                      ))}
                    </div>
                  )}

                  {item.summary && <p className="tl-summary">{item.summary}</p>}

                  {open && item.key_points?.length > 0 && (
                    <ul className="tl-points">
                      {item.key_points.map((kp, i) => <li key={i}>▸ {kp}</li>)}
                    </ul>
                  )}

                  {item.reminder_date && (
                    <div className="tl-reminder">
                      🔔 Reminder: {new Date(item.reminder_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
