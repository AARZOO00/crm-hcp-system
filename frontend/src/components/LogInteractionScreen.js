import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateFormField, setForm, resetForm, setEditingId,
  logInteraction, editInteraction, clearMessages
} from '../store/interactionsSlice';
import ChatAssistant from './ChatAssistant';

const INTERACTION_TYPES = [
  'In-Person Visit', 'Phone Call', 'Email', 'Conference', 'Webinar', 'Other'
];

const SENTIMENTS = [
  { value: 'positive', label: '😊 Positive', color: '#22c55e' },
  { value: 'neutral', label: '😐 Neutral', color: '#f59e0b' },
  { value: 'negative', label: '😟 Negative', color: '#ef4444' },
];

export default function LogInteractionScreen() {
  const dispatch = useDispatch();
  const { form, editingId, loading, success, error } = useSelector(s => s.interactions);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => dispatch(clearMessages()), 3500);
      return () => clearTimeout(t);
    }
  }, [success, error, dispatch]);

  const handleChange = (field, value) => {
    dispatch(updateFormField({ field, value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      date_time: new Date(form.date_time).toISOString(),
      products_discussed: Array.isArray(form.products_discussed)
        ? form.products_discussed
        : form.products_discussed.split(',').map(p => p.trim()).filter(Boolean),
    };

    if (editingId) {
      dispatch(editInteraction({ id: editingId, data: payload }));
    } else {
      dispatch(logInteraction(payload));
    }
  };

  const handleReset = () => {
    dispatch(resetForm());
  };

  return (
    <div className="log-screen">
      {/* Toast notifications */}
      {success && <div className="toast toast-success">✓ {success}</div>}
      {error && <div className="toast toast-error">✗ {String(error)}</div>}

      {/* LEFT: Form */}
      <section className="form-panel">
        <div className="panel-header">
          <h2 className="panel-title">
            {editingId ? `✏️ Edit Interaction #${editingId}` : '+ New Interaction'}
          </h2>
          {editingId && (
            <button className="btn-ghost" onClick={handleReset}>
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="interaction-form">
          {/* HCP Name */}
          <div className="field-group">
            <label className="field-label">HCP Name *</label>
            <input
              className="field-input"
              type="text"
              placeholder="e.g. Dr. Priya Sharma"
              value={form.hcp_name}
              onChange={e => handleChange('hcp_name', e.target.value)}
              required
            />
          </div>

          {/* Interaction Type */}
          <div className="field-group">
            <label className="field-label">Interaction Type *</label>
            <select
              className="field-input field-select"
              value={form.interaction_type}
              onChange={e => handleChange('interaction_type', e.target.value)}
              required
            >
              {INTERACTION_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="field-group">
            <label className="field-label">Date & Time *</label>
            <input
              className="field-input"
              type="datetime-local"
              value={form.date_time}
              onChange={e => handleChange('date_time', e.target.value)}
              required
            />
          </div>

          {/* Products Discussed */}
          <div className="field-group">
            <label className="field-label">Products Discussed</label>
            <input
              className="field-input"
              type="text"
              placeholder="e.g. CardioPlus, OmegaHealth (comma-separated)"
              value={Array.isArray(form.products_discussed)
                ? form.products_discussed.join(', ')
                : form.products_discussed}
              onChange={e => handleChange('products_discussed', e.target.value.split(',').map(p => p.trim()).filter(Boolean))}
            />
          </div>

          {/* Sentiment */}
          <div className="field-group">
            <label className="field-label">Sentiment</label>
            <div className="sentiment-group">
              {SENTIMENTS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  className={`sentiment-btn ${form.sentiment === s.value ? 'selected' : ''}`}
                  style={form.sentiment === s.value ? { borderColor: s.color, color: s.color, background: s.color + '15' } : {}}
                  onClick={() => handleChange('sentiment', s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="field-group">
            <label className="field-label">Notes</label>
            <textarea
              className="field-input field-textarea"
              placeholder="Detailed notes about the interaction..."
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              rows={4}
            />
          </div>

          {/* Follow-up Actions */}
          <div className="field-group">
            <label className="field-label">Follow-up Actions</label>
            <textarea
              className="field-input field-textarea"
              placeholder="Next steps, tasks, or reminders..."
              value={form.follow_up_actions}
              onChange={e => handleChange('follow_up_actions', e.target.value)}
              rows={3}
            />
          </div>

          {/* AI Summary (read-only if filled) */}
          {form.summary && (
            <div className="field-group">
              <label className="field-label">AI Summary</label>
              <div className="ai-summary-box">{form.summary}</div>
            </div>
          )}

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={handleReset}>
              Clear
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '⏳ Saving...' : editingId ? '✏️ Update' : '✦ Log Interaction'}
            </button>
          </div>
        </form>
      </section>

      {/* RIGHT: Chat Assistant */}
      <section className="chat-panel">
        <ChatAssistant />
      </section>
    </div>
  );
}
