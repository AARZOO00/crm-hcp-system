import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setReminder } from '../store/interactionsSlice';

export default function ReminderModal({ interaction, onClose }) {
  const dispatch = useDispatch();
  const [date, setDate]   = useState('');
  const [note, setNote]   = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!date) return;
    setSaving(true);
    await dispatch(setReminder({
      interaction_id: interaction.id,
      reminder_date: new Date(date).toISOString(),
      reminder_note: note,
    }));
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🔔 Set Reminder</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="modal-sub">For: <strong>{interaction.hcp_name}</strong></p>
          <div className="field-group">
            <label className="field-label">Reminder Date & Time *</label>
            <input type="datetime-local" className="field-input"
              value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="field-group" style={{ marginTop: 14 }}>
            <label className="field-label">Note</label>
            <textarea className="field-input field-textarea" rows={3}
              placeholder="What should you follow up on?"
              value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={!date || saving}>
            {saving ? '⏳ Saving…' : '🔔 Set Reminder'}
          </button>
        </div>
      </div>
    </div>
  );
}
