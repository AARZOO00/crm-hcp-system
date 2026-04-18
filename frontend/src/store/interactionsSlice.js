import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchInteractions = createAsyncThunk(
  'interactions/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await axios.get(`${API}/interactions?${params}`);
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data || 'Fetch failed'); }
  }
);

export const fetchDashboard = createAsyncThunk(
  'interactions/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${API}/dashboard`);
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data || 'Dashboard failed'); }
  }
);

export const fetchTimeline = createAsyncThunk(
  'interactions/fetchTimeline',
  async (hcp_name = '', { rejectWithValue }) => {
    try {
      const url = hcp_name ? `${API}/timeline?hcp_name=${hcp_name}` : `${API}/timeline`;
      const res = await axios.get(url);
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data || 'Timeline failed'); }
  }
);

export const fetchPendingReminders = createAsyncThunk(
  'interactions/fetchReminders',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${API}/reminders/pending`);
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data || 'Reminders failed'); }
  }
);

export const logInteraction = createAsyncThunk(
  'interactions/log',
  async (data, { rejectWithValue }) => {
    try {
      const payload = {
        hcp_name: data.hcp_name || "Dr Unknown",
        interaction_type: data.interaction_type || "In-Person Visit",
        date_time: new Date().toISOString(),  // 🔥 important
        notes: data.notes || "General discussion",
        follow_up_actions: data.follow_up_actions || "",
        sentiment: data.sentiment || "neutral",
        sentiment_score: data.sentiment_score || 0,
        products_discussed: data.products_discussed || [],
        summary: data.summary || "",
        key_points: data.key_points || [],
        suggested_follow_ups: data.suggested_follow_ups || []
      };

      console.log("SENDING:", payload); // 👈 debug

      const res = await axios.post(`${API}/log-interaction`, payload);
      return res.data;
    } catch (e) {
      console.log("ERROR:", e.response?.data); // 👈 debug
      return rejectWithValue(e.response?.data || 'Log failed');
    }
  }
);

export const editInteraction = createAsyncThunk(
  'interactions/edit',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${API}/edit-interaction/${id}`, data);
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data || 'Edit failed'); }
  }
);

export const setReminder = createAsyncThunk(
  'interactions/setReminder',
  async ({ interaction_id, reminder_date, reminder_note }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API}/reminders`, { interaction_id, reminder_date, reminder_note });
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data || 'Reminder failed'); }
  }
);

export const processWithAI = createAsyncThunk(
  'interactions/aiProcess',
  async ({ text, interaction_id }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API}/ai-process`, { text, interaction_id });
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data || 'AI failed'); }
  }
);

// ── Initial state ─────────────────────────────────────────────────────────────

const blankForm = {
  hcp_name: '', interaction_type: 'In-Person Visit',
  date_time: new Date().toISOString().slice(0, 16),
  notes: '', follow_up_actions: '', sentiment: 'neutral', sentiment_score: 0,
  products_discussed: [], summary: '', raw_text: '',
  key_points: [], suggested_follow_ups: [],
  reminder_date: '', reminder_note: '',
};

const initialState = {
  list:            [],
  timeline:        [],
  dashboard:       null,
  reminders:       [],
  form:            blankForm,
  filters:         { hcp_name: '', interaction_type: '', sentiment: '', date_from: '', date_to: '', search: '' },
  editingId:       null,
  loading:         false,
  dashboardLoading: false,
  aiLoading:       false,
  error:           null,
  success:         null,
  chatMessages:    [],
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const slice = createSlice({
  name: 'interactions',
  initialState,
  reducers: {
    updateFormField:   (state, { payload: { field, value } }) => { state.form[field] = value; },
    setForm:           (state, { payload }) => { state.form = { ...state.form, ...payload }; },
    resetForm:         (state) => { state.form = blankForm; state.editingId = null; },
    setEditingId:      (state, { payload }) => { state.editingId = payload; },
    setFilter:         (state, { payload: { field, value } }) => { state.filters[field] = value; },
    resetFilters:      (state) => { state.filters = initialState.filters; },
    addChatMessage:    (state, { payload }) => { state.chatMessages.push(payload); },
    clearChatMessages: (state) => { state.chatMessages = []; },
    clearMessages:     (state) => { state.success = null; state.error = null; },
  },
  extraReducers: (builder) => {
    const pending  = (k) => (s) => { s[k] = true; };
    const rejected = (k) => (s, { payload }) => { s[k] = false; s.error = String(payload); };

    builder
      // fetch list
      .addCase(fetchInteractions.pending,  pending('loading'))
      .addCase(fetchInteractions.rejected, rejected('loading'))
      .addCase(fetchInteractions.fulfilled, (s, { payload }) => { s.loading = false; s.list = payload; })

      // dashboard
      .addCase(fetchDashboard.pending,   (s) => { s.dashboardLoading = true; })
      .addCase(fetchDashboard.rejected,  (s) => { s.dashboardLoading = false; })
      .addCase(fetchDashboard.fulfilled, (s, { payload }) => { s.dashboardLoading = false; s.dashboard = payload; })

      // timeline
      .addCase(fetchTimeline.fulfilled, (s, { payload }) => { s.timeline = payload; })

      // reminders
      .addCase(fetchPendingReminders.fulfilled, (s, { payload }) => { s.reminders = payload; })

      // log
      .addCase(logInteraction.pending,  pending('loading'))
      .addCase(logInteraction.rejected, rejected('loading'))
      .addCase(logInteraction.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.list.unshift(payload);
        s.success = `✓ Interaction logged for ${payload.hcp_name}`;
        s.form = blankForm; s.editingId = null;
      })

      // edit
      .addCase(editInteraction.pending,  pending('loading'))
      .addCase(editInteraction.rejected, rejected('loading'))
      .addCase(editInteraction.fulfilled, (s, { payload }) => {
        s.loading = false;
        const idx = s.list.findIndex(i => i.id === payload.id);
        if (idx !== -1) s.list[idx] = payload;
        s.success = `✓ Interaction #${payload.id} updated`;
        s.form = blankForm; s.editingId = null;
      })

      // reminder
      .addCase(setReminder.fulfilled, (s) => { s.success = '🔔 Reminder set successfully'; })

      // AI
      .addCase(processWithAI.pending, (s) => { s.aiLoading = true; })
      .addCase(processWithAI.rejected, (s) => {
        s.aiLoading = false;
        s.chatMessages.push({ role: 'assistant', content: '❌ AI processing failed. Please try again.', timestamp: new Date().toISOString() });
      })
      .addCase(processWithAI.fulfilled, (s, { payload: ai }) => {
        s.aiLoading = false;
        // Auto-fill form
        const fields = ['hcp_name','interaction_type','date_time','notes','follow_up_actions',
                        'sentiment','sentiment_score','products_discussed','summary',
                        'key_points','suggested_follow_ups'];
        fields.forEach(f => { if (ai[f] !== undefined && ai[f] !== null) s.form[f] = ai[f]; });
        // Store in chat
        s.chatMessages.push({
          role: 'assistant',
          content: ai.message || 'Processed your interaction.',
          data: ai,
          timestamp: new Date().toISOString(),
        });
      });
  },
});

export const {
  updateFormField, setForm, resetForm, setEditingId,
  setFilter, resetFilters,
  addChatMessage, clearChatMessages, clearMessages,
} = slice.actions;

export default slice.reducer;
