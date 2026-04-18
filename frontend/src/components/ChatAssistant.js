import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { processWithAI, addChatMessage } from '../store/interactionsSlice';

const QUICK_PROMPTS = [
  "Met Dr. Sharma, discussed CardioPlus, very interested",
  "Phone call with Dr. Patel about OmegaHealth, neutral response",
  "Suggest follow-up actions for this interaction",
  "Fetch history for Dr. Sharma",
];

function TypingIndicator() {
  return (
    <div className="chat-bubble assistant typing">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`chat-row ${isUser ? 'user-row' : 'assistant-row'}`}>
      {!isUser && <div className="avatar-bot">AI</div>}
      <div className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}>
        <p className="bubble-text">{msg.content}</p>
        {msg.data && !msg.data.error && (
          <div className="ai-result-card">
            {msg.data.hcp_name && (
              <div className="result-row">
                <span className="result-label">👤 HCP</span>
                <span className="result-value">{msg.data.hcp_name}</span>
              </div>
            )}
            {msg.data.sentiment && (
              <div className="result-row">
                <span className="result-label">💡 Sentiment</span>
                <span className={`result-value sentiment-tag sentiment-${msg.data.sentiment}`}>
                  {msg.data.sentiment}
                </span>
              </div>
            )}
            {msg.data.products_discussed?.length > 0 && (
              <div className="result-row">
                <span className="result-label">💊 Products</span>
                <span className="result-value">{msg.data.products_discussed.join(', ')}</span>
              </div>
            )}
            {msg.data.suggested_follow_ups?.length > 0 && (
              <div className="suggested-list">
                <div className="result-label" style={{ marginBottom: '6px' }}>📋 Suggested Follow-ups</div>
                {msg.data.suggested_follow_ups.map((f, i) => (
                  <div key={i} className="suggested-item">▸ {f}</div>
                ))}
              </div>
            )}
            {msg.data.history?.length > 0 && (
              <div className="suggested-list">
                <div className="result-label" style={{ marginBottom: '6px' }}>🗂 Past Interactions ({msg.data.total_interactions})</div>
                {msg.data.history.slice(0, 3).map((h, i) => (
                  <div key={i} className="suggested-item">▸ {h.interaction_type} — {h.sentiment}</div>
                ))}
              </div>
            )}
            {msg.data.form_autofilled && (
              <div className="autofill-badge">✓ Form auto-filled</div>
            )}
          </div>
        )}
        <span className="bubble-time">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {isUser && <div className="avatar-user">ME</div>}
    </div>
  );
}

export default function ChatAssistant() {
  const dispatch = useDispatch();
  const { chatMessages, aiLoading, editingId } = useSelector(s => s.interactions);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, aiLoading]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    dispatch(addChatMessage(userMsg));
    setInput('');
    dispatch(processWithAI({ text, interaction_id: editingId }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const welcomeMessage = {
    role: 'assistant',
    content: "Hi! I'm your AI CRM assistant. Tell me about your HCP interaction in natural language and I'll extract the details and auto-fill the form for you.",
    timestamp: new Date().toISOString(),
  };

  const allMessages = chatMessages.length === 0
    ? [welcomeMessage, ...chatMessages]
    : chatMessages;

  return (
    <div className="chat-assistant">
      <div className="chat-header">
        <div className="chat-title-area">
          <div className="ai-orb" />
          <div>
            <div className="chat-title">AI Assistant</div>
            <div className="chat-subtitle">Natural Language → Form</div>
          </div>
        </div>
        <div className="ai-status">
          <span className="status-dot" />
          Active
        </div>
      </div>

      {/* Capability tags */}
      <div className="capability-tags">
        <span className="cap-tag">📝 Log</span>
        <span className="cap-tag">✂️ Summarize</span>
        <span className="cap-tag">🎯 Follow-up</span>
        <span className="cap-tag">🗂 History</span>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {allMessages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {aiLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {chatMessages.length === 0 && (
        <div className="quick-prompts">
          <div className="quick-label">Try saying:</div>
          {QUICK_PROMPTS.map((p, i) => (
            <button
              key={i}
              className="quick-btn"
              onClick={() => sendMessage(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          placeholder="Describe your HCP interaction..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={aiLoading}
        />
        <button
          className="send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || aiLoading}
        >
          {aiLoading ? '⏳' : '↑'}
        </button>
      </div>
      <div className="input-hint">Press Enter to send · Shift+Enter for new line</div>
    </div>
  );
}
