import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilter, resetFilters, fetchInteractions } from '../store/interactionsSlice';

const TYPES = ['','In-Person Visit','Phone Call','Email','Conference','Webinar'];
const SENTS = ['','positive','neutral','negative'];

export default function SearchFilter({ onApply }) {
  const dispatch = useDispatch();
  const { filters } = useSelector(s => s.interactions);

  const change = (field, value) => dispatch(setFilter({ field, value }));

  const apply = () => {
    const active = {};
    if (filters.hcp_name)         active.hcp_name         = filters.hcp_name;
    if (filters.interaction_type) active.interaction_type  = filters.interaction_type;
    if (filters.sentiment)        active.sentiment         = filters.sentiment;
    if (filters.date_from)        active.date_from         = filters.date_from;
    if (filters.date_to)          active.date_to           = filters.date_to;
    if (filters.search)           active.search            = filters.search;
    dispatch(fetchInteractions(active));
    onApply?.();
  };

  const reset = () => {
    dispatch(resetFilters());
    dispatch(fetchInteractions());
  };

  const hasActive = Object.values(filters).some(Boolean);

  return (
    <div className="search-filter">
      <div className="sf-row">
        <div className="sf-field">
          <label className="field-label">🔍 Search</label>
          <input
            className="field-input sf-input"
            placeholder="Search notes, summary…"
            value={filters.search}
            onChange={e => change('search', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && apply()}
          />
        </div>

        <div className="sf-field">
          <label className="field-label">👤 HCP Name</label>
          <input
            className="field-input sf-input"
            placeholder="e.g. Dr. Sharma"
            value={filters.hcp_name}
            onChange={e => change('hcp_name', e.target.value)}
          />
        </div>

        <div className="sf-field">
          <label className="field-label">Type</label>
          <select className="field-input field-select sf-input"
            value={filters.interaction_type}
            onChange={e => change('interaction_type', e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
          </select>
        </div>

        <div className="sf-field">
          <label className="field-label">Sentiment</label>
          <select className="field-input field-select sf-input"
            value={filters.sentiment}
            onChange={e => change('sentiment', e.target.value)}>
            {SENTS.map(s => <option key={s} value={s}>{s || 'All Sentiments'}</option>)}
          </select>
        </div>

        <div className="sf-field">
          <label className="field-label">From</label>
          <input type="date" className="field-input sf-input"
            value={filters.date_from}
            onChange={e => change('date_from', e.target.value)} />
        </div>

        <div className="sf-field">
          <label className="field-label">To</label>
          <input type="date" className="field-input sf-input"
            value={filters.date_to}
            onChange={e => change('date_to', e.target.value)} />
        </div>
      </div>

      <div className="sf-actions">
        <button className="btn-primary sf-btn" onClick={apply}>Apply Filters</button>
        {hasActive && (
          <button className="btn-outline sf-btn" onClick={reset}>Clear Filters</button>
        )}
        {hasActive && (
          <span className="sf-active-hint">
            {Object.values(filters).filter(Boolean).length} filter(s) active
          </span>
        )}
      </div>
    </div>
  );
}
