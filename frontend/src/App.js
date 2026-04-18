import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInteractions, fetchDashboard, fetchPendingReminders } from './store/interactionsSlice';
import LogInteractionScreen from './components/LogInteractionScreen';
import InteractionsList from './components/InteractionsList';
import Dashboard from './components/Dashboard';
import Timeline from './components/Timeline';
import './App.css';

const NAV = [
  { id: 'dashboard', icon: '◉', label: 'Dashboard' },
  { id: 'log',       icon: '✦', label: 'Log Interaction' },
  { id: 'history',   icon: '◈', label: 'History' },
  { id: 'timeline',  icon: '⟳', label: 'Timeline' },
];

function AppContent() {
  const dispatch = useDispatch();
  const [tab, setTab] = React.useState('dashboard');
  const { reminders } = useSelector(s => s.interactions);

  useEffect(() => {
    dispatch(fetchInteractions());
    dispatch(fetchDashboard());
    dispatch(fetchPendingReminders());
  }, [dispatch]);

  const titles = {
    dashboard: 'Dashboard',
    log:       'Log HCP Interaction',
    history:   'Interaction History',
    timeline:  'Interaction Timeline',
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">⚕</span>
          <span className="logo-text">PharmaSync</span>
          <span className="logo-badge">CRM</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button key={n.id}
              className={`nav-item ${tab === n.id ? 'active' : ''}`}
              onClick={() => setTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
              {n.id === 'dashboard' && reminders.length > 0 && (
                <span className="nav-badge">{reminders.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-avatar">MR</div>
            <div className="user-info">
              <div className="user-name">Med Rep</div>
              <div className="user-role">Field Agent</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">{titles[tab]}</div>
          <div className="header-right">
            <span className="ai-badge">🤖 AI-Powered</span>
          </div>
        </header>

        <div className="content-body">
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'log'       && <LogInteractionScreen />}
          {tab === 'history'   && <InteractionsList />}
          {tab === 'timeline'  && <Timeline />}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
