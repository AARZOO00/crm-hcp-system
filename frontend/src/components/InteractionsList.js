import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInteractions, setForm, setEditingId } from '../store/interactionsSlice';

const SENTIMENT_CONFIG = {
  positive: { icon: '😊', color: '#22c55e', bg: '#f0fdf4' },
  neutral: { icon: '😐', color: '#f59e0b', bg: '#fffbeb' },
  negative: { icon: '😟', color: '#ef4444', bg: '#fef2f2' },
};

export default function InteractionsList() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.interactions);

  useEffect(() => {
    dispatch(fetchInteractions());
  }, [dispatch]);

  const handleEdit = (interaction) => {
    dispatch(setForm({
      ...interaction,
      date_time: interaction.date_time
        ? new Date(interaction.date_time).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
    }));
    dispatch(setEditingId(interaction.id));
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading interactions...</p>
      </div>
    );
  }

  if (!list.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <h3>No interactions yet</h3>
        <p>Log your first HCP interaction to see it here.</p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h2 className="history-title">All Interactions</h2>
        <div className="history-count">{list.length} records</div>
      </div>

      <div className="interactions-grid">
        {list.map(interaction => {
          const sent = SENTIMENT_CONFIG[interaction.sentiment] || SENTIMENT_CONFIG.neutral;
          const date = new Date(interaction.date_time);
          return (
            <div key={interaction.id} className="interaction-card">
              <div className="card-header">
                <div className="card-hcp-name">{interaction.hcp_name}</div>
                <div
                  className="card-sentiment"
                  style={{ background: sent.bg, color: sent.color }}
                >
                  {sent.icon} {interaction.sentiment}
                </div>
              </div>

              <div className="card-meta">
                <span className="meta-tag">{interaction.interaction_type}</span>
                <span className="meta-date">
                  {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {interaction.products_discussed?.length > 0 && (
                <div className="card-products">
                  {interaction.products_discussed.map((p, i) => (
                    <span key={i} className="product-chip">💊 {p}</span>
                  ))}
                </div>
              )}

              {interaction.summary && (
                <p className="card-summary">{interaction.summary}</p>
              )}

              {interaction.notes && (
                <p className="card-notes">{interaction.notes.slice(0, 120)}{interaction.notes.length > 120 ? '...' : ''}</p>
              )}

              {interaction.follow_up_actions && (
                <div className="card-followup">
                  <span className="followup-label">📋 Follow-up:</span>
                  <span className="followup-text">{interaction.follow_up_actions.slice(0, 80)}...</span>
                </div>
              )}

              <div className="card-footer">
                <span className="card-id">#{interaction.id}</span>
                <button className="edit-btn" onClick={() => handleEdit(interaction)}>
                  ✏️ Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
